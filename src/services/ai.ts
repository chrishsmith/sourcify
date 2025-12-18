import OpenAI from 'openai';
import type { ClassificationInput, ClassificationResult, HTSCode, DutyRate, RulingReference } from '@/types/classification.types';

// Lazy initialization to avoid module-level errors
function getXAIClient() {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        throw new Error('XAI_API_KEY environment variable is not set. Please add it to .env.local');
    }
    return new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
    });
}

const HTS_CLASSIFICATION_PROMPT = `You are an expert U.S. Customs and Border Protection (CBP) classification specialist with deep knowledge of the Harmonized Tariff Schedule of the United States (HTSUS).

Analyze the following product and provide an accurate HTS classification.

PRODUCT DETAILS:
- Description: {description}
- Country of Origin: {countryOfOrigin}
- Material Composition: {materialComposition}
- Intended Use: {intendedUse}

Respond with a JSON object in this exact format:
{
    "htsCode": {
        "code": "XXXX.XX.XXXX",
        "description": "Official HTS description",
        "chapter": "XX",
        "heading": "XXXX",
        "subheading": "XXXX.XX"
    },
    "confidence": 85,
    "dutyRate": {
        "generalRate": "X.X%" or "Free",
        "specialPrograms": [
            {"program": "USMCA", "rate": "Free"},
            {"program": "GSP", "rate": "Free"}
        ],
        "column2Rate": "XX%"
    },
    "rulings": [
        {
            "rulingNumber": "NY NXXXXXX",
            "date": "YYYY-MM-DD",
            "summary": "Brief summary of similar ruling",
            "relevanceScore": 90
        }
    ],
    "alternativeCodes": [
        {
            "code": "XXXX.XX.XXXX",
            "description": "Alternative classification",
            "chapter": "XX",
            "heading": "XXXX",
            "subheading": "XXXX.XX"
        }
    ],
    "rationale": "Detailed explanation of why this classification was chosen, citing General Rules of Interpretation (GRI) where applicable.",
    "warnings": ["Any compliance warnings or notes"]
}

Be precise. Use real HTS codes from the current HTSUS. If unsure, indicate lower confidence and provide alternatives.`;

export async function classifyProduct(input: ClassificationInput): Promise<ClassificationResult> {
    const xai = getXAIClient();

    const prompt = HTS_CLASSIFICATION_PROMPT
        .replace('{description}', input.productDescription)
        .replace('{countryOfOrigin}', input.countryOfOrigin || 'Not specified')
        .replace('{materialComposition}', input.materialComposition || 'Not specified')
        .replace('{intendedUse}', input.intendedUse || 'Not specified');

    try {
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a U.S. Customs classification expert. Always respond with valid JSON only, no markdown or commentary.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1, // Low temperature for consistency
        });

        const responseText = completion.choices[0]?.message?.content || '';

        // Parse JSON response
        const parsed = JSON.parse(responseText);

        const result: ClassificationResult = {
            id: crypto.randomUUID(),
            input,
            htsCode: parsed.htsCode as HTSCode,
            confidence: parsed.confidence as number,
            dutyRate: parsed.dutyRate as DutyRate,
            rulings: (parsed.rulings || []) as RulingReference[],
            alternativeCodes: parsed.alternativeCodes as HTSCode[],
            rationale: parsed.rationale as string,
            warnings: parsed.warnings as string[],
            createdAt: new Date(),
        };

        return result;
    } catch (error: unknown) {
        // Log the full error details
        if (error instanceof Error) {
            console.error('[Grok API] Error name:', error.name);
            console.error('[Grok API] Error message:', error.message);
            console.error('[Grok API] Full error:', JSON.stringify(error, null, 2));
        } else {
            console.error('[Grok API] Unknown error:', error);
        }
        throw new Error(`Grok API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Mock function for testing without API
export function getMockClassificationResult(input: ClassificationInput): ClassificationResult {
    return {
        id: crypto.randomUUID(),
        input,
        htsCode: {
            code: '8471.30.0100',
            description: 'Portable automatic data processing machines, weighing not more than 10 kg',
            chapter: '84',
            heading: '8471',
            subheading: '8471.30',
        },
        confidence: 94,
        dutyRate: {
            generalRate: 'Free',
            specialPrograms: [
                { program: 'USMCA', rate: 'Free' },
                { program: 'GSP', rate: 'Free' },
            ],
            column2Rate: '35%',
        },
        rulings: [
            {
                rulingNumber: 'NY N301234',
                date: '2023-06-15',
                summary: 'Laptop computers with integrated display classified under 8471.30',
                relevanceScore: 95,
            },
            {
                rulingNumber: 'HQ H298765',
                date: '2022-11-20',
                summary: 'Portable computing devices with detachable keyboard',
                relevanceScore: 82,
            },
        ],
        alternativeCodes: [
            {
                code: '8471.41.0150',
                description: 'Other automatic data processing machines comprising a CPU and input/output device',
                chapter: '84',
                heading: '8471',
                subheading: '8471.41',
            },
        ],
        rationale: 'Based on GRI 1 and GRI 6, this product is classified as a portable automatic data processing machine under heading 8471. The weight under 10kg and integrated display qualify it for subheading 8471.30. The classification follows established rulings for similar laptop computers.',
        warnings: [
            'Verify country of origin documentation for preferential duty treatment under USMCA.',
        ],
        createdAt: new Date(),
    };
}

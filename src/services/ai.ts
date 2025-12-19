
import OpenAI from 'openai';
import { getXAIClient } from '@/lib/xai';
import { ClassificationInput, ClassificationResult, USITCCandidate } from '@/types/classification.types';
import { searchHTSCodes } from '@/services/usitc';
import type { HTSCode, DutyRate, RulingReference } from '@/types/classification.types';



const HTS_CLASSIFICATION_PROMPT = `You are an expert U.S.Customs and Border Protection(CBP) classification specialist with deep knowledge of the Harmonized Tariff Schedule of the United States(HTSUS).

Analyze the following product and provide an accurate HTS classification.

PRODUCT DETAILS:
- Description: { description }
- Country of Origin: { countryOfOrigin }
- Material Composition: { materialComposition }
- Intended Use: { intendedUse }

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
                { "program": "USMCA", "rate": "Free" },
                { "program": "GSP", "rate": "Free" }
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

Be precise.Use real HTS codes from the current HTSUS.If unsure, indicate lower confidence and provide alternatives.`;

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
        throw new Error(`Grok API failed: ${error instanceof Error ? error.message : 'Unknown error'} `);
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



// ═══════════════════════════════════════════════════════════════════════════
// USITC-FIRST CLASSIFICATION APPROACH
// ═══════════════════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════════════════
// SEARCH TERM GENERATION (The "Interpreter")
// ═══════════════════════════════════════════════════════════════════════════

const SEARCH_TERM_PROMPT = `You are a U.S.Customs Broker expert.
    TASK: Extract the best 2 - 3 keyword combinations to search the USITC HTS database.

PRODUCT CONTEXT:
- Name: { name }
- Description: { description }
- Material: { material }
- Intended Use: { use }

RULES:
1. Identify the "Essential Character" / Noun(e.g. "Shoe", "Engine", "Case").
2. ** Contextual Material:** If a material is provided, include it in the 'specific' search terms to refine results(e.g. "Plastic Case"), but ensure the 'Essential Character' remains the focus.
3. Avoid synonyms that are confusing.Use official HTS terminology where possible.



    OUTPUT FORMAT:
    Respond with a valid JSON object. Do not include markdown formatting or explanations.
    Example:
    {
        "specific": "cotton t-shirt printed",
        "broad": "apparel clothing"
    }
`;

export async function generateSearchTerms(
    description: string,
    material?: string,
    name?: string,
    use?: string
): Promise<{ specific: string; broad: string }> {
    const xai = getXAIClient();
    const prompt = SEARCH_TERM_PROMPT
        .replace('{description}', description)
        .replace('{material}', material || 'Not specified')
        .replace('{name}', name || 'Not specified')
        .replace('{use}', use || 'Not specified');

    try {
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(responseText);
        return {
            specific: parsed.specific || description,
            broad: parsed.broad || description.split(' ').slice(0, 2).join(' ')
        };
    } catch (error) {
        console.error('[AI] Failed to generate search terms:', error);
        // Fallback to simple extraction
        return {
            specific: description.split(' ').slice(0, 3).join(' '),
            broad: description.split(' ').slice(0, 2).join(' ')
        };
    }
}


const HTS_ELIMINATION_PROMPT = `You are a senior U.S. Customs classification expert applying the General Rules of Interpretation (GRI) in strict order.

PRODUCT:
Description: "{description}"
Material: "{materialComposition}"
Intended Use: "{intendedUse}"

CANDIDATES (with hierarchy):
{candidates}

TASK: Select exactly ONE best 10-digit HTS code using GRI 1–6.

REQUIRED REASONING STEPS (you MUST follow this structure):
1. Determine the principal function or essential character of the article (GRI 1).
2. Identify possible chapters using Section/Chapter Notes.
3. Eliminate any candidate from an incorrect chapter — state why.
4. Within the correct chapter, apply heading and subheading notes.
5. Eliminate any candidate whose description explicitly contradicts the product (e.g., material, form, use).
6. If multiple remain, choose the most specific (GRI 3(a)).
7. If still tied, choose "Other" only after confirming no specific subheading applies.

OUTPUT STRICT JSON ONLY:
{
  "selectedCode": "XXXX.XX.XXXX",
  "confidence": 92,
  "rationale": "Step-by-step reasoning following above structure...",
  "rejectedCodes": [
    {"code": "XXXX.XX.XXXX", "reason": "Chapter XX is for [X]..."},
    ...
  ],
  "warnings": [...]
}
`;

/**
 * USITC-First Classification
 * Searches USITC first to get real codes, then AI selects the best match
 */
export async function classifyWithUSITCCandidates(
    input: ClassificationInput,
    usitcCandidates: USITCCandidate[]
): Promise<ClassificationResult> {
    const xai = getXAIClient();

    // Group candidates by Chapter -> Heading for Hierarchical Context
    const grouped = usitcCandidates.slice(0, 25).reduce((acc, c) => {
        const chapter = c.htsno.substring(0, 2);
        const heading = c.htsno.substring(0, 4);
        if (!acc[chapter]) acc[chapter] = {};
        if (!acc[chapter][heading]) acc[chapter][heading] = [];
        acc[chapter][heading].push(c);
        return acc;
    }, {} as Record<string, Record<string, USITCCandidate[]>>);

    let candidatesText = '';
    Object.entries(grouped).forEach(([chapter, headings]) => {
        candidatesText += `Chapter ${chapter}:\n`;
        Object.entries(headings).forEach(([heading, codes]) => {
            // Use the first code's description as a proxy for the heading description if not available
            const headingDesc = codes[0].description.split(';')[0];
            candidatesText += `  Heading ${heading} - ${headingDesc}\n`;
            codes.forEach((c) => {
                candidatesText += `    - ${c.htsno} : ${c.description} (Duty: ${c.general})\n`;
            });
        });
        candidatesText += '\n';
    });

    const prompt = HTS_ELIMINATION_PROMPT
        .replace('{description}', input.productDescription)
        .replace('{countryOfOrigin}', input.countryOfOrigin || 'Not specified')
        .replace('{materialComposition}', input.materialComposition || 'Not specified')
        .replace('{intendedUse}', input.intendedUse || 'Not specified')
        .replace('{candidates}', candidatesText);

    try {
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a U.S. Customs classification expert. Select the best HTS code from the provided candidates. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        console.log('[AI Selection] Response:', responseText.substring(0, 200));

        // Parse JSON response
        const parsed = JSON.parse(responseText);
        const selectedCode = parsed.selectedCode;

        // Find the selected candidate
        let selectedCandidate = usitcCandidates.find(c =>
            c.htsno === selectedCode ||
            c.htsno.replace(/\./g, '') === selectedCode.replace(/\./g, '')
        );

        let rescueUsed = false;

        // RESCUE FETCH: If AI picked a code not in the list
        if (!selectedCandidate && selectedCode && selectedCode.length >= 4) {
            console.log(`[AI Selection] Code ${selectedCode} not in candidates. Attempting Rescue Fetch...`);
            try {
                const rescueResults = await searchHTSCodes(selectedCode);
                if (rescueResults && rescueResults.length > 0) {
                    // Check for exact match or specific 10-digit match
                    selectedCandidate = rescueResults.find(c =>
                        c.htsno.replace(/\./g, '') === selectedCode.replace(/\./g, '')
                    ) || rescueResults[0];

                    if (selectedCandidate) {
                        console.log('[AI Selection] Rescue match found:', selectedCandidate.htsno);
                        rescueUsed = true;
                    }
                }
            } catch (e) {
                console.warn('[AI Selection] Rescue logic failed:', e);
            }
        }

        // CONFIDENCE CALIBRATION
        // Start with AI confidence, then adjust based on reality
        let calibratedConfidence = 90; // Base high confidence

        if (rescueUsed) {
            calibratedConfidence -= 20; // Penalize for needing rescue
        } else if (selectedCandidate) {
            // Bonus if the code was in the original top 5
            const originalIndex = usitcCandidates.findIndex(c => c.htsno === selectedCandidate?.htsno);
            if (originalIndex !== -1 && originalIndex < 5) {
                calibratedConfidence += 5;
            }
        } else {
            calibratedConfidence = 40; // Fallback scenario
        }

        // Material Bonus
        if (input.materialComposition && selectedCandidate &&
            selectedCandidate.description.toLowerCase().includes(input.materialComposition.toLowerCase())) {
            calibratedConfidence += 5;
        }

        // Cap confidence at 99
        calibratedConfidence = Math.min(calibratedConfidence, 99);


        if (!selectedCandidate) {
            // Final Fallback: First valid candidate from Chapter match logic or index 0
            if (selectedCode && selectedCode.length >= 2) {
                const targetChapter = selectedCode.substring(0, 2);
                selectedCandidate = usitcCandidates.find(c => c.htsno.startsWith(targetChapter));
            }
            if (!selectedCandidate) selectedCandidate = usitcCandidates[0];

            return buildResult(input, selectedCandidate, 40, 'Fallback - AI choice invalid.', [], ['⚠️ Classification uncertain. Please verify.']);
        }

        return buildResult(
            input,
            selectedCandidate,
            calibratedConfidence,
            parsed.rationale || 'Selected based on GRI analysis.',
            parsed.alternativeCodes || [], // We can't map these easily if they are strings, but ignoring for now
            parsed.warnings || []
        );

    } catch (error: unknown) {
        console.error('[AI Selection] Error:', error);
        if (usitcCandidates.length > 0) {
            return buildResult(input, usitcCandidates[0], 50, 'Fallback - AI selection failed', [], ['⚠️ AI classification failed. Using best match.']);
        }
        throw new Error('Classification failed: No candidates available.');
    }
}

function buildResult(
    input: ClassificationInput,
    candidate: USITCCandidate,
    confidence: number,
    rationale: string,
    alternativeCodes: HTSCode[],
    warnings: string[]
): ClassificationResult {
    return {
        id: crypto.randomUUID(),
        input,
        htsCode: {
            code: candidate.htsno,
            description: candidate.description,
            chapter: candidate.htsno.substring(0, 2),
            heading: candidate.htsno.substring(0, 4),
            subheading: candidate.htsno.substring(0, 7),
        },
        confidence,
        dutyRate: {
            generalRate: candidate.general || 'See USITC',
            specialPrograms: parseSpecialProgramsFromUSITC(candidate.special),
            column2Rate: candidate.other,
        },
        rulings: [],
        alternativeCodes,
        rationale,
        warnings: ['✓ HTS code verified against official USITC database', ...warnings],
        createdAt: new Date(),
    };
}

function parseSpecialProgramsFromUSITC(special: string): { program: string; rate: string }[] {
    if (!special || special === 'No change') return [];
    const programs: { program: string; rate: string }[] = [];
    const programMap: Record<string, string> = {
        'A': 'GSP', 'A+': 'GSP', 'AU': 'Australia FTA', 'BH': 'Bahrain FTA',
        'CA': 'USMCA (Canada)', 'MX': 'USMCA (Mexico)', 'CL': 'Chile FTA',
        'CO': 'Colombia TPA', 'IL': 'Israel FTA', 'JO': 'Jordan FTA',
        'KR': 'Korea FTA', 'MA': 'Morocco FTA', 'OM': 'Oman FTA',
        'PA': 'Panama TPA', 'PE': 'Peru TPA', 'SG': 'Singapore FTA',
    };
    const match = special.match(/(Free|\d+(?:\.\d+)?%?)\s*\(([^)]+)\)/);
    if (match) {
        const rate = match[1];
        match[2].split(',').forEach(code => {
            const trimmed = code.trim();
            programs.push({ program: programMap[trimmed] || trimmed, rate });
        });
    }
    return programs.slice(0, 5);
}

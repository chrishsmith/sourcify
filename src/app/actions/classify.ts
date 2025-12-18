'use server';

import { classifyProduct, getMockClassificationResult } from '@/services/ai';
import { validateHTSCode, searchHTSCodes, type HTSSearchResult } from '@/services/usitc';
import type { ClassificationInput, ClassificationResult } from '@/types/classification.types';

export async function classifyProductAction(input: ClassificationInput): Promise<ClassificationResult> {
    // Validate input
    if (!input.productDescription || input.productDescription.trim().length < 10) {
        throw new Error('Product description must be at least 10 characters.');
    }

    // Check if API key is available
    const apiKey = process.env.XAI_API_KEY;
    const hasApiKey = !!apiKey;

    console.log('[Classification] API Key present:', hasApiKey);
    console.log('[Classification] API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');

    let result: ClassificationResult;

    if (!hasApiKey) {
        console.warn('[Classification] XAI_API_KEY not found, using mock classification.');
        result = getMockClassificationResult(input);
    } else {
        try {
            console.log('[Classification] Calling Grok API...');
            result = await classifyProduct(input);
            console.log('[Classification] Grok API success! HTS:', result.htsCode.code);
        } catch (error) {
            console.error('[Classification] Grok API error:', error);
            // Fall back to mock on error rather than throwing
            console.warn('[Classification] Falling back to mock data due to API error');
            result = getMockClassificationResult(input);
            result.warnings = result.warnings || [];
            result.warnings.unshift('⚠️ AI classification failed - showing example result. Check API key.');
        }
    }

    // STEP 2: Validate AI result with USITC official database
    try {
        const validation = await validateHTSCode(result.htsCode.code);

        if (validation.isValid && validation.officialData) {
            // Enrich with official USITC data
            result.htsCode.description = validation.officialData.description || result.htsCode.description;

            // Override with REAL duty rates from USITC
            result.dutyRate = {
                generalRate: validation.officialData.general || result.dutyRate.generalRate,
                specialPrograms: parseSpecialPrograms(validation.officialData.special),
                column2Rate: validation.officialData.other || result.dutyRate.column2Rate,
            };

            // Mark as validated
            result.warnings = result.warnings || [];
            result.warnings.unshift('✓ HTS code validated against official USITC database');
        } else if (validation.suggestedCodes && validation.suggestedCodes.length > 0) {
            // AI code not found - add warning with suggestions
            result.warnings = result.warnings || [];
            result.warnings.unshift(
                `⚠️ AI-suggested code ${result.htsCode.code} not found in USITC database. Review alternatives.`
            );

            // Add USITC suggestions as alternatives
            result.alternativeCodes = [
                ...(result.alternativeCodes || []),
                ...validation.suggestedCodes.slice(0, 3).map(usitcCodeToHTSCode),
            ];
        }
    } catch (validationError) {
        console.warn('USITC validation failed:', validationError);
        result.warnings = result.warnings || [];
        result.warnings.push('Could not validate against USITC database. Verify code manually.');
    }

    return result;
}

/**
 * Parse USITC special programs string into structured format
 * Example input: "Free (A,AU,BH,C,CA,CL,CO,D,E,IL,JO,KR,MA,MX,OM,P,PA,PE,S,SG)"
 */
function parseSpecialPrograms(special: string | undefined): { program: string; rate: string }[] {
    if (!special) return [];

    const programs: { program: string; rate: string }[] = [];

    // Common program abbreviations
    const programMap: Record<string, string> = {
        'A': 'GSP',
        'AU': 'Australia FTA',
        'BH': 'Bahrain FTA',
        'CA': 'USMCA (Canada)',
        'MX': 'USMCA (Mexico)',
        'CL': 'Chile FTA',
        'CO': 'Colombia TPA',
        'IL': 'Israel FTA',
        'JO': 'Jordan FTA',
        'KR': 'Korea FTA',
        'MA': 'Morocco FTA',
        'OM': 'Oman FTA',
        'PA': 'Panama TPA',
        'PE': 'Peru TPA',
        'SG': 'Singapore FTA',
    };

    // Extract rate and program codes
    const match = special.match(/(Free|\d+(?:\.\d+)?%?)\s*\(([^)]+)\)/);
    if (match) {
        const rate = match[1];
        const codes = match[2].split(',').map(c => c.trim());

        codes.forEach(code => {
            const programName = programMap[code] || code;
            programs.push({ program: programName, rate });
        });
    }

    return programs.slice(0, 5); // Limit to top 5
}

/**
 * Convert USITC result to our HTSCode type
 */
function usitcCodeToHTSCode(usitc: HTSSearchResult): {
    code: string;
    description: string;
    chapter: string;
    heading: string;
    subheading: string;
} {
    const code = usitc.htsno;
    const parts = code.split('.');

    return {
        code,
        description: usitc.description,
        chapter: parts[0]?.substring(0, 2) || '',
        heading: parts[0] || '',
        subheading: parts[0] && parts[1] ? `${parts[0]}.${parts[1]}` : '',
    };
}

/**
 * Direct USITC search (for future use in UI autocomplete)
 */
export async function searchHTSCodesAction(query: string): Promise<HTSSearchResult[]> {
    if (query.length < 3) return [];
    return searchHTSCodes(query);
}

// API route for classification - uses proper server context
// Includes effective tariff calculation with all additional duties
import { NextRequest, NextResponse } from 'next/server';
import { classifyProduct, getMockClassificationResult } from '@/services/ai';
import { validateHTSCode } from '@/services/usitc';
import { calculateEffectiveTariff, getCountryDutySummary } from '@/services/additionalDuties';
import type { ClassificationInput, ClassificationResult } from '@/types/classification.types';

export async function POST(request: NextRequest) {
    try {
        const input: ClassificationInput = await request.json();

        // Validate input
        if (!input.productDescription || input.productDescription.trim().length < 10) {
            return NextResponse.json(
                { error: 'Product description must be at least 10 characters.' },
                { status: 400 }
            );
        }

        const apiKey = process.env.XAI_API_KEY;
        console.log('[Classification API] API Key present:', !!apiKey);

        let result: ClassificationResult;

        if (!apiKey) {
            console.warn('[Classification API] No API key, using mock');
            result = getMockClassificationResult(input);
        } else {
            try {
                console.log('[Classification API] Calling Grok...');
                result = await classifyProduct(input);
                console.log('[Classification API] Success! HTS:', result.htsCode.code);
            } catch (error) {
                console.error('[Classification API] Grok error:', error);
                result = getMockClassificationResult(input);
                result.warnings = result.warnings || [];
                result.warnings.unshift('⚠️ AI classification failed - showing example result.');
            }
        }

        // Validate with USITC and get official rates
        let baseMfnRate = result.dutyRate.generalRate;
        try {
            const validation = await validateHTSCode(result.htsCode.code);
            if (validation.isValid && validation.officialData) {
                result.htsCode.description = validation.officialData.description || result.htsCode.description;
                baseMfnRate = validation.officialData.general || baseMfnRate;
                result.dutyRate = {
                    generalRate: baseMfnRate,
                    specialPrograms: parseSpecialPrograms(validation.officialData.special),
                    column2Rate: validation.officialData.other || result.dutyRate.column2Rate,
                };
                result.warnings = result.warnings || [];
                result.warnings.unshift('✓ HTS code validated against official USITC database');
            }
        } catch (e) {
            console.warn('[Classification API] USITC validation failed:', e);
        }

        // Calculate EFFECTIVE tariff with all additional duties
        const countryCode = getCountryCode(input.countryOfOrigin);
        if (countryCode) {
            try {
                console.log('[Classification API] Calculating effective tariff for', countryCode);
                const effectiveTariff = calculateEffectiveTariff(
                    result.htsCode.code,
                    result.htsCode.description,
                    baseMfnRate,
                    countryCode
                );

                // Add effective tariff to result
                result.effectiveTariff = effectiveTariff;

                // Add country duty summary to warnings
                if (effectiveTariff.additionalDuties.length > 0) {
                    result.warnings = result.warnings || [];
                    const additionalTotal = effectiveTariff.additionalDuties.reduce(
                        (sum, d) => sum + (d.rate.numericRate || 0), 0
                    );
                    result.warnings.push(
                        `⚠️ Additional duties from ${input.countryOfOrigin}: +${additionalTotal}% on top of base rate`
                    );
                }

                console.log('[Classification API] Effective rate:', effectiveTariff.totalAdValorem + '%');
            } catch (e) {
                console.warn('[Classification API] Effective tariff calculation failed:', e);
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Classification API] Error:', error);
        return NextResponse.json(
            { error: 'Classification failed. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Convert country name/label to ISO code
 */
function getCountryCode(countryOfOrigin?: string): string | null {
    if (!countryOfOrigin) return null;

    // If it's already a 2-letter code
    if (/^[A-Z]{2}$/.test(countryOfOrigin)) return countryOfOrigin;

    // Map common country names/labels to codes
    const mappings: Record<string, string> = {
        'china': 'CN',
        '🇨🇳 china': 'CN',
        'cn': 'CN',
        'hong kong': 'HK',
        'hk': 'HK',
        'mexico': 'MX',
        '🇲🇽 mexico': 'MX',
        'mx': 'MX',
        'canada': 'CA',
        '🇨🇦 canada': 'CA',
        'ca': 'CA',
        'vietnam': 'VN',
        '🇻🇳 vietnam': 'VN',
        'vn': 'VN',
        'germany': 'DE',
        '🇩🇪 germany': 'DE',
        'de': 'DE',
        'japan': 'JP',
        '🇯🇵 japan': 'JP',
        'jp': 'JP',
        'south korea': 'KR',
        '🇰🇷 south korea': 'KR',
        'kr': 'KR',
        'taiwan': 'TW',
        '🇹🇼 taiwan': 'TW',
        'tw': 'TW',
        'india': 'IN',
        '🇮🇳 india': 'IN',
        'in': 'IN',
        'thailand': 'TH',
        '🇹🇭 thailand': 'TH',
        'th': 'TH',
    };

    return mappings[countryOfOrigin.toLowerCase()] || null;
}

function parseSpecialPrograms(special: string | undefined): { program: string; rate: string }[] {
    if (!special) return [];
    const programs: { program: string; rate: string }[] = [];
    const programMap: Record<string, string> = {
        'A': 'GSP', 'AU': 'Australia FTA', 'BH': 'Bahrain FTA',
        'CA': 'USMCA (Canada)', 'MX': 'USMCA (Mexico)', 'CL': 'Chile FTA',
        'CO': 'Colombia TPA', 'IL': 'Israel FTA', 'JO': 'Jordan FTA',
        'KR': 'Korea FTA', 'MA': 'Morocco FTA', 'OM': 'Oman FTA',
        'PA': 'Panama TPA', 'PE': 'Peru TPA', 'SG': 'Singapore FTA',
    };
    const match = special.match(/(Free|\d+(?:\.\d+)?%?)\s*\(([^)]+)\)/);
    if (match) {
        const rate = match[1];
        match[2].split(',').forEach(code => {
            programs.push({ program: programMap[code.trim()] || code.trim(), rate });
        });
    }
    return programs.slice(0, 5);
}

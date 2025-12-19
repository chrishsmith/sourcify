// API route for classification - uses proper server context
// Includes effective tariff calculation with all additional duties
import { NextRequest, NextResponse } from 'next/server';
import { classifyProduct, getMockClassificationResult } from '@/services/ai';
import { validateHTSCode } from '@/services/usitc';
import { calculateEffectiveTariff, getCountryDutySummary } from '@/services/additionalDuties';
import type { ClassificationInput, ClassificationResult, ConditionalClassification } from '@/types/classification.types';

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

        // Detect conditional classifications (price/weight-dependent HTS codes)
        // This only triggers when the official USITC description contains value/weight language
        const conditionalClassification = detectConditionalClassification(
            result.htsCode.code,
            result.htsCode.description,
            result.dutyRate.generalRate
        );
        if (conditionalClassification) {
            result.conditionalClassifications = [conditionalClassification];
            result.warnings = result.warnings || [];
            result.warnings.push(
                `📊 This classification is ${conditionalClassification.conditionLabel.toLowerCase()}-dependent. Review the HTS description to ensure your product matches.`
            );
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

/**
 * Detect if an HTS code is price/weight-dependent based on the OFFICIAL description
 * 
 * IMPORTANT: This function does NOT make up HTS codes. It only flags codes
 * where the official description indicates the classification depends on value/weight.
 * 
 * Examples of real value-dependent descriptions from HTS:
 * - "Valued not over 30 cents each" (Chapter 64 footwear)
 * - "Valued over $2.50 per pair" (Gloves)
 * - "Weighing not more than 5 kg each" (Machinery parts)
 */

function detectConditionalClassification(
    htsCode: string,
    description: string,
    dutyRate: string
): ConditionalClassification | null {
    // Only trigger if the OFFICIAL description contains value/weight language
    // These patterns must match real language from USITC, not assumed patterns

    const valuePatterns = [
        // Real patterns from HTS descriptions
        /valued (?:not )?over (?:\$?[\d.]+|\w+) (?:cents?|dollars?)/i,
        /valued at (?:not )?(?:more|less) than \$?[\d.]+/i,
        /value (?:not )?(?:over|exceeding|under) \$?[\d.]+/i,
        /per dozen pairs, valued (?:not )?over/i,
    ];

    const weightPatterns = [
        /weighing (?:not )?(?:more|less) than [\d.]+ ?(?:kg|g|lb|oz)/i,
        /weighing (?:over|under) [\d.]+ ?(?:kg|g|lb|oz)/i,
        /weight (?:not )?exceed(?:ing)? [\d.]+ ?(?:kg|g|lb|oz)/i,
    ];

    // Check if any value pattern matches
    for (const pattern of valuePatterns) {
        if (pattern.test(description)) {
            return {
                conditionType: 'price',
                conditionLabel: 'Unit Value',
                conditionUnit: '$',
                conditions: [
                    {
                        rangeLabel: 'As specified in description',
                        minValue: undefined,
                        maxValue: undefined,
                        htsCode: htsCode,
                        description: description,
                        dutyRate: dutyRate,
                    },
                ],
                explanation: `This HTS code's classification depends on the unit value. The description states: "${description}". If your product's value falls outside this range, you may need a different statistical suffix. Consult the full HTS schedule or a customs broker.`,
            };
        }
    }

    // Check if any weight pattern matches
    for (const pattern of weightPatterns) {
        if (pattern.test(description)) {
            return {
                conditionType: 'weight',
                conditionLabel: 'Unit Weight',
                conditionUnit: 'kg',
                conditions: [
                    {
                        rangeLabel: 'As specified in description',
                        minValue: undefined,
                        maxValue: undefined,
                        htsCode: htsCode,
                        description: description,
                        dutyRate: dutyRate,
                    },
                ],
                explanation: `This HTS code's classification depends on unit weight. The description states: "${description}". If your product's weight falls outside this range, you may need a different code.`,
            };
        }
    }

    return null;
}


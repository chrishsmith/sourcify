/**
 * HTS Classification API Route
 * 
 * Uses the v2 Classification Engine with:
 * 1. Product Analysis (understand what it IS)
 * 2. Hierarchical Search (chapter → heading → subheading)
 * 3. GRI-based AI Selection
 * 4. Validation Layer
 * 5. Full Hierarchy Path
 * 6. Value-Dependent Classification Detection
 * 7. Automatic History Saving
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { classifyProduct } from '@/services/classification/engine';
import { getEffectiveTariff, convertToLegacyFormat } from '@/services/tariff/registry';
import { getHTSHierarchy } from '@/services/hts/hierarchy';
import { detectValueDependentCodes } from '@/services/valueClassification';
import { saveSearchToHistory } from '@/services/searchHistory';
import type { ClassificationInput, ClassificationResult } from '@/types/classification.types';
import type { ConditionalClassification } from '@/types/classification.types';

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

        console.log('\n════════════════════════════════════════════════════════════════');
        console.log('[API] New Classification Request');
        console.log('[API] Product:', input.productDescription);
        console.log('[API] Material:', input.materialComposition || 'Not specified');
        console.log('[API] Country:', input.countryOfOrigin || 'Not specified');
        console.log('════════════════════════════════════════════════════════════════\n');

        // Use the new classification engine
        let result: ClassificationResult = await classifyProduct(input);

        // ═══════════════════════════════════════════════════════════════
        // FETCH FULL HTS HIERARCHY
        // This gives us the complete path: Chapter → Heading → Subheading → Code
        // ═══════════════════════════════════════════════════════════════
        console.log('[API] Fetching HTS hierarchy...');
        try {
            const hierarchy = await getHTSHierarchy(result.htsCode.code);
            result.hierarchy = hierarchy;
            result.humanReadablePath = hierarchy.humanReadablePath;
            console.log('[API] Hierarchy:', hierarchy.humanReadablePath);
        } catch (e) {
            console.warn('[API] Failed to fetch hierarchy:', e);
            // Fallback to simple path
            result.humanReadablePath = `Chapter ${result.htsCode.chapter} › Heading ${result.htsCode.heading} › ${result.htsCode.description}`;
        }

        // ═══════════════════════════════════════════════════════════════
        // DETECT VALUE-DEPENDENT CLASSIFICATION
        // If product has multiple codes based on value/weight, return all options
        // ═══════════════════════════════════════════════════════════════
        console.log('[API] Checking for value-dependent classification...');
        try {
            const valueDependent = await detectValueDependentCodes(
                result.htsCode.code,
                result.htsCode.description
            );
            
            if (valueDependent && valueDependent.thresholds.length > 1) {
                result.valueDependentClassification = valueDependent;
                result.warnings = result.warnings || [];
                result.warnings.push(
                    `📊 This product has ${valueDependent.thresholds.length} possible HTS codes based on value. See options below.`
                );
                console.log('[API] Value-dependent codes found:', valueDependent.thresholds.length);
            }
        } catch (e) {
            console.warn('[API] Failed to check value-dependent:', e);
        }

        // Calculate EFFECTIVE tariff using CENTRALIZED TARIFF REGISTRY
        // Single source of truth for all tariff data
        const countryCode = getCountryCode(input.countryOfOrigin);
        if (countryCode) {
            try {
                console.log('[API] Calculating effective tariff for', countryCode, 'from registry');
                
                // Parse base MFN rate
                const baseMfnRate = parseBaseMfnRate(result.dutyRate.generalRate);
                
                // Get tariff from centralized registry
                const registryResult = await getEffectiveTariff(
                    countryCode,
                    result.htsCode.code,
                    { baseMfnRate }
                );

                // Convert to legacy format for UI compatibility
                const effectiveTariff = convertToLegacyFormat(
                    registryResult,
                    result.htsCode.code,
                    result.htsCode.description,
                    countryCode
                );

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

                console.log('[API] Effective rate from registry:', effectiveTariff.totalAdValorem + '%');
            } catch (e) {
                console.warn('[API] Effective tariff calculation failed:', e);
            }
        }

        // Detect conditional classifications (price/weight-dependent HTS codes)
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

        console.log('\n[API] Final Classification:', result.htsCode.code);
        console.log('[API] Confidence:', result.confidence);
        console.log('════════════════════════════════════════════════════════════════\n');

        // ═══════════════════════════════════════════════════════════════
        // SAVE TO SEARCH HISTORY
        // Every search is saved for history and supplier upsell
        // ═══════════════════════════════════════════════════════════════
        try {
            const session = await auth.api.getSession({
                headers: await headers(),
            });

            const searchId = await saveSearchToHistory(
                input,
                result,
                session?.user?.id
            );

            // Add search ID to result so UI can link to it
            result.searchHistoryId = searchId;
            console.log('[API] Saved to history:', searchId);
        } catch (historyError) {
            // Don't fail the classification if history save fails
            console.warn('[API] Failed to save to history:', historyError);
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API] Classification Error:', error);
        return NextResponse.json(
            { error: 'Classification failed. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Parse base MFN rate string to numeric percentage
 */
function parseBaseMfnRate(rateStr: string): number {
    if (!rateStr || rateStr.toLowerCase() === 'free') return 0;
    
    // Match percentage (e.g., "25%" or "7.5%")
    const pctMatch = rateStr.match(/(\d+(?:\.\d+)?)\s*%?/);
    if (pctMatch) {
        return parseFloat(pctMatch[1]);
    }
    
    return 0;
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

/**
 * Detect if an HTS code is price/weight-dependent based on the OFFICIAL description
 */
function detectConditionalClassification(
    htsCode: string,
    description: string,
    dutyRate: string
): ConditionalClassification | null {
    // Only trigger if the OFFICIAL description contains value/weight language
    const valuePatterns = [
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
                explanation: `This HTS code's classification depends on the unit value. The description states: "${description}".`,
            };
        }
    }

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
                explanation: `This HTS code's classification depends on unit weight. The description states: "${description}".`,
            };
        }
    }

    return null;
}

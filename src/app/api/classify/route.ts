// API route for classification - uses proper server context
// USITC-FIRST APPROACH: Search USITC for real codes, then AI selects the best match
import { NextRequest, NextResponse } from 'next/server';
import { classifyWithUSITCCandidates, getMockClassificationResult, generateSearchTerms } from '@/services/ai';
import { searchHTSCodes } from '@/services/usitc';
import { calculateEffectiveTariff } from '@/services/additionalDuties';
import { formatHumanReadablePath } from '@/utils/htsFormatting';
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

        // ═══════════════════════════════════════════════════════════════════
        // MULTI-PATH ELIMINATION FLOW
        // 1. Broad Net: Search USITC for ~20-30 candidates across different headings
        // 2. Elimination: AI rigorously tests each candidate to find the best fit
        // ═══════════════════════════════════════════════════════════════════

        console.log('[Classification API] Starting Multi-Path Elimination Protocol...');

        // Step 1: Broad Net Collection (The "Gatherer")
        // "Understand" the product first.
        let specificKeywords = '';
        let broadKeywords = '';

        if (apiKey) {
            // AI-Derived Search Terms (Intelligent)
            console.log('[Classification API] Generating AI search terms (Deep Understanding)...');
            try {
                const searchTerms = await generateSearchTerms(
                    input.productDescription,
                    input.materialComposition,
                    input.productName,
                    input.intendedUse
                );
                specificKeywords = searchTerms.specific;
                broadKeywords = searchTerms.broad;
            } catch (e) {
                console.warn('[Classification API] AI Search Term generation failed, falling back to regex:', e);
                specificKeywords = extractSearchKeywords(input.productDescription);
                broadKeywords = extractBroaderKeywords(input.productDescription);
            }
        } else {
            // Regex Fallback (Basic)
            specificKeywords = extractSearchKeywords(input.productDescription);
            broadKeywords = extractBroaderKeywords(input.productDescription);
        }

        console.log('[Classification API] Searching with:', { specific: specificKeywords, broad: broadKeywords });

        // Parallel search to cast a wide net
        const [specificResults, broadResults] = await Promise.all([
            searchHTSCodes(specificKeywords),
            searchHTSCodes(broadKeywords)
        ]);

        // Merge and Deduplicate
        let usitcCandidates = [...specificResults, ...broadResults];
        usitcCandidates = usitcCandidates.filter((c, i, arr) =>
            arr.findIndex(x => x.htsno === c.htsno) === i
        );

        console.log('[Classification API] Total candidates found:', usitcCandidates.length);
        if (usitcCandidates.length > 0) {
            console.log('[Classification API] Top 5 Candidates:', usitcCandidates.slice(0, 5).map(c => `${c.htsno}: ${c.description}`));
        }

        // Filter to only include strict 10-digit codes and sort by specificity
        const fullCodes = usitcCandidates
            .filter(c => {
                const cleanCode = c.htsno.replace(/\./g, '');
                return cleanCode.length === 10;
            })
            .filter(c => !c.description.toLowerCase().includes('heading') && !c.description.toLowerCase().includes('subheading'))
            .sort((a, b) => b.description.length - a.description.length); // Prioritize longer (more specific) descriptions

        // Step 2: AI Elimination (The "Fit Test")
        if (!apiKey) {
            result = getMockClassificationResult(input);
        } else if (fullCodes.length === 0) {
            result = getMockClassificationResult(input);
            result.warnings = ['⚠️ No matching USITC codes found. Please refine description.'];
            result.confidence = 30;
        } else {
            try {
                // Pass top 25 candidates to give AI enough variety for elimination
                // The AI will see "Other" codes alongside specific ones and can now reason between them
                result = await classifyWithUSITCCandidates(input, fullCodes.slice(0, 25));

                // Add Human Readable Path
                result.humanReadablePath = formatHumanReadablePath(
                    result.htsCode.code,
                    result.htsCode.description
                );

            } catch (error) {
                console.error('[Classification API] Selection error:', error);

                // Detailed Fallback
                const fallback = fullCodes[0];
                result = {
                    id: crypto.randomUUID(),
                    input,
                    htsCode: {
                        code: fallback.htsno,
                        description: fallback.description,
                        chapter: fallback.htsno.substring(0, 2),
                        heading: fallback.htsno.substring(0, 4),
                        subheading: fallback.htsno.substring(0, 7),
                    },
                    confidence: 50,
                    dutyRate: {
                        generalRate: fallback.general || 'See USITC',
                        specialPrograms: [],
                        column2Rate: fallback.other,
                    },
                    rulings: [],
                    alternativeCodes: [],
                    rationale: 'Fallback selection - AI service unavailable',
                    warnings: ['⚠️ AI selection failed. Using best keyword match.'],
                    createdAt: new Date(),
                    humanReadablePath: formatHumanReadablePath(fallback.htsno, fallback.description)
                };
            }
        }

        // Get base MFN rate for effective tariff calculation
        let baseMfnRate = result.dutyRate.generalRate;

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
 * Extract search keywords from product description
 * Prioritizes the "Object Identity" (What IS it?) over modifiers.
 */
function extractSearchKeywords(description: string): string {
    // Remove punctuation and cleanup
    const clean = description.replace(/[^\w\s]/g, ' ').toLowerCase();
    const words = clean.split(/\s+/).filter(w => w.length > 2);

    // Stop words (expanded) - we want to remove noise
    const stopWords = new Set([
        'for', 'with', 'made', 'and', 'the', 'from', 'this', 'that', 'used', 'in', 'of',
        'pro', 'max', 'mini', 'ultra', 'plus', 'new', 'old' // common "marketing" modifiers that distract
    ]);

    // Priority Nouns - If we see these, we WANT them in the search
    // This helps catch "Case" in "Phone Case" or "Bag" in "Plastic Bag"
    const priorityNouns = new Set([
        'case', 'bag', 'cover', 'container', 'box', 'sleeve', 'backpack', // 4202 triggers
        'part', 'accessory', 'waste', 'scrap', 'sheet', 'film', 'plate'  // other category triggers
    ]);

    // Filter words
    const filtered = words.filter(w => !stopWords.has(w));

    // Refined Selection Strategy:
    // 1. Find any priority nouns
    const foundPriority = filtered.filter(w => priorityNouns.has(w));

    // 2. Take non-priority words (limiting to first few to keep context like "plastic" or "phone")
    const otherWords = filtered.filter(w => !priorityNouns.has(w));

    // Combine: Priority first, then context. Limit to 3 terms max to keep USITC search specific.
    // Example: "Silicone Phone Case" -> "case phone silicone"
    const finalSelection = [...foundPriority, ...otherWords].slice(0, 3);

    return finalSelection.join(' ');
}

/**
 * Extract broader keywords for fallback search
 */
function extractBroaderKeywords(description: string): string {
    const clean = description.replace(/[^\w\s]/g, ' ');
    const words = clean.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Take first 1-2 words as the most fundamental category
    return words.slice(0, 2).join(' ');
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


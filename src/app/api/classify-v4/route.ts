/**
 * Classification API V4 - Experimental
 * 
 * Enhanced classification with:
 * - Ambiguity detection
 * - Duty range when uncertain
 * - Guided questions
 * - Transparent assumptions
 * 
 * Endpoint: POST /api/classify-v4
 * 
 * This is EXPERIMENTAL. The stable API is at /api/classify
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyProductGuided, type GuidedClassificationResult } from '@/services/classificationEngineV4';
import { getEffectiveTariff, convertToLegacyFormat } from '@/services/tariffRegistry';
import type { ClassificationInput } from '@/types/classification.types';

interface ClassifyV4Request extends ClassificationInput {
    // Optional answered questions from user
    answeredQuestions?: Record<string, string>;
    // Skip ambiguity check for quick mode
    quickMode?: boolean;
}

interface ClassifyV4Response {
    success: boolean;
    result?: GuidedClassificationResult;
    error?: string;
    
    // Simplified summary for UI
    summary?: {
        htsCode: string;
        description: string;
        confidence: number;
        confidenceLabel: 'high' | 'medium' | 'low';
        
        // Duty info - Base MFN only
        baseDuty: string;
        dutyRange: string;
        estimatedDutyOnValue?: string;
        
        // Ambiguity info
        isAmbiguous: boolean;
        alternativeCount: number;
        questionsCount: number;
        assumptionsCount: number;
        
        // What to show user
        primaryMessage: string;
        assumptions: string[];
        nextSteps: string;
    };
    
    // Full tariff breakdown (Section 301, IEEPA, etc.)
    tariffBreakdown?: {
        countryCode: string;
        countryName: string;
        baseMfnRate: string;
        totalEffectiveRate: number;
        additionalDuties: Array<{
            programName: string;
            rate: string;
            htsCode?: string;
            explanation: string;
        }>;
        hasAdditionalDuties: boolean;
        dataSource: string;
    };
    
    // HTS Hierarchy path
    htsHierarchy?: {
        levels: Array<{
            code: string;
            description: string;
            dutyRate?: string;
        }>;
    };
}

export async function POST(request: NextRequest): Promise<NextResponse<ClassifyV4Response>> {
    try {
        const body = await request.json() as ClassifyV4Request;
        
        // Validate input
        if (!body.productDescription || body.productDescription.trim().length < 5) {
            return NextResponse.json({
                success: false,
                error: 'Product description must be at least 5 characters',
            }, { status: 400 });
        }
        
        console.log('[API-V4] Classification request:', {
            description: body.productDescription.substring(0, 50),
            material: body.materialComposition,
            country: body.countryOfOrigin,
            quickMode: body.quickMode,
            answeredQuestions: body.answeredQuestions,
        });
        
        // Run guided classification
        const result = await classifyProductGuided(
            {
                productDescription: body.productDescription,
                productName: body.productName,
                materialComposition: body.materialComposition,
                countryOfOrigin: body.countryOfOrigin || 'CN',
                intendedUse: body.intendedUse,
                classificationType: body.classificationType || 'import',
            },
            {
                skipAmbiguityCheck: body.quickMode,
                answeredQuestions: body.answeredQuestions,
            }
        );
        
        // Get tariff details if country provided
        let tariffDetails = null;
        if (body.countryOfOrigin && result.htsCode.code) {
            try {
                tariffDetails = await getEffectiveTariff(
                    body.countryOfOrigin,
                    result.htsCode.code,
                    { baseMfnRate: parseDutyRate(result.dutyRate.generalRate) ?? undefined }
                );
            } catch (e) {
                console.warn('[API-V4] Tariff lookup failed:', e);
            }
        }
        
        // Build summary for UI
        const summary = buildSummary(result, tariffDetails, body);
        
        // Build tariff breakdown for UI
        const tariffBreakdown = buildTariffBreakdown(tariffDetails, body.countryOfOrigin || 'CN', result.dutyRate.generalRate);
        
        // Build HTS hierarchy from result
        const htsHierarchy = buildHtsHierarchy(result);
        
        return NextResponse.json({
            success: true,
            result,
            summary,
            tariffBreakdown,
            htsHierarchy,
        });
        
    } catch (error) {
        console.error('[API-V4] Classification error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Classification failed',
        }, { status: 500 });
    }
}

/**
 * Build simplified summary for UI display
 */
function buildSummary(
    result: GuidedClassificationResult,
    tariffDetails: unknown,
    request: ClassifyV4Request
): ClassifyV4Response['summary'] {
    // Confidence label
    const confidenceLabel: 'high' | 'medium' | 'low' = 
        result.confidence >= 85 ? 'high' :
        result.confidence >= 65 ? 'medium' : 'low';
    
    // Primary message based on state
    let primaryMessage: string;
    let nextSteps: string;
    
    if (!result.ambiguity.isAmbiguous) {
        primaryMessage = `Classification complete with ${confidenceLabel} confidence.`;
        nextSteps = 'You can save this to your product library or export the details.';
    } else if (result.ambiguity.questionsToAsk.length > 0) {
        primaryMessage = `We found ${result.ambiguity.possibleCodes.length} possible codes. Answer ${result.ambiguity.questionsToAsk.length} question(s) to narrow down.`;
        nextSteps = 'Click "Refine Classification" to answer questions and get an exact code.';
    } else if (result.assumptions.length > 0) {
        primaryMessage = `Classification complete with ${result.assumptions.length} assumption(s). Verify for accuracy.`;
        nextSteps = 'Review our assumptions below. Click "Refine" to correct if needed.';
    } else {
        primaryMessage = `Likely code identified: ${result.htsCode.code}`;
        nextSteps = 'Review the details and save if correct.';
    }
    
    // Duty info
    const baseDuty = result.dutyRate.generalRate || 'See HTS';
    const dutyRange = result.ambiguity.dutyRange.formatted;
    
    // Estimate duty on value if provided
    let estimatedDutyOnValue: string | undefined;
    const unitValue = (request as unknown as { unitValue?: number }).unitValue;
    if (unitValue && result.confidence >= 70) {
        const dutyPercent = parseDutyRate(result.dutyRate.generalRate);
        if (dutyPercent !== null) {
            // Add 301 if China
            const additionalDuty = request.countryOfOrigin === 'CN' ? 25 : 0;
            const totalPercent = dutyPercent + additionalDuty;
            const dutyAmount = unitValue * (totalPercent / 100);
            estimatedDutyOnValue = `~$${dutyAmount.toFixed(2)} (${totalPercent}% on $${unitValue})`;
        }
    }
    
    return {
        htsCode: result.htsCode.code,
        description: result.htsCode.description,
        confidence: result.confidence,
        confidenceLabel,
        baseDuty,
        dutyRange,
        estimatedDutyOnValue,
        isAmbiguous: result.ambiguity.isAmbiguous,
        alternativeCount: result.alternativeCodes?.length || 0,
        questionsCount: result.ambiguity.questionsToAsk.length,
        assumptionsCount: result.assumptions.length,
        primaryMessage,
        assumptions: result.assumptions.map(a => `${a.variableName}: ${a.assumedValue}`),
        nextSteps,
    };
}

/**
 * Parse duty rate string to number
 */
function parseDutyRate(rate: string | undefined): number | null {
    if (!rate) return null;
    if (rate.toLowerCase() === 'free') return 0;
    
    const match = rate.match(/([\d.]+)\s*%/);
    if (match) {
        return parseFloat(match[1]);
    }
    
    return null;
}

/**
 * Country names for display
 */
const COUNTRY_NAMES: Record<string, string> = {
    'CN': 'China',
    'VN': 'Vietnam',
    'MX': 'Mexico',
    'CA': 'Canada',
    'IN': 'India',
    'TW': 'Taiwan',
    'KR': 'South Korea',
    'JP': 'Japan',
    'DE': 'Germany',
    'IT': 'Italy',
};

/**
 * Build tariff breakdown with all duty layers
 * Always includes estimated Section 301/IEEPA for relevant countries
 */
function buildTariffBreakdown(
    tariffDetails: unknown,
    countryCode: string,
    baseMfnRate: string | undefined
): ClassifyV4Response['tariffBreakdown'] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = tariffDetails as any;
    
    // Get base rate from details or fallback
    const baseMfn = details?.baseMfnRate?.rate || baseMfnRate || 'See HTS';
    const baseRate = parseDutyRate(baseMfn) || 0;
    
    // Build additional duties - always include estimated country-specific duties
    const additionalDuties: NonNullable<ClassifyV4Response['tariffBreakdown']>['additionalDuties'] = [];
    let totalEffective = baseRate;
    
    // First, add any from tariff registry
    if (details?.additionalDuties && Array.isArray(details.additionalDuties)) {
        for (const duty of details.additionalDuties) {
            const numRate = duty.rate?.numericRate || parseDutyRate(duty.rate?.rate) || 0;
            additionalDuties.push({
                programName: duty.programName || duty.program || 'Additional Duty',
                rate: duty.rate?.rate || `+${numRate}%`,
                htsCode: duty.htsCode,
                explanation: getProgamExplanation(duty.programType),
            });
            totalEffective += numRate;
        }
    }
    
    // If no duties from registry, add estimated country-specific duties
    if (additionalDuties.length === 0) {
        if (countryCode === 'CN') {
            additionalDuties.push({
                programName: 'Section 301 (Est.)',
                rate: '+25%',
                htsCode: '9903.88.xx',
                explanation: 'Trade Act of 1974 tariffs on Chinese goods due to unfair trade practices',
            });
            additionalDuties.push({
                programName: 'IEEPA Fentanyl (Est.)',
                rate: '+10%',
                explanation: 'Emergency tariffs under IEEPA in response to the fentanyl crisis',
            });
            totalEffective = baseRate + 25 + 10;
        } else if (countryCode === 'VN') {
            additionalDuties.push({
                programName: 'IEEPA Reciprocal (Est.)',
                rate: '+46%',
                explanation: 'Reciprocal tariffs matching Vietnam\'s trade barriers',
            });
            totalEffective = baseRate + 46;
        } else if (countryCode === 'MX' || countryCode === 'CA') {
            additionalDuties.push({
                programName: 'USMCA Eligible',
                rate: 'May be 0%',
                explanation: 'Products meeting USMCA rules of origin may qualify for 0% duty',
            });
            // Don't add to total for USMCA
        }
    }
    
    const dataSource = details?.dataFreshness || 
        (additionalDuties.length > 0 ? `Last verified: ${new Date().toLocaleDateString()}` : 'USITC');
    
    return {
        countryCode,
        countryName: COUNTRY_NAMES[countryCode] || countryCode,
        baseMfnRate: baseMfn,
        totalEffectiveRate: totalEffective,
        additionalDuties,
        hasAdditionalDuties: additionalDuties.length > 0,
        dataSource,
    };
}

/**
 * Get explanation for tariff program
 */
function getProgamExplanation(programType: string): string {
    const explanations: Record<string, string> = {
        'section_301': 'Trade Act of 1974 tariffs on Chinese goods due to unfair trade practices',
        'ieepa_fentanyl': 'Emergency tariffs under IEEPA in response to the fentanyl crisis',
        'ieepa_reciprocal': 'Reciprocal tariffs matching barriers other countries impose on US goods',
        'ieepa_baseline': 'Universal baseline tariff under IEEPA',
        'section_232': 'National security tariffs on steel, aluminum, and autos',
        'adcvd': 'Anti-dumping or countervailing duties on specific products',
    };
    return explanations[programType] || 'Additional duty program';
}

/**
 * Build HTS hierarchy from classification result
 */
function buildHtsHierarchy(result: GuidedClassificationResult): ClassifyV4Response['htsHierarchy'] {
    const code = result.htsCode.code;
    const description = result.htsCode.description;
    
    // Parse the code into hierarchy levels
    // 8211.92.20.00 -> ["82", "8211", "8211.92", "8211.92.20", "8211.92.20.00"]
    const cleanCode = code.replace(/\./g, '');
    const levels: Array<{ code: string; description: string; dutyRate?: string }> = [];
    
    // Chapter (2 digit)
    if (cleanCode.length >= 2) {
        levels.push({
            code: cleanCode.substring(0, 2),
            description: getChapterDescription(cleanCode.substring(0, 2)),
        });
    }
    
    // Heading (4 digit)
    if (cleanCode.length >= 4) {
        const heading = cleanCode.substring(0, 4);
        levels.push({
            code: `${heading.substring(0, 2)}.${heading.substring(2)}`,
            description: getHeadingDescription(heading),
        });
    }
    
    // Subheading (6 digit)
    if (cleanCode.length >= 6) {
        const subheading = cleanCode.substring(0, 6);
        levels.push({
            code: `${subheading.substring(0, 4)}.${subheading.substring(4)}`,
            description: getSubheadingDescription(subheading),
        });
    }
    
    // Statistical suffix (8 digit)
    if (cleanCode.length >= 8) {
        const stat = cleanCode.substring(0, 8);
        levels.push({
            code: `${stat.substring(0, 4)}.${stat.substring(4, 6)}.${stat.substring(6)}`,
            description: 'Statistical category',
        });
    }
    
    // Full code (10 digit)
    if (cleanCode.length >= 10) {
        levels.push({
            code: code,
            description: description,
            dutyRate: result.dutyRate.generalRate,
        });
    }
    
    return { levels };
}

/**
 * Get chapter description (simplified)
 */
function getChapterDescription(chapter: string): string {
    const chapters: Record<string, string> = {
        '82': 'Tools, implements, cutlery, spoons and forks, of base metal',
        '83': 'Miscellaneous articles of base metal',
        '84': 'Nuclear reactors, boilers, machinery',
        '85': 'Electrical machinery and equipment',
        '39': 'Plastics and articles thereof',
        '40': 'Rubber and articles thereof',
        '42': 'Articles of leather; saddlery; travel goods',
        '61': 'Articles of apparel, knitted or crocheted',
        '62': 'Articles of apparel, not knitted or crocheted',
        '71': 'Natural or cultured pearls; precious stones; jewelry',
        '73': 'Articles of iron or steel',
        '94': 'Furniture; bedding; lamps',
        '95': 'Toys, games and sports requisites',
    };
    return chapters[chapter] || `Chapter ${chapter}`;
}

/**
 * Get heading description (simplified)
 */
function getHeadingDescription(heading: string): string {
    const headings: Record<string, string> = {
        '8211': 'Knives with cutting blades, serrated or not',
        '8212': 'Razors and razor blades',
        '8215': 'Spoons, forks, ladles, skimmers',
        '8518': 'Microphones; loudspeakers; headphones',
        '6109': 'T-shirts, singlets, tank tops, knitted',
        '7117': 'Imitation jewelry',
    };
    return headings[heading] || `Heading ${heading.substring(0, 2)}.${heading.substring(2)}`;
}

/**
 * Get subheading description (simplified)
 */
function getSubheadingDescription(subheading: string): string {
    const subheadings: Record<string, string> = {
        '821192': 'Other knives having fixed blades',
        '821191': 'Table knives having fixed blades',
        '821110': 'Sets of assorted articles',
    };
    return subheadings[subheading] || 'Subheading';
}

// GET endpoint for documentation
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        name: 'Classification API V4 (Experimental)',
        version: '4.0.0-experimental',
        description: 'Enhanced classification with ambiguity detection, duty ranges, and guided questions',
        endpoints: {
            'POST /api/classify-v4': {
                description: 'Classify a product with guided flow',
                body: {
                    productDescription: 'string (required)',
                    materialComposition: 'string (optional)',
                    countryOfOrigin: 'string (optional, default: CN)',
                    intendedUse: 'string (optional)',
                    unitValue: 'number (optional, for duty estimate)',
                    answeredQuestions: 'Record<string, string> (optional, refine results)',
                    quickMode: 'boolean (optional, skip ambiguity check)',
                },
                response: {
                    success: 'boolean',
                    result: 'GuidedClassificationResult',
                    summary: 'Simplified UI summary',
                    error: 'string (on failure)',
                },
            },
        },
        features: [
            'Ambiguity detection - knows when multiple codes could apply',
            'Duty range display - shows min/max when uncertain',
            'Guided questions - asks only what matters',
            'Transparent assumptions - shows what we assumed',
            'Alternative codes - always shows other possibilities',
        ],
        stableApi: '/api/classify',
    });
}


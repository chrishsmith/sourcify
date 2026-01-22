import { NextResponse } from 'next/server';
import {
    getRuleForHtsAndFta,
    getFtaByCode,
    hasUsaFta,
    getFtasByCountry,
    getAllFtaAgreements,
    type FtaRule,
    type FtaAgreement,
    type TariffShiftType,
} from '@/data/ftaRules';
import { getEffectiveTariff } from '@/services/tariff/registry';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BOMComponent {
    id: string;
    name: string;
    htsCode: string;
    originCountry: string;
    value: number;
    isOriginating: boolean;
}

interface FTACalculatorRequest {
    productHtsCode: string;
    ftaCode: string;
    transactionValue: number;
    bomComponents: BOMComponent[];
}

interface TariffShiftResult {
    passes: boolean;
    componentResults: Array<{
        componentId: string;
        componentName: string;
        componentHts: string;
        productHts: string;
        shiftRequired: TariffShiftType;
        shiftAchieved: TariffShiftType | null;
        passes: boolean;
        explanation: string;
    }>;
    overallExplanation: string;
}

interface RVCResult {
    passes: boolean;
    calculatedRVC: number;
    requiredRVC: number;
    method: string;
    formula: string;
    nonOriginatingValue: number;
    originatingValue: number;
    explanation: string;
}

interface QualificationResult {
    qualifies: boolean;
    rule: FtaRule | null;
    fta: FtaAgreement | null;
    rvcResult: RVCResult | null;
    tariffShiftResult: TariffShiftResult | null;
    overallExplanation: string;
    requirements: string[];
    warnings: string[];
}

interface DutySavingsResult {
    mfnRate: number;
    ftaRate: number;
    savingsPercent: number;
    savingsAmount: number;
    transactionValue: number;
    mfnDuty: number;
    ftaDuty: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF SHIFT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine what tariff shift a component achieves
 */
function determineTariffShift(componentHts: string, productHts: string): TariffShiftType | null {
    const cleanComponent = componentHts.replace(/\./g, '');
    const cleanProduct = productHts.replace(/\./g, '');
    
    // Get chapter (first 2 digits)
    const componentChapter = cleanComponent.substring(0, 2);
    const productChapter = cleanProduct.substring(0, 2);
    
    // Get heading (first 4 digits)
    const componentHeading = cleanComponent.substring(0, 4);
    const productHeading = cleanProduct.substring(0, 4);
    
    // Get subheading (first 6 digits)
    const componentSubheading = cleanComponent.substring(0, 6);
    const productSubheading = cleanProduct.substring(0, 6);
    
    // Get tariff item (first 8 digits)
    const componentItem = cleanComponent.substring(0, 8);
    const productItem = cleanProduct.substring(0, 8);
    
    // Check from most strict to least strict
    if (componentChapter !== productChapter) {
        return 'CC'; // Change of Chapter
    }
    if (componentHeading !== productHeading) {
        return 'CTH'; // Change of Tariff Heading
    }
    if (componentSubheading !== productSubheading) {
        return 'CTSH'; // Change of Tariff Subheading
    }
    if (componentItem !== productItem) {
        return 'CTI'; // Change of Tariff Item
    }
    
    return null; // No shift achieved
}

/**
 * Check if achieved shift satisfies required shift
 */
function shiftSatisfiesRequirement(achieved: TariffShiftType | null, required: TariffShiftType): boolean {
    if (!achieved) return false;
    
    // Hierarchy: CC > CTH > CTSH > CTI
    const hierarchy: Record<TariffShiftType, number> = {
        'CC': 4,
        'CTH': 3,
        'CTSH': 2,
        'CTI': 1,
    };
    
    return hierarchy[achieved] >= hierarchy[required];
}

/**
 * Analyze tariff shift compliance for all components
 */
function analyzeTariffShift(
    rule: FtaRule,
    productHtsCode: string,
    components: BOMComponent[]
): TariffShiftResult {
    const shiftRequired = rule.tariffShift;
    
    if (!shiftRequired) {
        return {
            passes: true,
            componentResults: [],
            overallExplanation: 'No tariff shift requirement for this rule',
        };
    }
    
    // Only check non-originating components for tariff shift
    const nonOriginatingComponents = components.filter(c => !c.isOriginating);
    
    if (nonOriginatingComponents.length === 0) {
        return {
            passes: true,
            componentResults: [],
            overallExplanation: 'All components are originating - tariff shift satisfied',
        };
    }
    
    const componentResults = nonOriginatingComponents.map(component => {
        const shiftAchieved = determineTariffShift(component.htsCode, productHtsCode);
        const passes = shiftSatisfiesRequirement(shiftAchieved, shiftRequired);
        
        let explanation: string;
        if (passes) {
            explanation = `✓ ${component.name} achieves ${shiftAchieved} shift (requires ${shiftRequired})`;
        } else if (shiftAchieved) {
            explanation = `✗ ${component.name} only achieves ${shiftAchieved} shift (requires ${shiftRequired})`;
        } else {
            explanation = `✗ ${component.name} has same classification as product (no shift)`;
        }
        
        return {
            componentId: component.id,
            componentName: component.name,
            componentHts: component.htsCode,
            productHts: productHtsCode,
            shiftRequired,
            shiftAchieved,
            passes,
            explanation,
        };
    });
    
    const allPass = componentResults.every(r => r.passes);
    const failingCount = componentResults.filter(r => !r.passes).length;
    
    let overallExplanation: string;
    if (allPass) {
        overallExplanation = `All ${componentResults.length} non-originating components satisfy the ${shiftRequired} tariff shift requirement`;
    } else {
        overallExplanation = `${failingCount} of ${componentResults.length} non-originating components fail the ${shiftRequired} tariff shift requirement`;
    }
    
    return {
        passes: allPass,
        componentResults,
        overallExplanation,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RVC CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Regional Value Content
 */
function calculateRVC(
    rule: FtaRule,
    transactionValue: number,
    components: BOMComponent[]
): RVCResult {
    const requiredRVC = rule.rvcThreshold;
    const method = rule.rvcMethod || 'transaction';
    
    if (!requiredRVC) {
        return {
            passes: true,
            calculatedRVC: 100,
            requiredRVC: 0,
            method: 'N/A',
            formula: 'N/A',
            nonOriginatingValue: 0,
            originatingValue: transactionValue,
            explanation: 'No RVC requirement for this rule',
        };
    }
    
    // Calculate non-originating value
    const nonOriginatingValue = components
        .filter(c => !c.isOriginating)
        .reduce((sum, c) => sum + c.value, 0);
    
    const originatingValue = transactionValue - nonOriginatingValue;
    
    // Calculate RVC based on method
    let calculatedRVC: number;
    let formula: string;
    
    switch (method) {
        case 'transaction':
            calculatedRVC = ((transactionValue - nonOriginatingValue) / transactionValue) * 100;
            formula = `((TV - VNM) / TV) × 100 = ((${transactionValue.toFixed(2)} - ${nonOriginatingValue.toFixed(2)}) / ${transactionValue.toFixed(2)}) × 100`;
            break;
        case 'net_cost':
            // For net cost, we'd need additional inputs (royalties, shipping, etc.)
            // Simplified: use transaction value as proxy
            calculatedRVC = ((transactionValue - nonOriginatingValue) / transactionValue) * 100;
            formula = `((NC - VNM) / NC) × 100 ≈ ((${transactionValue.toFixed(2)} - ${nonOriginatingValue.toFixed(2)}) / ${transactionValue.toFixed(2)}) × 100`;
            break;
        case 'build_down':
            calculatedRVC = ((transactionValue - nonOriginatingValue) / transactionValue) * 100;
            formula = `((AV - VNM) / AV) × 100 = ((${transactionValue.toFixed(2)} - ${nonOriginatingValue.toFixed(2)}) / ${transactionValue.toFixed(2)}) × 100`;
            break;
        case 'build_up':
            calculatedRVC = (originatingValue / transactionValue) * 100;
            formula = `(VOM / AV) × 100 = (${originatingValue.toFixed(2)} / ${transactionValue.toFixed(2)}) × 100`;
            break;
        default:
            calculatedRVC = ((transactionValue - nonOriginatingValue) / transactionValue) * 100;
            formula = `((TV - VNM) / TV) × 100`;
    }
    
    const passes = calculatedRVC >= requiredRVC;
    
    let explanation: string;
    if (passes) {
        explanation = `✓ RVC of ${calculatedRVC.toFixed(1)}% meets the ${requiredRVC}% threshold`;
    } else {
        const shortfall = requiredRVC - calculatedRVC;
        explanation = `✗ RVC of ${calculatedRVC.toFixed(1)}% is ${shortfall.toFixed(1)}% below the ${requiredRVC}% threshold`;
    }
    
    return {
        passes,
        calculatedRVC: Math.round(calculatedRVC * 10) / 10,
        requiredRVC,
        method,
        formula,
        nonOriginatingValue,
        originatingValue,
        explanation,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALIFICATION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze if product qualifies under FTA
 */
function analyzeQualification(
    rule: FtaRule,
    fta: FtaAgreement,
    productHtsCode: string,
    transactionValue: number,
    components: BOMComponent[]
): QualificationResult {
    const warnings: string[] = [];
    const requirements: string[] = [];
    
    // Calculate RVC if applicable
    let rvcResult: RVCResult | null = null;
    if (rule.rvcThreshold) {
        rvcResult = calculateRVC(rule, transactionValue, components);
        requirements.push(`Regional Value Content: ${rule.rvcThreshold}% minimum`);
    }
    
    // Analyze tariff shift if applicable
    let tariffShiftResult: TariffShiftResult | null = null;
    if (rule.tariffShift) {
        tariffShiftResult = analyzeTariffShift(rule, productHtsCode, components);
        requirements.push(`Tariff Shift: ${rule.tariffShift} required`);
    }
    
    // Add additional requirements
    if (rule.additionalRequirements) {
        requirements.push(...rule.additionalRequirements);
        warnings.push(`Note: Additional requirements apply - ${rule.additionalRequirements.join('; ')}`);
    }
    
    // Determine qualification based on rule type
    let qualifies: boolean;
    let overallExplanation: string;
    
    switch (rule.ruleType) {
        case 'tariff_shift':
            qualifies = tariffShiftResult?.passes ?? false;
            overallExplanation = tariffShiftResult?.overallExplanation ?? 'Tariff shift analysis required';
            break;
            
        case 'rvc':
            qualifies = rvcResult?.passes ?? false;
            overallExplanation = rvcResult?.explanation ?? 'RVC analysis required';
            break;
            
        case 'rvc_or_shift':
            // Either requirement can be met
            const rvcPasses = rvcResult?.passes ?? false;
            const shiftPasses = tariffShiftResult?.passes ?? false;
            qualifies = rvcPasses || shiftPasses;
            
            if (qualifies) {
                if (rvcPasses && shiftPasses) {
                    overallExplanation = 'Product qualifies via BOTH RVC and tariff shift';
                } else if (rvcPasses) {
                    overallExplanation = `Product qualifies via RVC (${rvcResult?.calculatedRVC?.toFixed(1)}% ≥ ${rvcResult?.requiredRVC}%)`;
                } else {
                    overallExplanation = `Product qualifies via tariff shift (${rule.tariffShift})`;
                }
            } else {
                overallExplanation = 'Product fails BOTH RVC and tariff shift requirements';
            }
            break;
            
        case 'rvc_and_shift':
            // Both requirements must be met
            qualifies = (rvcResult?.passes ?? false) && (tariffShiftResult?.passes ?? false);
            
            if (qualifies) {
                overallExplanation = 'Product meets BOTH required RVC and tariff shift requirements';
            } else {
                const failedReqs: string[] = [];
                if (!rvcResult?.passes) failedReqs.push('RVC');
                if (!tariffShiftResult?.passes) failedReqs.push('tariff shift');
                overallExplanation = `Product fails ${failedReqs.join(' and ')} requirement(s)`;
            }
            break;
            
        case 'wholly_obtained':
            // All materials must be originating
            const allOriginating = components.every(c => c.isOriginating);
            qualifies = allOriginating;
            overallExplanation = allOriginating 
                ? 'All materials are originating - product qualifies as wholly obtained'
                : 'Some materials are non-originating - does not qualify as wholly obtained';
            break;
            
        case 'specific_process':
            // Would need more specific implementation
            qualifies = false;
            overallExplanation = 'Specific process requirements need manual verification';
            warnings.push('This rule requires specific manufacturing processes that must be verified separately');
            break;
            
        default:
            qualifies = false;
            overallExplanation = 'Unknown rule type';
    }
    
    return {
        qualifies,
        rule,
        fta,
        rvcResult,
        tariffShiftResult,
        overallExplanation,
        requirements,
        warnings,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUTY SAVINGS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

async function calculateDutySavings(
    productHtsCode: string,
    transactionValue: number,
    ftaCountryCode: string
): Promise<DutySavingsResult> {
    try {
        // Get MFN rate (from a non-FTA country like China)
        const mfnTariff = await getEffectiveTariff('CN', productHtsCode, {
            baseMfnRate: 0,
            includeSection232: false,
        });
        
        // Get FTA rate
        const ftaTariff = await getEffectiveTariff(ftaCountryCode, productHtsCode, {
            baseMfnRate: mfnTariff.baseMfnRate,
            includeSection232: false,
        });
        
        // Use base MFN rate for comparison (without special tariffs)
        const mfnRate = mfnTariff.baseMfnRate;
        const ftaRate = ftaTariff.hasFta ? Math.max(0, mfnRate - ftaTariff.ftaDiscount) : mfnRate;
        
        const mfnDuty = (mfnRate / 100) * transactionValue;
        const ftaDuty = (ftaRate / 100) * transactionValue;
        const savingsAmount = mfnDuty - ftaDuty;
        const savingsPercent = mfnRate > 0 ? ((mfnRate - ftaRate) / mfnRate) * 100 : 0;
        
        return {
            mfnRate,
            ftaRate,
            savingsPercent,
            savingsAmount,
            transactionValue,
            mfnDuty,
            ftaDuty,
        };
    } catch (error) {
        console.error('Error calculating duty savings:', error);
        return {
            mfnRate: 0,
            ftaRate: 0,
            savingsPercent: 0,
            savingsAmount: 0,
            transactionValue,
            mfnDuty: 0,
            ftaDuty: 0,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
    try {
        const body: FTACalculatorRequest = await request.json();
        const { productHtsCode, ftaCode, transactionValue, bomComponents } = body;
        
        // Validate inputs
        if (!productHtsCode || !ftaCode) {
            return NextResponse.json(
                { success: false, error: 'Product HTS code and FTA are required' },
                { status: 400 }
            );
        }
        
        if (!transactionValue || transactionValue <= 0) {
            return NextResponse.json(
                { success: false, error: 'Transaction value must be positive' },
                { status: 400 }
            );
        }
        
        // Get FTA agreement
        const fta = getFtaByCode(ftaCode);
        if (!fta) {
            return NextResponse.json(
                { success: false, error: `Unknown FTA: ${ftaCode}` },
                { status: 400 }
            );
        }
        
        // Get applicable rule
        const cleanHts = productHtsCode.replace(/\./g, '');
        const rule = getRuleForHtsAndFta(cleanHts, ftaCode);
        
        if (!rule) {
            return NextResponse.json({
                success: true,
                data: {
                    qualifies: false,
                    rule: null,
                    fta,
                    rvcResult: null,
                    tariffShiftResult: null,
                    overallExplanation: `No specific rule found for HTS ${productHtsCode} under ${ftaCode}. The general FTA rules may apply - consult the FTA text.`,
                    requirements: [],
                    warnings: [`No specific rule of origin found for this HTS code under ${fta.name}`],
                    dutySavings: null,
                },
            });
        }
        
        // Analyze qualification
        const qualification = analyzeQualification(
            rule,
            fta,
            cleanHts,
            transactionValue,
            bomComponents
        );
        
        // Calculate duty savings
        const ftaCountry = fta.countries[0]; // Use first FTA country for comparison
        const dutySavings = await calculateDutySavings(cleanHts, transactionValue, ftaCountry);
        
        return NextResponse.json({
            success: true,
            data: {
                ...qualification,
                dutySavings,
            },
        });
        
    } catch (error) {
        console.error('Error in FTA calculator API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to calculate FTA qualification',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET endpoint for fetching FTAs and rules info
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const countryCode = searchParams.get('countryCode');
        
        const agreements = getAllFtaAgreements();
        
        let applicableFtas: FtaAgreement[] = [];
        if (countryCode) {
            applicableFtas = getFtasByCountry(countryCode);
        }
        
        return NextResponse.json({
            success: true,
            data: {
                agreements,
                ...(countryCode && {
                    countryHasFta: hasUsaFta(countryCode),
                    applicableFtas,
                }),
            },
        });
    } catch (error) {
        console.error('Error in FTA calculator GET:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch FTA data' },
            { status: 500 }
        );
    }
}

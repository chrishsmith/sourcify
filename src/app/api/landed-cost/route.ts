/**
 * Landed Cost Calculator API
 * 
 * Calculates total landed cost for imports including:
 * - Duties (base MFN + additional tariffs)
 * - Merchandise Processing Fee (MPF)
 * - Harbor Maintenance Fee (HMF)
 * - User-provided shipping and insurance costs
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveTariff, convertToLegacyFormat } from '@/services/tariff/registry';

// MPF: 0.3464% of value, min $31.67, max $614.35
const MPF_RATE = 0.003464;
const MPF_MIN = 31.67;
const MPF_MAX = 614.35;

// HMF: 0.125% of value (ocean shipments only)
const HMF_RATE = 0.00125;

interface LandedCostRequest {
    htsCode: string;
    countryCode: string;
    productValue: number;
    quantity: number;
    shippingCost?: number;
    insuranceCost?: number;
    isOceanShipment?: boolean;
}

interface FeeBreakdown {
    mpf: number;
    hmf: number;
    totalFees: number;
}

interface DutyBreakdown {
    baseMfn: number;
    baseMfnRate: number;
    additionalDuties: number;
    additionalDutiesRate: number;
    totalDuty: number;
    effectiveRate: number;
}

interface LandedCostResult {
    // Input values
    htsCode: string;
    htsDescription: string;
    countryCode: string;
    countryName: string;
    productValue: number;
    quantity: number;
    shippingCost: number;
    insuranceCost: number;
    
    // Calculated values
    duties: DutyBreakdown;
    fees: FeeBreakdown;
    
    // Totals
    totalDutiesAndFees: number;
    totalLandedCost: number;
    perUnitCost: number;
    
    // Tariff details for display
    tariffBreakdown: import('@/types/tariffLayers.types').EffectiveTariffRate;
    
    // Metadata
    calculatedAt: Date;
    isOceanShipment: boolean;
}

function calculateMPF(productValue: number): number {
    const mpf = productValue * MPF_RATE;
    return Math.max(MPF_MIN, Math.min(MPF_MAX, mpf));
}

function calculateHMF(productValue: number, isOcean: boolean): number {
    if (!isOcean) return 0;
    return productValue * HMF_RATE;
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json() as LandedCostRequest;
        
        const {
            htsCode,
            countryCode,
            productValue,
            quantity,
            shippingCost = 0,
            insuranceCost = 0,
            isOceanShipment = true,
        } = body;
        
        // Validate inputs
        if (!htsCode || !countryCode || !productValue || !quantity) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: htsCode, countryCode, productValue, quantity' },
                { status: 400 }
            );
        }
        
        if (productValue <= 0 || quantity <= 0) {
            return NextResponse.json(
                { success: false, error: 'Product value and quantity must be positive numbers' },
                { status: 400 }
            );
        }
        
        // Clean HTS code
        const cleanHts = htsCode.replace(/\./g, '');
        
        // Get HTS description from database
        const htsRecord = await prisma.htsCode.findFirst({
            where: {
                OR: [
                    { code: cleanHts },
                    { code: cleanHts.substring(0, 10) },
                    { code: cleanHts.substring(0, 8) },
                    { code: cleanHts.substring(0, 6) },
                ],
            },
            orderBy: { code: 'desc' },
        });
        
        const htsDescription = htsRecord?.description ?? 'Unknown product';
        
        // Get base MFN rate from HTS record
        let baseMfnRate = 0;
        if (htsRecord?.generalRate) {
            const rateMatch = htsRecord.generalRate.match(/(\d+\.?\d*)%/);
            if (rateMatch) {
                baseMfnRate = parseFloat(rateMatch[1]);
            }
        }
        
        // Get effective tariff from registry
        const tariffResult = await getEffectiveTariff(countryCode, cleanHts, {
            baseMfnRate,
            includeSection232: true,
        });
        
        // Convert to legacy format for UI display
        const tariffBreakdown = convertToLegacyFormat(
            tariffResult,
            cleanHts,
            htsDescription,
            countryCode,
            productValue
        );
        
        // Calculate duties
        const baseMfnDuty = productValue * (tariffResult.baseMfnRate / 100);
        const additionalDutiesRate = tariffResult.totalAdditionalDuties;
        const additionalDuties = productValue * (additionalDutiesRate / 100);
        const totalDuty = baseMfnDuty + additionalDuties - (productValue * (tariffResult.ftaDiscount / 100));
        
        const duties: DutyBreakdown = {
            baseMfn: Math.round(baseMfnDuty * 100) / 100,
            baseMfnRate: tariffResult.baseMfnRate,
            additionalDuties: Math.round(additionalDuties * 100) / 100,
            additionalDutiesRate,
            totalDuty: Math.round(Math.max(0, totalDuty) * 100) / 100,
            effectiveRate: tariffResult.effectiveRate,
        };
        
        // Calculate fees
        const mpf = calculateMPF(productValue);
        const hmf = calculateHMF(productValue, isOceanShipment);
        
        const fees: FeeBreakdown = {
            mpf: Math.round(mpf * 100) / 100,
            hmf: Math.round(hmf * 100) / 100,
            totalFees: Math.round((mpf + hmf) * 100) / 100,
        };
        
        // Calculate totals
        const totalDutiesAndFees = duties.totalDuty + fees.totalFees;
        const totalLandedCost = productValue + shippingCost + insuranceCost + totalDutiesAndFees;
        const perUnitCost = totalLandedCost / quantity;
        
        const result: LandedCostResult = {
            htsCode: cleanHts,
            htsDescription,
            countryCode: countryCode.toUpperCase(),
            countryName: tariffResult.countryName,
            productValue,
            quantity,
            shippingCost,
            insuranceCost,
            duties,
            fees,
            totalDutiesAndFees: Math.round(totalDutiesAndFees * 100) / 100,
            totalLandedCost: Math.round(totalLandedCost * 100) / 100,
            perUnitCost: Math.round(perUnitCost * 100) / 100,
            tariffBreakdown,
            calculatedAt: new Date(),
            isOceanShipment,
        };
        
        return NextResponse.json({ success: true, data: result });
        
    } catch (error) {
        console.error('[LandedCost API] Error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to calculate landed cost' 
            },
            { status: 500 }
        );
    }
}

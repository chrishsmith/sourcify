/**
 * GET /api/sourcing/quick
 * 
 * Lightweight endpoint for sourcing preview cards.
 * Returns top 3-5 country alternatives with cost savings and supplier counts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEffectiveTariff } from '@/services/landedCost';

// FTA country names
const FTA_NAMES: Record<string, string> = {
    'CA': 'USMCA',
    'MX': 'USMCA',
    'KR': 'KORUS FTA',
    'AU': 'Australia FTA',
    'SG': 'Singapore FTA',
    'CL': 'Chile FTA',
    'CO': 'Colombia TPA',
    'PE': 'Peru TPA',
    'PA': 'Panama TPA',
    'IL': 'Israel FTA',
};

// Country flags
const COUNTRY_FLAGS: Record<string, string> = {
    'CN': '🇨🇳', 'MX': '🇲🇽', 'CA': '🇨🇦', 'VN': '🇻🇳', 'IN': '🇮🇳',
    'BD': '🇧🇩', 'TH': '🇹🇭', 'ID': '🇮🇩', 'TW': '🇹🇼', 'KR': '🇰🇷',
    'JP': '🇯🇵', 'DE': '🇩🇪', 'IT': '🇮🇹', 'TR': '🇹🇷', 'MY': '🇲🇾',
    'PH': '🇵🇭', 'PK': '🇵🇰', 'KH': '🇰🇭', 'AU': '🇦🇺', 'SG': '🇸🇬',
};

export interface QuickSourcingPreview {
    htsCode: string;
    currentCountry: {
        code: string;
        name: string;
        flag: string;
        landedCost: number;
        effectiveTariff: number;
    } | null;
    alternatives: Array<{
        code: string;
        name: string;
        flag: string;
        landedCost: number;
        effectiveTariff: number;
        savingsPercent: number;
        savingsAmount: number;
        supplierCount: number;
        hasFTA: boolean;
        ftaName?: string;
        isRecommended: boolean;
    }>;
    totalCountries: number;
    potentialSavings: {
        percent: number;
        perUnit: number;
        annual?: number;
    } | null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const htsCode = searchParams.get('hts');
        const currentCountry = searchParams.get('from');
        const annualUnits = parseInt(searchParams.get('units') || '10000');
        
        if (!htsCode) {
            return NextResponse.json(
                { error: 'hts parameter is required' },
                { status: 400 }
            );
        }
        
        // Normalize HTS code to 6 digits
        const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
        
        // Get all cost data for this HTS
        const costData = await prisma.htsCostByCountry.findMany({
            where: {
                htsCode: hts6,
                confidenceScore: { gte: 25 },
            },
            orderBy: { avgUnitValue: 'asc' },
        });
        
        if (costData.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    htsCode: hts6,
                    currentCountry: null,
                    alternatives: [],
                    totalCountries: 0,
                    potentialSavings: null,
                } as QuickSourcingPreview,
            });
        }
        
        // Get supplier counts by country for this HTS chapter
        const htsChapter = hts6.substring(0, 2);
        const supplierCounts = await prisma.supplier.groupBy({
            by: ['countryCode'],
            where: {
                htsChapters: { has: htsChapter },
                isVerified: true,
            },
            _count: { id: true },
        });
        
        const supplierCountMap = new Map(
            supplierCounts.map(s => [s.countryCode, s._count.id])
        );
        
        // Calculate landed costs for each country
        const countryResults: Array<{
            code: string;
            name: string;
            flag: string;
            landedCost: number;
            effectiveTariff: number;
            supplierCount: number;
            hasFTA: boolean;
            ftaName?: string;
        }> = [];
        
        for (const record of costData) {
            const baseTariff = record.baseTariffRate || 5.0;
            const tariffs = calculateEffectiveTariff(baseTariff, record.countryCode, hts6);
            
            // Estimate shipping cost
            const shippingCosts: Record<string, number> = {
                'CN': 0.80, 'VN': 0.90, 'IN': 1.10, 'BD': 1.20, 'TH': 0.95,
                'ID': 1.00, 'MY': 0.90, 'TW': 0.85, 'KR': 0.80, 'JP': 0.75,
                'MX': 0.40, 'CA': 0.35, 'DE': 1.20, 'IT': 1.25, 'default': 1.00,
            };
            const shippingPerKg = shippingCosts[record.countryCode] || shippingCosts['default'];
            const shippingPerUnit = shippingPerKg * 0.5; // Assume 0.5kg per unit
            
            // Calculate landed cost
            const tariffAmount = record.avgUnitValue * (tariffs.effectiveRate / 100);
            const landedCost = record.avgUnitValue + shippingPerUnit + tariffAmount + 0.05; // +$0.05 fees estimate
            
            countryResults.push({
                code: record.countryCode,
                name: record.countryName,
                flag: COUNTRY_FLAGS[record.countryCode] || '🌍',
                landedCost: Math.round(landedCost * 100) / 100,
                effectiveTariff: tariffs.effectiveRate,
                supplierCount: supplierCountMap.get(record.countryCode) || 0,
                hasFTA: tariffs.ftaDiscount > 0,
                ftaName: FTA_NAMES[record.countryCode],
            });
        }
        
        // Sort by landed cost
        countryResults.sort((a, b) => a.landedCost - b.landedCost);
        
        // Find current country data
        const currentData = currentCountry
            ? countryResults.find(c => c.code === currentCountry)
            : null;
        
        // Calculate baseline for savings (use current country or China if not specified)
        const baseline = currentData || countryResults.find(c => c.code === 'CN') || countryResults[0];
        
        // Build alternatives (exclude current country, top 5)
        const alternatives = countryResults
            .filter(c => c.code !== currentCountry)
            .slice(0, 5)
            .map((c, index) => {
                const savingsAmount = baseline ? baseline.landedCost - c.landedCost : 0;
                const savingsPercent = baseline ? Math.round((savingsAmount / baseline.landedCost) * 100) : 0;
                
                return {
                    ...c,
                    savingsPercent,
                    savingsAmount: Math.round(savingsAmount * 100) / 100,
                    isRecommended: index === 0 && savingsPercent > 5,
                };
            });
        
        // Calculate potential savings
        const bestAlternative = alternatives.find(a => a.savingsPercent > 0);
        const potentialSavings = bestAlternative && baseline ? {
            percent: bestAlternative.savingsPercent,
            perUnit: bestAlternative.savingsAmount,
            annual: Math.round(bestAlternative.savingsAmount * annualUnits),
        } : null;
        
        const response: QuickSourcingPreview = {
            htsCode: hts6,
            currentCountry: currentData ? {
                code: currentData.code,
                name: currentData.name,
                flag: currentData.flag,
                landedCost: currentData.landedCost,
                effectiveTariff: currentData.effectiveTariff,
            } : null,
            alternatives,
            totalCountries: countryResults.length,
            potentialSavings,
        };
        
        return NextResponse.json({
            success: true,
            data: response,
        });
        
    } catch (error) {
        console.error('[API] Quick sourcing error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sourcing preview' },
            { status: 500 }
        );
    }
}



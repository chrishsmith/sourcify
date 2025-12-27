/**
 * Country Manufacturing Costs API
 * GET - Get cost data for all countries (powers the map)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const htsChapter = searchParams.get('htsChapter');

        const countries = await prisma.countryManufacturingCost.findMany({
            where: {
                ...(htsChapter ? { htsChapter } : { htsChapter: null }),
            },
            orderBy: { overallCostScore: 'desc' },
        });

        // Transform for map visualization
        const mapData = countries.map(c => ({
            countryCode: c.countryCode,
            countryName: c.countryName,
            
            // Cost indices (China = 100)
            laborCostIndex: c.laborCostIndex,
            overheadCostIndex: c.overheadCostIndex,
            shippingCostIndex: c.shippingCostIndex,
            
            // Tariff data
            baseTariffRate: c.baseTariffRate,
            additionalDuties: c.additionalDuties,
            effectiveTariffRate: c.effectiveTariffRate,
            hasFTA: c.hasFTA,
            ftaName: c.ftaName,
            
            // Transit
            typicalTransitDays: c.typicalTransitDays,
            
            // Risk & Quality
            politicalRiskScore: c.politicalRiskScore,
            supplyChainRisk: c.supplyChainRisk,
            qualityReputation: c.qualityReputation,
            
            // Overall score for ranking/coloring
            overallCostScore: c.overallCostScore,
            
            // Metadata
            lastUpdated: c.lastUpdated,
        }));

        // Also return summary stats
        const stats = {
            lowestCost: countries.sort((a, b) => a.laborCostIndex - b.laborCostIndex)[0]?.countryName,
            fastestShipping: countries.sort((a, b) => 
                (a.typicalTransitDays || 999) - (b.typicalTransitDays || 999)
            )[0]?.countryName,
            lowestTariff: countries.sort((a, b) => 
                (a.effectiveTariffRate || 0) - (b.effectiveTariffRate || 0)
            )[0]?.countryName,
            highestQuality: countries.sort((a, b) => 
                (b.qualityReputation || 0) - (a.qualityReputation || 0)
            )[0]?.countryName,
        };

        return NextResponse.json({
            countries: mapData,
            stats,
            total: countries.length,
        });
    } catch (error) {
        console.error('[API] Country costs error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch country costs' },
            { status: 500 }
        );
    }
}






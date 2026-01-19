/**
 * GET /api/sourcing/hts-costs
 * POST /api/sourcing/hts-costs/aggregate
 * 
 * Access and manage HTS cost data by country.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHtsCostData, aggregateAllHtsCosts, aggregateHtsCosts, saveAggregatedCosts } from '@/services/htsCostAggregation';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const htsCode = searchParams.get('htsCode');
        const country = searchParams.get('country');
        
        if (htsCode) {
            // Get cost data for specific HTS code
            const data = await getHtsCostData(htsCode);
            return NextResponse.json({
                success: true,
                data,
            });
        }
        
        // List available HTS codes with cost data
        const htsCodesWithData = await prisma.htsCostByCountry.findMany({
            distinct: ['htsCode'],
            select: {
                htsCode: true,
            },
            orderBy: { htsCode: 'asc' },
            take: 100,
        });
        
        // Get summary stats
        const stats = await prisma.htsCostByCountry.aggregate({
            _count: true,
        });
        
        const countryCount = await prisma.htsCostByCountry.findMany({
            distinct: ['countryCode'],
        });
        
        return NextResponse.json({
            success: true,
            data: {
                totalRecords: stats._count,
                uniqueHtsCodes: htsCodesWithData.length,
                uniqueCountries: countryCount.length,
                htsCodes: htsCodesWithData.map(h => h.htsCode),
            },
        });
        
    } catch (error) {
        console.error('[API] HTS costs error:', error);
        return NextResponse.json(
            { error: 'Failed to get HTS cost data' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const action = body.action;
        
        if (action === 'aggregate') {
            // Run aggregation for specific HTS or all
            if (body.htsCode) {
                console.log('[API] Aggregating costs for:', body.htsCode);
                const results = await aggregateHtsCosts(body.htsCode);
                const saved = await saveAggregatedCosts(results);
                
                return NextResponse.json({
                    success: true,
                    data: {
                        htsCode: body.htsCode,
                        countriesProcessed: results.length,
                        ...saved,
                    },
                });
            } else {
                // Aggregate all
                console.log('[API] Running full cost aggregation...');
                const stats = await aggregateAllHtsCosts();
                
                return NextResponse.json({
                    success: true,
                    data: stats,
                });
            }
        }
        
        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
        
    } catch (error) {
        console.error('[API] HTS costs aggregation error:', error);
        return NextResponse.json(
            { error: 'Failed to aggregate HTS costs' },
            { status: 500 }
        );
    }
}






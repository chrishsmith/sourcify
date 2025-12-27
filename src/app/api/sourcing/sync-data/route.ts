/**
 * POST /api/sourcing/sync-data
 * 
 * Fetches REAL import statistics from USITC DataWeb API
 * and syncs to database for sourcing analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getImportStatsByHTS, syncImportStatsToDatabase } from '@/services/usitcDataWeb';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { htsCode, forceRefresh } = body;
        
        if (!htsCode) {
            return NextResponse.json(
                { error: 'htsCode is required' },
                { status: 400 }
            );
        }
        
        const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
        
        // Check if we have recent data (within 7 days)
        if (!forceRefresh) {
            const existingData = await prisma.htsCostByCountry.findMany({
                where: {
                    htsCode: hts6,
                    lastCalculated: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            });
            
            if (existingData.length > 0) {
                return NextResponse.json({
                    success: true,
                    cached: true,
                    message: `Using cached data (${existingData.length} countries)`,
                    countries: existingData.length,
                });
            }
        }
        
        console.log('[API] Syncing import data for HTS:', hts6);
        
        // Fetch and sync data
        const result = await syncImportStatsToDatabase(hts6, prisma);
        
        return NextResponse.json({
            success: true,
            cached: false,
            message: `Synced ${result.synced} countries from USITC DataWeb`,
            synced: result.synced,
            errors: result.errors,
        });
        
    } catch (error) {
        console.error('[API] Sync error:', error);
        return NextResponse.json(
            { error: 'Failed to sync import data' },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch stats without saving
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const htsCode = searchParams.get('hts');
    
    if (!htsCode) {
        return NextResponse.json(
            { error: 'hts parameter is required' },
            { status: 400 }
        );
    }
    
    try {
        const stats = await getImportStatsByHTS(htsCode);
        
        return NextResponse.json({
            success: true,
            htsCode,
            countries: stats.length,
            data: stats,
        });
    } catch (error) {
        console.error('[API] Fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch import data' },
            { status: 500 }
        );
    }
}





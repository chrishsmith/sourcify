/**
 * Debug API to test live tariff rate fetching from USITC
 * 
 * GET /api/debug-tariffs?country=CN&hts=9503.00.00.90
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
    fetchLiveChapter99Rate, 
    fetchIEEPARatesForCountry,
    getLiveAdditionalDuties,
    getCacheStatus,
    clearRateCache,
    CHAPTER_99_PROGRAMS 
} from '@/services/compliance/chapter99';
import { searchHTSCodes } from '@/services/usitc';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country') || 'CN';
    const hts = searchParams.get('hts') || '9503.00.00.90';
    const refresh = searchParams.get('refresh') === 'true';
    const testCode = searchParams.get('testCode');

    if (refresh) {
        clearRateCache();
    }

    try {
        const results: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            requestedCountry: country,
            requestedHTS: hts,
            cacheStatus: getCacheStatus(),
        };

        // If testing a specific Chapter 99 code
        if (testCode) {
            console.log(`[Debug] Testing specific code: ${testCode}`);
            const rate = await fetchLiveChapter99Rate(testCode);
            results.specificCode = {
                requested: testCode,
                result: rate,
            };
            return NextResponse.json(results);
        }

        // Test IEEPA rates for country
        console.log(`[Debug] Fetching IEEPA rates for ${country}...`);
        const ieepaRates = await fetchIEEPARatesForCountry(country);
        results.ieepaRates = ieepaRates;

        // Test full additional duties calculation
        console.log(`[Debug] Fetching all additional duties for ${hts} from ${country}...`);
        const allDuties = await getLiveAdditionalDuties(hts, country);
        results.additionalDuties = allDuties;

        // Search for Chapter 99 codes to see what's in the HTS
        console.log('[Debug] Searching Chapter 99 codes...');
        
        // Search for key Chapter 99 codes
        const chapter99Searches = await Promise.all([
            searchHTSCodes('9903.88'),  // Section 301
            searchHTSCodes('9903.01'),  // IEEPA
            searchHTSCodes('9903.80'),  // Section 232 Steel
        ]);

        results.chapter99Data = {
            section301Codes: chapter99Searches[0]?.slice(0, 10) || [],
            ieepaCodes: chapter99Searches[1]?.slice(0, 10) || [],
            section232SteelCodes: chapter99Searches[2]?.slice(0, 5) || [],
        };

        // List known programs
        results.knownPrograms = CHAPTER_99_PROGRAMS;

        return NextResponse.json(results, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('[Debug] Error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch tariff data',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}



/**
 * Tariff Registry Sync API
 * 
 * Syncs country tariff data from official government sources.
 * Uses LIVE data from USITC HTS API, Federal Register, and more.
 * 
 * POST /api/tariff-registry/sync
 * Query params:
 *   - type: 'countries' | 'rates' | 'federal-register' | 'all' (default: all)
 * 
 * GET /api/tariff-registry/sync
 *   Returns current registry stats and available endpoints
 * 
 * Data Sources:
 * - ISO 3166-1: Complete list of all countries (196 UN members + territories)
 * - USTR FTA List: Official US Free Trade Agreement partners
 * - OFAC: Sanctioned countries list
 * - USITC HTS API: Chapter 99 live tariff rates (Section 301, IEEPA, 232)
 * - Federal Register API: Executive orders and tariff announcements
 * 
 * @see docs/ARCHITECTURE_TARIFF_REGISTRY.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
    syncAllCountries, 
    syncTariffRatesFromUSITC,
    syncFromFederalRegister,
    syncTariffRegistry,
    syncAllDataSources,
    syncADCVDWarnings,
    getRegistryStats,
} from '@/services/tariff/registry-sync';

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'all';
    
    console.log(`\n🔄 Tariff Registry Sync Started: ${syncType}\n`);
    const startTime = Date.now();
    
    try {
        // For 'comprehensive' type, use ALL data sources
        if (syncType === 'comprehensive') {
            const result = await syncAllDataSources();
            const stats = await getRegistryStats();
            
            return NextResponse.json({
                success: true,
                syncType: 'comprehensive',
                startedAt: new Date(startTime).toISOString(),
                completedAt: new Date().toISOString(),
                durationMs: result.totalDuration,
                countries: result.countries,
                rates: result.tariffRates,
                federalRegister: result.federalRegister,
                adcvd: result.adcvd,
                dataSources: result.dataSources,
                finalStats: stats,
            });
        }
        
        // For 'all' type, use the standard sync function
        if (syncType === 'all') {
            const result = await syncTariffRegistry();
            const stats = await getRegistryStats();
            
            return NextResponse.json({
                success: true,
                syncType: 'all',
                startedAt: new Date(startTime).toISOString(),
                completedAt: new Date().toISOString(),
                durationMs: result.totalDuration,
                countries: result.countries,
                rates: result.tariffRates,
                federalRegister: result.federalRegister,
                finalStats: stats,
            });
        }
        
        // For individual sync types
        const results: Record<string, unknown> = {
            syncType,
            startedAt: new Date().toISOString(),
        };
        
        // Sync countries only
        if (syncType === 'countries') {
            console.log('📍 Syncing all countries from ISO 3166-1...');
            const countryResult = await syncAllCountries();
            results.countries = countryResult;
        }
        
        // Sync tariff rates from USITC only
        if (syncType === 'rates') {
            console.log('📍 Syncing tariff rates from USITC Chapter 99 API...');
            const ratesResult = await syncTariffRatesFromUSITC();
            results.rates = ratesResult;
        }
        
        // Check Federal Register only
        if (syncType === 'federal-register') {
            console.log('📍 Checking Federal Register for new tariff rules...');
            const frResult = await syncFromFederalRegister();
            results.federalRegister = frResult;
        }
        
        // Sync AD/CVD warnings only
        if (syncType === 'adcvd') {
            console.log('📍 Syncing AD/CVD warnings...');
            const adcvdResult = await syncADCVDWarnings();
            results.adcvd = adcvdResult;
        }
        
        // Get final stats
        const stats = await getRegistryStats();
        results.finalStats = stats;
        
        const duration = Date.now() - startTime;
        results.completedAt = new Date().toISOString();
        results.durationMs = duration;
        
        console.log(`\n✅ Sync complete in ${duration}ms\n`);
        
        return NextResponse.json({
            success: true,
            ...results,
        });
        
    } catch (error) {
        console.error('❌ Sync failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' 
                ? (error instanceof Error ? error.stack : undefined)
                : undefined,
        }, { status: 500 });
    }
}

export async function GET() {
    // Return current stats and available endpoints
    try {
        const stats = await getRegistryStats();
        
        return NextResponse.json({
            success: true,
            stats: {
                ...stats,
                lastSyncTime: stats.lastSyncTime?.toISOString() ?? 'Never',
            },
            endpoints: {
                syncComprehensive: 'POST /api/tariff-registry/sync?type=comprehensive (ALL data sources)',
                syncAll: 'POST /api/tariff-registry/sync?type=all (standard sync)',
                syncCountries: 'POST /api/tariff-registry/sync?type=countries',
                syncRates: 'POST /api/tariff-registry/sync?type=rates',
                syncFederalRegister: 'POST /api/tariff-registry/sync?type=federal-register',
                syncAdcvd: 'POST /api/tariff-registry/sync?type=adcvd',
            },
            dataSources: stats.dataSources,
            architecture: 'See docs/ARCHITECTURE_TARIFF_REGISTRY.md',
        });
        
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}


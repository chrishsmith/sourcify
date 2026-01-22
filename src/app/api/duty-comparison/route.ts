/**
 * Duty Comparison API Endpoint
 * 
 * Fetches duty rates for the same HTS code across multiple countries
 * 
 * POST /api/duty-comparison
 * Body: { htsCode, baseMfnRate?, countries: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveTariff, type EffectiveTariffResult } from '@/services/tariffRegistry';

export const dynamic = 'force-dynamic';

// All supported countries for comparison
export const COMPARISON_COUNTRIES = [
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
];

export interface CountryDutyComparison {
    countryCode: string;
    countryName: string;
    flag: string;
    effectiveRate: number;
    baseMfnRate: number;
    ieepaRate: number;
    section301Rate: number;
    section232Rate: number;
    hasFta: boolean;
    ftaName: string | null;
    ftaDiscount: number;
    breakdownSummary: string;
    warnings: string[];
    savingsVsCurrent?: number;
    isBestOption?: boolean;
    tradeStatus: string;
}

export interface DutyComparisonResponse {
    success: boolean;
    htsCode: string;
    baseMfnRate: number;
    currentCountry?: string;
    currentRate?: number;
    comparisons: CountryDutyComparison[];
    bestOption?: CountryDutyComparison;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DutyComparisonResponse>> {
    const startTime = Date.now();
    
    try {
        const body = await request.json();
        const { 
            htsCode, 
            baseMfnRate = 0, 
            countries,
            currentCountry,
            currentRate,
        } = body;
        
        if (!htsCode || typeof htsCode !== 'string') {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'HTS code is required',
                    htsCode: '',
                    baseMfnRate: 0,
                    comparisons: [],
                },
                { status: 400 }
            );
        }
        
        // Use provided countries or default top 5
        const countriesToCompare = countries && countries.length > 0 
            ? countries 
            : ['CN', 'VN', 'IN', 'MX', 'TH'];
        
        console.log(`[DutyComparison] Comparing ${htsCode} across ${countriesToCompare.length} countries`);
        
        // Fetch duty rates for all countries in parallel
        const dutyPromises = countriesToCompare.map(async (countryCode: string) => {
            const countryInfo = COMPARISON_COUNTRIES.find(c => c.code === countryCode) || {
                code: countryCode,
                name: countryCode,
                flag: '🌍',
            };
            
            try {
                const result = await getEffectiveTariff(countryCode, htsCode, {
                    baseMfnRate,
                    includeSection232: true,
                });
                
                return {
                    countryCode: result.countryCode,
                    countryName: result.countryName || countryInfo.name,
                    flag: countryInfo.flag,
                    effectiveRate: result.effectiveRate,
                    baseMfnRate: result.baseMfnRate,
                    ieepaRate: result.ieepaRate,
                    section301Rate: result.section301Rate,
                    section232Rate: result.section232Rate,
                    hasFta: result.hasFta,
                    ftaName: result.ftaName,
                    ftaDiscount: result.ftaDiscount,
                    breakdownSummary: formatBreakdownSummary(result),
                    warnings: result.warnings,
                    tradeStatus: result.tradeStatus,
                };
            } catch (error) {
                console.error(`[DutyComparison] Error for ${countryCode}:`, error);
                return {
                    countryCode,
                    countryName: countryInfo.name,
                    flag: countryInfo.flag,
                    effectiveRate: baseMfnRate,
                    baseMfnRate,
                    ieepaRate: 0,
                    section301Rate: 0,
                    section232Rate: 0,
                    hasFta: false,
                    ftaName: null,
                    ftaDiscount: 0,
                    breakdownSummary: 'Error fetching data',
                    warnings: ['Could not fetch tariff data'],
                    tradeStatus: 'unknown',
                };
            }
        });
        
        const comparisons = await Promise.all(dutyPromises);
        
        // Calculate savings vs current country
        if (currentCountry && currentRate !== undefined) {
            comparisons.forEach(c => {
                c.savingsVsCurrent = currentRate - c.effectiveRate;
            });
        }
        
        // Find the best option (lowest effective rate)
        const sortedComparisons = [...comparisons].sort((a, b) => a.effectiveRate - b.effectiveRate);
        const bestOption = sortedComparisons[0];
        
        // Mark best option
        comparisons.forEach(c => {
            c.isBestOption = c.countryCode === bestOption.countryCode;
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`[DutyComparison] Complete in ${totalTime}ms for ${comparisons.length} countries`);
        
        return NextResponse.json({
            success: true,
            htsCode,
            baseMfnRate,
            currentCountry,
            currentRate,
            comparisons,
            bestOption,
        });
        
    } catch (error) {
        console.error('[DutyComparison] Error:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Comparison failed',
                htsCode: '',
                baseMfnRate: 0,
                comparisons: [],
            },
            { status: 500 }
        );
    }
}

/**
 * Format a breakdown summary string for display
 */
function formatBreakdownSummary(result: EffectiveTariffResult): string {
    const parts: string[] = [];
    
    if (result.baseMfnRate > 0) {
        parts.push(`Base ${result.baseMfnRate}%`);
    }
    
    if (result.ftaDiscount > 0) {
        parts.push(`FTA -${result.ftaDiscount}%`);
    }
    
    if (result.ieepaRate > 0) {
        parts.push(`IEEPA +${result.ieepaRate}%`);
    }
    
    if (result.section301Rate > 0) {
        parts.push(`301 +${result.section301Rate}%`);
    }
    
    if (result.section232Rate > 0) {
        parts.push(`232 +${result.section232Rate}%`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'Free';
}

/**
 * GET endpoint to get list of available countries for comparison
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        success: true,
        countries: COMPARISON_COUNTRIES,
    });
}

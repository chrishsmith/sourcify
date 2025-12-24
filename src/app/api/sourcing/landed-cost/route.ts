/**
 * GET /api/sourcing/landed-cost
 * 
 * Calculate and compare landed costs across countries for an HTS code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
    compareLandedCosts, 
    calculateLandedCost,
    getQuickCostComparison 
} from '@/services/landedCost';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const htsCode = searchParams.get('htsCode');
        const country = searchParams.get('country');
        const mode = searchParams.get('mode') || 'comparison'; // 'single' | 'comparison' | 'quick'
        
        if (!htsCode) {
            return NextResponse.json(
                { error: 'htsCode query parameter is required' },
                { status: 400 }
            );
        }
        
        // Optional parameters
        const quantity = parseInt(searchParams.get('quantity') || '1000');
        const weight = parseFloat(searchParams.get('weightPerUnit') || '0.5');
        const minConfidence = parseInt(searchParams.get('minConfidence') || '20');
        
        if (mode === 'single' && country) {
            // Calculate landed cost for specific country
            const result = await calculateLandedCost(htsCode, country, quantity, weight);
            
            if (!result) {
                return NextResponse.json(
                    { error: 'No cost data available for this HTS/country combination' },
                    { status: 404 }
                );
            }
            
            return NextResponse.json({
                success: true,
                data: result,
            });
        }
        
        if (mode === 'quick') {
            // Quick comparison summary
            const result = await getQuickCostComparison(htsCode, country || undefined);
            
            return NextResponse.json({
                success: true,
                data: result,
            });
        }
        
        // Full comparison across countries
        const excludeCountries = searchParams.get('exclude')?.split(',');
        const includeCountries = searchParams.get('include')?.split(',');
        
        const comparison = await compareLandedCosts(htsCode, {
            quantity,
            weightPerUnitKg: weight,
            minConfidence,
            excludeCountries,
            includeCountries,
        });
        
        return NextResponse.json({
            success: true,
            data: comparison,
        });
        
    } catch (error) {
        console.error('[API] Landed cost error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate landed costs' },
            { status: 500 }
        );
    }
}



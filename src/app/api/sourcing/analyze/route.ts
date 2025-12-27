/**
 * POST /api/sourcing/analyze
 * 
 * Generate comprehensive sourcing recommendations for a product.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSourcingRecommendations, SourcingAnalysisInput } from '@/services/sourcingAdvisor';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.htsCode) {
            return NextResponse.json(
                { error: 'htsCode is required' },
                { status: 400 }
            );
        }
        
        const input: SourcingAnalysisInput = {
            htsCode: body.htsCode,
            productDescription: body.productDescription,
            currentCountry: body.currentCountry,
            materials: body.materials,
            requiredCertifications: body.requiredCertifications,
            annualVolume: body.annualVolume,
            prioritizeFTA: body.prioritizeFTA ?? true,
            excludeCountries: body.excludeCountries,
        };
        
        console.log('[API] Sourcing analysis request:', input.htsCode);
        
        const recommendations = await generateSourcingRecommendations(input);
        
        return NextResponse.json({
            success: true,
            data: recommendations,
        });
        
    } catch (error) {
        console.error('[API] Sourcing analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to generate sourcing recommendations' },
            { status: 500 }
        );
    }
}





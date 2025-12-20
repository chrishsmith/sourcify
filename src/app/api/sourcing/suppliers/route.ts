/**
 * POST /api/sourcing/suppliers
 * 
 * Find matching suppliers for given criteria.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findMatchingSuppliers, MatchCriteria } from '@/services/supplierMatching';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const criteria: MatchCriteria = {
            htsCode: body.htsCode,
            productDescription: body.productDescription,
            materials: body.materials,
            requiredCertifications: body.requiredCertifications,
            preferredCountries: body.preferredCountries,
            excludeCountries: body.excludeCountries,
            minOrderQuantity: body.minOrderQuantity,
            maxLeadDays: body.maxLeadDays,
            preferFTA: body.preferFTA ?? true,
            minVerificationScore: body.minVerificationScore,
        };
        
        const limit = body.limit || 20;
        
        console.log('[API] Supplier matching request:', criteria.htsCode);
        
        const result = await findMatchingSuppliers(criteria, limit);
        
        return NextResponse.json({
            success: true,
            data: {
                matches: result.matches,
                totalFound: result.totalFound,
                searchTime: result.searchTime,
            },
        });
        
    } catch (error) {
        console.error('[API] Supplier matching error:', error);
        return NextResponse.json(
            { error: 'Failed to find matching suppliers' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const htsCode = searchParams.get('htsCode');
        
        if (!htsCode) {
            return NextResponse.json(
                { error: 'htsCode query parameter is required' },
                { status: 400 }
            );
        }
        
        const criteria: MatchCriteria = {
            htsCode,
            preferFTA: searchParams.get('preferFTA') !== 'false',
            excludeCountries: searchParams.get('excludeCountries')?.split(','),
            minVerificationScore: parseInt(searchParams.get('minScore') || '0') || undefined,
        };
        
        const limit = parseInt(searchParams.get('limit') || '20');
        
        const result = await findMatchingSuppliers(criteria, limit);
        
        return NextResponse.json({
            success: true,
            data: {
                matches: result.matches,
                totalFound: result.totalFound,
            },
        });
        
    } catch (error) {
        console.error('[API] Supplier matching error:', error);
        return NextResponse.json(
            { error: 'Failed to find matching suppliers' },
            { status: 500 }
        );
    }
}

/**
 * Suppliers API
 * GET - Search and list suppliers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Filters
        const query = searchParams.get('q');
        const country = searchParams.get('country');
        const htsChapter = searchParams.get('htsChapter');
        const category = searchParams.get('category');
        const verifiedOnly = searchParams.get('verifiedOnly') === 'true';
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const sortBy = searchParams.get('sortBy') || 'overallScore';

        // Build where clause
        const where: Record<string, unknown> = {};
        
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { materials: { hasSome: [query] } },
            ];
        }
        
        if (country) {
            where.countryCode = country;
        }
        
        if (htsChapter) {
            where.htsChapters = { has: htsChapter };
        }
        
        if (category) {
            where.productCategories = { has: category };
        }
        
        if (verifiedOnly) {
            where.isVerified = true;
        }

        // Build orderBy
        const orderBy: Record<string, 'asc' | 'desc'> = {};
        switch (sortBy) {
            case 'cost':
                // Sort by cost tier (LOW first)
                orderBy.costTier = 'asc';
                break;
            case 'quality':
                orderBy.qualityScore = 'desc';
                break;
            case 'reliability':
                orderBy.reliabilityScore = 'desc';
                break;
            default:
                orderBy.overallScore = 'desc';
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy,
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    website: true,
                    countryCode: true,
                    countryName: true,
                    region: true,
                    city: true,
                    productCategories: true,
                    htsChapters: true,
                    materials: true,
                    certifications: true,
                    isVerified: true,
                    tier: true,
                    reliabilityScore: true,
                    qualityScore: true,
                    communicationScore: true,
                    overallScore: true,
                    costTier: true,
                    minOrderValue: true,
                    typicalLeadDays: true,
                    employeeCount: true,
                },
            }),
            prisma.supplier.count({ where }),
        ]);

        // Get aggregations for filters
        const countries = await prisma.supplier.groupBy({
            by: ['countryCode', 'countryName'],
            _count: true,
        });

        return NextResponse.json({
            suppliers,
            total,
            limit,
            offset,
            hasMore: offset + suppliers.length < total,
            filters: {
                countries: countries.map(c => ({
                    code: c.countryCode,
                    name: c.countryName,
                    count: c._count,
                })),
            },
        });
    } catch (error) {
        console.error('[API] Suppliers error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch suppliers' },
            { status: 500 }
        );
    }
}


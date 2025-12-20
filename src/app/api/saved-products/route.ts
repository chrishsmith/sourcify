/**
 * Saved Products API
 * GET - List user's saved products
 * POST - Save a new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getServices() {
    const { getSavedProducts, getSavedProductStats, saveProductDirect } = await import('@/services/savedProducts');
    return { getSavedProducts, getSavedProductStats, saveProductDirect };
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({
                items: [],
                total: 0,
                message: 'Sign in to view your saved products',
            });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const search = searchParams.get('search') || undefined;
        const favoritesOnly = searchParams.get('favoritesOnly') === 'true';
        const monitoredOnly = searchParams.get('monitoredOnly') === 'true';
        const includeStats = searchParams.get('includeStats') === 'true';

        try {
            const { getSavedProducts, getSavedProductStats } = await getServices();

            const { items, total } = await getSavedProducts(session.user.id, {
                limit,
                offset,
                search,
                favoritesOnly,
                monitoredOnly,
            });

            let stats = null;
            if (includeStats) {
                stats = await getSavedProductStats(session.user.id);
            }

            return NextResponse.json({
                items,
                total,
                limit,
                offset,
                hasMore: offset + items.length < total,
                ...(stats && { stats }),
            });
        } catch (dbError: unknown) {
            const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
            if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
                console.warn('[API] Saved products table not yet created. Run migrations.');
                return NextResponse.json({
                    items: [],
                    total: 0,
                    message: 'Database migration pending',
                });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('[API] Saved products error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch saved products', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { saveProductDirect } = await getServices();

        const productId = await saveProductDirect(session.user.id, {
            name: body.name,
            description: body.description,
            sku: body.sku,
            htsCode: body.htsCode,
            htsDescription: body.htsDescription,
            countryOfOrigin: body.countryOfOrigin,
            materialComposition: body.materialComposition,
            intendedUse: body.intendedUse,
            baseDutyRate: body.baseDutyRate,
            effectiveDutyRate: body.effectiveDutyRate,
            latestClassification: body.latestClassification,
            isMonitored: body.isMonitored,
            isFavorite: body.isFavorite,
        });

        return NextResponse.json({
            success: true,
            id: productId,
        });
    } catch (error) {
        console.error('[API] Save product error:', error);
        return NextResponse.json(
            { error: 'Failed to save product' },
            { status: 500 }
        );
    }
}

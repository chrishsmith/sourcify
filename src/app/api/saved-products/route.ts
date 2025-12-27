/**
 * Saved Products API
 * GET - List user's saved products (with optional tariff enrichment)
 * POST - Save a new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getServices() {
    const { getSavedProducts, getSavedProductStats, saveProductDirect } = await import('@/services/savedProducts');
    return { getSavedProducts, getSavedProductStats, saveProductDirect };
}

async function getTariffRegistry() {
    const { getEffectiveTariff } = await import('@/services/tariffRegistry');
    return { getEffectiveTariff };
}

async function getAlertService() {
    const { getUserAlerts } = await import('@/services/tariffAlerts');
    return { getUserAlerts };
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
        const includeTariffData = searchParams.get('includeTariffData') === 'true';

        try {
            const { getSavedProducts, getSavedProductStats } = await getServices();

            const { items, total } = await getSavedProducts(session.user.id, {
                limit,
                offset,
                search,
                favoritesOnly,
                monitoredOnly,
            });

            // Enrich with tariff data if requested
            let enrichedItems = items;
            if (includeTariffData && items.length > 0) {
                const { getEffectiveTariff } = await getTariffRegistry();
                
                enrichedItems = await Promise.all(
                    items.map(async (item) => {
                        if (!item.countryOfOrigin || !item.htsCode) {
                            return item;
                        }

                        try {
                            const tariffResult = await getEffectiveTariff(
                                item.countryOfOrigin,
                                item.htsCode,
                                { 
                                    baseMfnRate: item.baseDutyRate 
                                        ? parseFloat(item.baseDutyRate.replace('%', '')) 
                                        : 0 
                                }
                            );

                            // Calculate change from stored rate
                            const previousRate = item.effectiveDutyRate;
                            const currentRate = tariffResult.effectiveRate;
                            const changePercent = previousRate !== null && previousRate > 0
                                ? ((currentRate - previousRate) / previousRate) * 100
                                : null;

                            return {
                                ...item,
                                tariffData: {
                                    currentRate,
                                    previousRate,
                                    changePercent,
                                    breakdown: tariffResult.breakdown,
                                    warnings: tariffResult.warnings,
                                    hasFta: tariffResult.hasFta,
                                    ftaName: tariffResult.ftaName,
                                    tradeStatus: tariffResult.tradeStatus,
                                    lastUpdated: tariffResult.lastVerified.toISOString(),
                                },
                            };
                        } catch (err) {
                            console.error(`[API] Tariff enrichment failed for ${item.id}:`, err);
                            return item;
                        }
                    })
                );
            }

            let stats = null;
            if (includeStats) {
                stats = await getSavedProductStats(session.user.id);
            }

            return NextResponse.json({
                items: enrichedItems,
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






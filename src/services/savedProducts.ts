/**
 * Saved Products Service
 * 
 * Manages products that users explicitly save to their account.
 * These are products they import regularly and want to monitor.
 */

import { prisma } from '@/lib/db';
import type { ClassificationResult } from '@/types/classification.types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SavedProductItem {
    id: string;
    name: string;
    description: string;
    sku: string | null;
    htsCode: string;
    htsDescription: string;
    countryOfOrigin: string | null;
    baseDutyRate: string | null;
    effectiveDutyRate: number | null;
    isMonitored: boolean;
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SavedProductDetail extends SavedProductItem {
    materialComposition: string | null;
    intendedUse: string | null;
    latestClassification: ClassificationResult | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVE PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save a product to user's library from a classification result
 */
export async function saveProduct(
    userId: string,
    result: ClassificationResult,
    options?: {
        name?: string;
        isMonitored?: boolean;
        isFavorite?: boolean;
    }
): Promise<string> {
    const effectiveRate = result.effectiveTariff?.totalAdValorem ?? null;

    const savedProduct = await prisma.savedProduct.create({
        data: {
            userId,
            name: options?.name || result.input.productName || 'Untitled Product',
            description: result.input.productDescription,
            sku: result.input.productSku || null,
            htsCode: result.htsCode.code,
            htsDescription: result.htsCode.description,
            countryOfOrigin: result.input.countryOfOrigin || null,
            materialComposition: result.input.materialComposition || null,
            intendedUse: result.input.intendedUse || null,
            baseDutyRate: result.dutyRate.generalRate,
            effectiveDutyRate: effectiveRate,
            latestClassification: result as unknown as Record<string, unknown>,
            isMonitored: options?.isMonitored ?? false,
            isFavorite: options?.isFavorite ?? false,
        },
    });

    console.log('[SavedProducts] Saved product:', savedProduct.id);
    return savedProduct.id;
}

/**
 * Save product directly (without classification result)
 */
export async function saveProductDirect(
    userId: string,
    data: {
        name: string;
        description: string;
        sku?: string;
        htsCode: string;
        htsDescription: string;
        countryOfOrigin?: string;
        materialComposition?: string;
        intendedUse?: string;
        baseDutyRate?: string;
        effectiveDutyRate?: number;
        latestClassification?: ClassificationResult;
        isMonitored?: boolean;
        isFavorite?: boolean;
    }
): Promise<string> {
    const savedProduct = await prisma.savedProduct.create({
        data: {
            userId,
            name: data.name,
            description: data.description,
            sku: data.sku || null,
            htsCode: data.htsCode,
            htsDescription: data.htsDescription,
            countryOfOrigin: data.countryOfOrigin || null,
            materialComposition: data.materialComposition || null,
            intendedUse: data.intendedUse || null,
            baseDutyRate: data.baseDutyRate || null,
            effectiveDutyRate: data.effectiveDutyRate ?? null,
            latestClassification: data.latestClassification as unknown as Record<string, unknown> || null,
            isMonitored: data.isMonitored ?? false,
            isFavorite: data.isFavorite ?? false,
        },
    });

    return savedProduct.id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get saved products for a user
 */
export async function getSavedProducts(
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
        search?: string;
        favoritesOnly?: boolean;
        monitoredOnly?: boolean;
    }
): Promise<{ items: SavedProductItem[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where = {
        userId,
        ...(options?.favoritesOnly && { isFavorite: true }),
        ...(options?.monitoredOnly && { isMonitored: true }),
        ...(options?.search && {
            OR: [
                { name: { contains: options.search, mode: 'insensitive' as const } },
                { description: { contains: options.search, mode: 'insensitive' as const } },
                { htsCode: { contains: options.search } },
                { sku: { contains: options.search, mode: 'insensitive' as const } },
            ],
        }),
    };

    const [items, total] = await Promise.all([
        prisma.savedProduct.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                name: true,
                description: true,
                sku: true,
                htsCode: true,
                htsDescription: true,
                countryOfOrigin: true,
                baseDutyRate: true,
                effectiveDutyRate: true,
                isMonitored: true,
                isFavorite: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        prisma.savedProduct.count({ where }),
    ]);

    return { items, total };
}

/**
 * Get a single saved product with full details
 */
export async function getSavedProductDetail(
    id: string,
    userId: string
): Promise<SavedProductDetail | null> {
    const product = await prisma.savedProduct.findFirst({
        where: { id, userId },
    });

    if (!product) return null;

    return {
        ...product,
        latestClassification: product.latestClassification as unknown as ClassificationResult | null,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update a saved product
 */
export async function updateSavedProduct(
    id: string,
    userId: string,
    data: {
        name?: string;
        isMonitored?: boolean;
        isFavorite?: boolean;
    }
): Promise<boolean> {
    const result = await prisma.savedProduct.updateMany({
        where: { id, userId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.isMonitored !== undefined && { isMonitored: data.isMonitored }),
            ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
}

/**
 * Update the classification for a saved product
 */
export async function updateProductClassification(
    id: string,
    userId: string,
    result: ClassificationResult
): Promise<boolean> {
    const effectiveRate = result.effectiveTariff?.totalAdValorem ?? null;

    const updateResult = await prisma.savedProduct.updateMany({
        where: { id, userId },
        data: {
            htsCode: result.htsCode.code,
            htsDescription: result.htsCode.description,
            baseDutyRate: result.dutyRate.generalRate,
            effectiveDutyRate: effectiveRate,
            latestClassification: result as unknown as Record<string, unknown>,
            updatedAt: new Date(),
        },
    });

    return updateResult.count > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delete a saved product
 */
export async function deleteSavedProduct(id: string, userId: string): Promise<boolean> {
    const result = await prisma.savedProduct.deleteMany({
        where: { id, userId },
    });

    return result.count > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get stats for saved products
 */
export async function getSavedProductStats(userId: string): Promise<{
    totalProducts: number;
    monitoredProducts: number;
    favoriteProducts: number;
    uniqueHtsCodes: number;
}> {
    const stats = await prisma.$queryRaw<Array<{
        total_products: bigint;
        monitored_products: bigint;
        favorite_products: bigint;
        unique_hts_codes: bigint;
    }>>`
        SELECT 
            COUNT(*) as total_products,
            COUNT(*) FILTER (WHERE "isMonitored" = true) as monitored_products,
            COUNT(*) FILTER (WHERE "isFavorite" = true) as favorite_products,
            COUNT(DISTINCT "htsCode") as unique_hts_codes
        FROM saved_product
        WHERE "userId" = ${userId}
    `;

    const result = stats[0] || { 
        total_products: 0n, 
        monitored_products: 0n, 
        favorite_products: 0n, 
        unique_hts_codes: 0n 
    };

    return {
        totalProducts: Number(result.total_products),
        monitoredProducts: Number(result.monitored_products),
        favoriteProducts: Number(result.favorite_products),
        uniqueHtsCodes: Number(result.unique_hts_codes),
    };
}





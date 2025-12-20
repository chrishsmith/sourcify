/**
 * Search History Service
 * 
 * Manages the persistence of classification searches.
 * Every search is saved so users can view their history and we can upsell suppliers.
 */

import { prisma } from '@/lib/db';
import type { ClassificationResult, ClassificationInput } from '@/types/classification.types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SearchHistoryItem {
    id: string;
    productName: string | null;
    productDescription: string;
    countryOfOrigin: string | null;
    materialComposition: string | null;
    htsCode: string;
    htsDescription: string;
    confidence: number;
    baseDutyRate: string | null;
    effectiveRate: number | null;
    hasAdditionalDuties: boolean;
    createdAt: Date;
}

export interface SearchHistoryDetail extends SearchHistoryItem {
    productSku: string | null;
    intendedUse: string | null;
    fullResult: ClassificationResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVE SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save a classification search to history
 * Called after every successful classification
 */
export async function saveSearchToHistory(
    input: ClassificationInput,
    result: ClassificationResult,
    userId?: string,
    options?: {
        searchType?: 'SINGLE' | 'BULK_CSV' | 'API';
        batchId?: string;
    }
): Promise<string> {
    try {
        const effectiveRate = result.effectiveTariff?.totalAdValorem ?? null;
        const hasAdditionalDuties = (result.effectiveTariff?.additionalDuties?.length ?? 0) > 0;

        const searchHistory = await prisma.searchHistory.create({
            data: {
                userId: userId || null,
                
                // Input
                productName: input.productName || null,
                productSku: input.productSku || null,
                productDescription: input.productDescription,
                countryOfOrigin: input.countryOfOrigin || null,
                materialComposition: input.materialComposition || null,
                intendedUse: input.intendedUse || null,
                
                // Result
                htsCode: result.htsCode.code,
                htsDescription: result.htsCode.description,
                confidence: result.confidence,
                fullResult: result as unknown as Record<string, unknown>,
                
                // Quick access fields
                baseDutyRate: result.dutyRate.generalRate,
                effectiveRate: effectiveRate,
                hasAdditionalDuties: hasAdditionalDuties,
                
                // Metadata
                status: 'COMPLETED',
                searchType: options?.searchType || 'SINGLE',
                batchId: options?.batchId || null,
            },
        });

        console.log('[SearchHistory] Saved search:', searchHistory.id);
        return searchHistory.id;
    } catch (error) {
        console.error('[SearchHistory] Failed to save search:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get search history for a user
 */
export async function getSearchHistory(
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
        htsCode?: string;
    }
): Promise<{ items: SearchHistoryItem[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where = {
        userId,
        ...(options?.htsCode && { htsCode: { startsWith: options.htsCode } }),
    };

    const [items, total] = await Promise.all([
        prisma.searchHistory.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                productName: true,
                productDescription: true,
                countryOfOrigin: true,
                materialComposition: true,
                htsCode: true,
                htsDescription: true,
                confidence: true,
                baseDutyRate: true,
                effectiveRate: true,
                hasAdditionalDuties: true,
                createdAt: true,
            },
        }),
        prisma.searchHistory.count({ where }),
    ]);

    return { items, total };
}

/**
 * Get a single search history item with full details
 */
export async function getSearchHistoryDetail(
    id: string,
    userId?: string
): Promise<SearchHistoryDetail | null> {
    const searchHistory = await prisma.searchHistory.findFirst({
        where: {
            id,
            ...(userId && { userId }),
        },
    });

    if (!searchHistory) return null;

    return {
        id: searchHistory.id,
        productName: searchHistory.productName,
        productSku: searchHistory.productSku,
        productDescription: searchHistory.productDescription,
        countryOfOrigin: searchHistory.countryOfOrigin,
        materialComposition: searchHistory.materialComposition,
        intendedUse: searchHistory.intendedUse,
        htsCode: searchHistory.htsCode,
        htsDescription: searchHistory.htsDescription,
        confidence: searchHistory.confidence,
        baseDutyRate: searchHistory.baseDutyRate,
        effectiveRate: searchHistory.effectiveRate,
        hasAdditionalDuties: searchHistory.hasAdditionalDuties,
        createdAt: searchHistory.createdAt,
        fullResult: searchHistory.fullResult as unknown as ClassificationResult,
    };
}

/**
 * Get recent searches (for anonymous users, uses session storage)
 * For logged-in users, use getSearchHistory instead
 */
export async function getRecentSearches(
    limit: number = 5,
    userId?: string
): Promise<SearchHistoryItem[]> {
    if (!userId) {
        return []; // Anonymous users get nothing from DB
    }

    const items = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            productName: true,
            productDescription: true,
            countryOfOrigin: true,
            materialComposition: true,
            htsCode: true,
            htsDescription: true,
            confidence: true,
            baseDutyRate: true,
            effectiveRate: true,
            hasAdditionalDuties: true,
            createdAt: true,
        },
    });

    return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get stats for dashboard (optimized with single raw query)
 */
export async function getSearchStats(userId: string): Promise<{
    totalSearches: number;
    uniqueHtsCodes: number;
    avgConfidence: number;
    searchesThisMonth: number;
}> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Use a single optimized query instead of multiple round-trips
    const stats = await prisma.$queryRaw<Array<{
        total_searches: bigint;
        unique_hts_codes: bigint;
        avg_confidence: number | null;
        searches_this_month: bigint;
    }>>`
        SELECT 
            COUNT(*) as total_searches,
            COUNT(DISTINCT "htsCode") as unique_hts_codes,
            AVG(confidence) as avg_confidence,
            COUNT(*) FILTER (WHERE "createdAt" >= ${startOfMonth}) as searches_this_month
        FROM search_history
        WHERE "userId" = ${userId}
    `;

    const result = stats[0] || { total_searches: 0n, unique_hts_codes: 0n, avg_confidence: null, searches_this_month: 0n };
    
    return {
        totalSearches: Number(result.total_searches),
        uniqueHtsCodes: Number(result.unique_hts_codes),
        avgConfidence: Math.round(result.avg_confidence ?? 0),
        searchesThisMonth: Number(result.searches_this_month),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delete a search history item
 */
export async function deleteSearchHistory(id: string, userId: string): Promise<boolean> {
    const result = await prisma.searchHistory.deleteMany({
        where: { id, userId },
    });

    return result.count > 0;
}

/**
 * Clear all search history for a user
 */
export async function clearSearchHistory(userId: string): Promise<number> {
    const result = await prisma.searchHistory.deleteMany({
        where: { userId },
    });

    return result.count;
}


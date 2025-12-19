// Classification History Service - localStorage-based for MVP
// Can be upgraded to database storage later

import type { ClassificationResult, ClassificationHistoryItem } from '@/types/classification.types';

const STORAGE_KEY = 'sourcify_classification_history';
const FULL_RESULTS_KEY = 'sourcify_classification_results';
const MAX_HISTORY_ITEMS = 50;

export interface StoredClassification {
    id: string;
    htsCode: string;
    description: string;
    productName?: string;         // User-friendly name
    productSku?: string;          // Internal part number
    productDescription: string;
    confidence: number;
    createdAt: string;
    countryOfOrigin?: string;
}

/**
 * Save a classification result to history (stores both summary and full result)
 */
export function saveClassification(result: ClassificationResult): void {
    if (typeof window === 'undefined') return;

    const history = getClassificationHistory();

    const storedItem: StoredClassification = {
        id: result.id,
        htsCode: result.htsCode.code,
        description: result.htsCode.description,
        productName: result.input.productName,
        productSku: result.input.productSku,
        productDescription: result.input.productDescription.substring(0, 100),
        confidence: result.confidence,
        createdAt: new Date().toISOString(),
        countryOfOrigin: result.input.countryOfOrigin,
    };

    // Add to beginning, remove duplicates
    const filtered = history.filter(h => h.id !== storedItem.id);
    const updated = [storedItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also store the full result for click-to-view
    saveFullResult(result);
}

/**
 * Save full classification result for later viewing
 */
function saveFullResult(result: ClassificationResult): void {
    if (typeof window === 'undefined') return;

    try {
        const fullResults = getFullResults();
        // Store result with serialized date
        const serializedResult = {
            ...result,
            createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt,
        };
        fullResults[result.id] = serializedResult as unknown as ClassificationResult;

        // Clean up old results (keep only those in history)
        const history = getClassificationHistory();
        const historyIds = new Set(history.map(h => h.id));
        const cleanedResults: Record<string, unknown> = {};
        for (const id of Object.keys(fullResults)) {
            if (historyIds.has(id)) {
                cleanedResults[id] = fullResults[id];
            }
        }

        localStorage.setItem(FULL_RESULTS_KEY, JSON.stringify(cleanedResults));
    } catch (e) {
        console.warn('Failed to save full result:', e);
    }
}

/**
 * Get all stored full results
 */
function getFullResults(): Record<string, ClassificationResult> {
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(FULL_RESULTS_KEY);
        if (!stored) return {};
        return JSON.parse(stored);
    } catch {
        return {};
    }
}

/**
 * Get a full classification result by ID
 */
export function getClassificationById(id: string): ClassificationResult | null {
    if (typeof window === 'undefined') return null;

    try {
        const fullResults = getFullResults();
        const result = fullResults[id];
        if (!result) return null;

        // Restore Date objects
        return {
            ...result,
            createdAt: new Date(result.createdAt as unknown as string),
        };
    } catch {
        return null;
    }
}

/**
 * Get classification history
 */
export function getClassificationHistory(): StoredClassification[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as StoredClassification[];
    } catch {
        return [];
    }
}

/**
 * Delete a classification from history
 */
export function deleteClassification(id: string): void {
    if (typeof window === 'undefined') return;

    const history = getClassificationHistory();
    const updated = history.filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also remove from full results
    const fullResults = getFullResults();
    delete fullResults[id];
    localStorage.setItem(FULL_RESULTS_KEY, JSON.stringify(fullResults));
}

/**
 * Clear all classification history
 */
export function clearClassificationHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FULL_RESULTS_KEY);
}

/**
 * Search classification history
 */
export function searchClassificationHistory(query: string): StoredClassification[] {
    const history = getClassificationHistory();
    const lowerQuery = query.toLowerCase();

    return history.filter(item =>
        item.htsCode.includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.productDescription.toLowerCase().includes(lowerQuery) ||
        (item.productName && item.productName.toLowerCase().includes(lowerQuery)) ||
        (item.productSku && item.productSku.toLowerCase().includes(lowerQuery))
    );
}

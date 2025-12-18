// Classification History Service - localStorage-based for MVP
// Can be upgraded to database storage later

import type { ClassificationResult, ClassificationHistoryItem } from '@/types/classification.types';

const STORAGE_KEY = 'sourcify_classification_history';
const MAX_HISTORY_ITEMS = 50;

export interface StoredClassification {
    id: string;
    htsCode: string;
    description: string;
    productDescription: string;
    confidence: number;
    createdAt: string;
    countryOfOrigin?: string;
}

/**
 * Save a classification result to history
 */
export function saveClassification(result: ClassificationResult): void {
    if (typeof window === 'undefined') return;

    const history = getClassificationHistory();

    const storedItem: StoredClassification = {
        id: result.id,
        htsCode: result.htsCode.code,
        description: result.htsCode.description,
        productDescription: result.input.productDescription.substring(0, 100),
        confidence: result.confidence,
        createdAt: new Date().toISOString(),
        countryOfOrigin: result.input.countryOfOrigin,
    };

    // Add to beginning, remove duplicates
    const filtered = history.filter(h => h.id !== storedItem.id);
    const updated = [storedItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
}

/**
 * Clear all classification history
 */
export function clearClassificationHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
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
        item.productDescription.toLowerCase().includes(lowerQuery)
    );
}

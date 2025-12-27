'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHTSHierarchy } from '@/services/htsHierarchy';
import type { HTSHierarchy } from '@/types/classification.types';

interface UseHTSHierarchyResult {
    hierarchy: HTSHierarchy | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch HTS hierarchy data for a given code.
 * Returns only the direct lineage path (siblings are included in the data
 * but not shown unless allowExpansion is enabled in ClassificationPath).
 * 
 * @param htsCode - The HTS code to fetch hierarchy for (can be null/undefined)
 * @returns Object with hierarchy data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { hierarchy, loading, error } = useHTSHierarchy('8543.70.88.00');
 * 
 * if (loading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 * if (hierarchy) return <ClassificationPath hierarchy={hierarchy} allowExpansion={false} />;
 * ```
 */
export function useHTSHierarchy(htsCode: string | null | undefined): UseHTSHierarchyResult {
    const [hierarchy, setHierarchy] = useState<HTSHierarchy | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchHierarchy = useCallback(async () => {
        if (!htsCode) {
            setHierarchy(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getHTSHierarchy(htsCode);
            setHierarchy(data);
        } catch (err) {
            console.error('[useHTSHierarchy] Failed to fetch:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch HTS hierarchy'));
            setHierarchy(null);
        } finally {
            setLoading(false);
        }
    }, [htsCode]);

    useEffect(() => {
        fetchHierarchy();
    }, [fetchHierarchy]);

    return {
        hierarchy,
        loading,
        error,
        refetch: fetchHierarchy,
    };
}

export default useHTSHierarchy;






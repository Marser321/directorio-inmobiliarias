'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackFunnelEvent } from '@/lib/analytics/funnel';

const STORAGE_KEY = 'luxe-compare';
const MAX_COMPARE_ITEMS = 4;

export function useCompare() {
    const [compareIds, setCompareIds] = useState<number[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored) as unknown[];
            return parsed
                .map((entry) => Number(entry))
                .filter((entry) => Number.isFinite(entry) && entry > 0)
                .slice(0, MAX_COMPARE_ITEMS);
        } catch {
            return [];
        }
    });

    const isHydrated = typeof window !== 'undefined';

    useEffect(() => {
        if (!isHydrated) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    }, [compareIds, isHydrated]);

    const isInCompare = useCallback((id: number | string) => {
        const numericId = Number(id);
        return compareIds.includes(numericId);
    }, [compareIds]);

    const addToCompare = useCallback((id: number | string, source: 'search' | 'property_detail' | 'other' = 'other') => {
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || numericId <= 0) return;

        setCompareIds((prev) => {
            if (prev.includes(numericId)) return prev;
            const next = [...prev, numericId].slice(0, MAX_COMPARE_ITEMS);
            return next;
        });

        void trackFunnelEvent('compare_property_added', {
            property_id: numericId,
            metadata: { source },
        });
    }, []);

    const removeFromCompare = useCallback((id: number | string, source: 'search' | 'property_detail' | 'compare' | 'other' = 'other') => {
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || numericId <= 0) return;

        setCompareIds((prev) => prev.filter((item) => item !== numericId));
        void trackFunnelEvent('compare_property_removed', {
            property_id: numericId,
            metadata: { source },
        });
    }, []);

    const toggleCompare = useCallback((id: number | string, source: 'search' | 'property_detail' | 'compare' | 'other' = 'other') => {
        if (isInCompare(id)) {
            removeFromCompare(id, source);
            return;
        }
        addToCompare(id, source === 'compare' ? 'other' : source);
    }, [addToCompare, isInCompare, removeFromCompare]);

    const clearCompare = useCallback(() => {
        setCompareIds([]);
    }, []);

    const compareUrl = compareIds.length > 0 ? `/compare?ids=${compareIds.join(',')}` : '/compare';

    return {
        compareIds,
        compareCount: compareIds.length,
        isInCompare,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        compareUrl,
        maxCompareItems: MAX_COMPARE_ITEMS,
    };
}

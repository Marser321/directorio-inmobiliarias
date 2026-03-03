'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'luxe-favorites';

/**
 * Hook para gestionar favoritos con persistencia en localStorage
 * @returns Métodos y estado para manejar favoritos
 */
export function useFavorites() {
    const { user, featureFlags } = useAuth();
    const [favorites, setFavorites] = useState<(string | number)[]>(() => {
        if (typeof window === 'undefined') return [];

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? (JSON.parse(saved) as (string | number)[]) : [];
        } catch (e) {
            console.error('Error loading favorites:', e);
            return [];
        }
    });

    const isHydrated = typeof window !== 'undefined';
    const syncInFlightRef = useRef(false);
    const canSyncServer = featureFlags.favoritesSync && Boolean(user?.id);

    // Persistir cambios
    useEffect(() => {
        if (!isHydrated) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        } catch (e) {
            console.error('Error saving favorites:', e);
        }
    }, [favorites, isHydrated]);

    useEffect(() => {
        if (!canSyncServer || !isHydrated || syncInFlightRef.current) return;

        const syncFavorites = async () => {
            syncInFlightRef.current = true;
            try {
                const localIds = favorites
                    .map((id) => Number(id))
                    .filter((id) => Number.isFinite(id) && id > 0);

                const hasLocalIds = localIds.length > 0;
                const response = await fetch(
                    hasLocalIds ? '/api/user/favorites/sync' : '/api/user/favorites',
                    hasLocalIds
                        ? {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ property_ids: localIds }),
                        }
                        : { method: 'GET' }
                );

                if (!response.ok) return;
                const payload = await response.json();

                if (Array.isArray(payload.data)) {
                    const normalized: number[] = payload.data
                        .map((entry: unknown) => {
                            if (typeof entry === 'number') return entry;
                            if (entry && typeof entry === 'object' && 'property_id' in entry) {
                                const id = Number((entry as { property_id?: unknown }).property_id);
                                return Number.isFinite(id) ? id : null;
                            }
                            return null;
                        })
                        .filter((entry: number | null): entry is number => typeof entry === 'number' && entry > 0);

                    if (normalized.length > 0 || hasLocalIds) {
                        setFavorites(Array.from(new Set<number>(normalized)));
                    }
                }
            } catch (error) {
                console.error('Error syncing favorites:', error);
            } finally {
                syncInFlightRef.current = false;
            }
        };

        void syncFavorites();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canSyncServer, user?.id, isHydrated]);

    const toggleFavorite = useCallback((id: string | number) => {
        setFavorites(prev => {
            const stringId = String(id);
            const exists = prev.some(f => String(f) === stringId);

            if (exists) {
                return prev.filter(f => String(f) !== stringId);
            }
            return [...prev, id];
        });

        if (!canSyncServer) return;

        const numericId = Number(id);
        if (!Number.isFinite(numericId) || numericId <= 0) return;

        const endpoint = `/api/user/favorites/${numericId}`;
        const exists = favorites.some(f => String(f) === String(id));
        void fetch(
            exists ? endpoint : '/api/user/favorites',
            exists
                ? { method: 'DELETE' }
                : {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ property_id: numericId }),
                }
        ).catch(() => {
            // Keep local UX responsive even if remote sync fails.
        });
    }, [canSyncServer, favorites]);

    const isFavorite = useCallback((id: string | number) => {
        return favorites.some(f => String(f) === String(id));
    }, [favorites]);

    const clearFavorites = useCallback(() => {
        setFavorites([]);
    }, []);

    return {
        favorites,
        toggleFavorite,
        isFavorite,
        clearFavorites,
        isHydrated,
    };
}

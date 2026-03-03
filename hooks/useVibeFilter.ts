'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/insforge/compat-supabase';

// Types
export type VibeFilterType = 'surf' | 'nightlife' | 'silence' | 'forest' | 'beach';

export interface VibeFilters {
    surf: boolean;
    nightlife: boolean;
    silence: boolean;
    forest: boolean;
    beach: boolean;
}

export interface VibeScore {
    id: number;
    location_id?: number;
    property_id?: number;
    wind_score: number;
    noise_score: number;
    safety_score: number;
    overall_vibe: number;
    surf_zone: boolean;
    nightlife: boolean;
    total_silence: boolean;
    forest_retreat: boolean;
    beach_access: boolean;
    season: 'summer' | 'winter' | 'transition';
}

export interface FilteredProperty {
    id: number;
    title: string;
    slug: string;
    price: number;
    currency: string;
    main_image: string;
    location: {
        name: string;
        slug: string;
    };
    vibeScore: VibeScore | null;
    vibeMatch: number; // Percentage match with active filters
}

// Raw property from Supabase query
interface RawProperty {
    id: number;
    title: string;
    slug: string;
    price: number;
    currency: string;
    main_image: string;
    location: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

interface UseVibeFilterOptions {
    initialFilters?: Partial<VibeFilters>;
    season?: 'summer' | 'winter' | 'transition';
}

interface UseVibeFilterReturn {
    // State
    filters: VibeFilters;
    isLoading: boolean;
    error: string | null;
    properties: FilteredProperty[];

    // Actions
    toggleFilter: (filter: VibeFilterType) => void;
    setFilter: (filter: VibeFilterType, value: boolean) => void;
    clearFilters: () => void;
    setAllFilters: (filters: Partial<VibeFilters>) => void;

    // Computed
    activeFilterCount: number;
    hasActiveFilters: boolean;
}

// Default filters
const DEFAULT_FILTERS: VibeFilters = {
    surf: false,
    nightlife: false,
    silence: false,
    forest: false,
    beach: false,
};

// Supabase client (initialized lazily)
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
    if (!supabaseClient) {
        const url = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
        const key = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

        if (url && key) {
            supabaseClient = createClient(url, key);
        }
    }
    return supabaseClient;
}

/**
 * Hook for filtering properties by Vibe Score lifestyle characteristics
 * 
 * @example
 * ```tsx
 * const { filters, toggleFilter, properties, isLoading } = useVibeFilter();
 * 
 * // Toggle surf filter
 * <button onClick={() => toggleFilter('surf')}>
 *   {filters.surf ? 'Surf ON' : 'Surf OFF'}
 * </button>
 * 
 * // Render filtered properties
 * {properties.map(p => <PropertyCard key={p.id} {...p} />)}
 * ```
 */
export function useVibeFilter(options: UseVibeFilterOptions = {}): UseVibeFilterReturn {
    const { initialFilters = {}, season = 'summer' } = options;

    // State
    const [filters, setFilters] = useState<VibeFilters>({
        ...DEFAULT_FILTERS,
        ...initialFilters,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [properties, setProperties] = useState<FilteredProperty[]>([]);
    const [vibeScores, setVibeScores] = useState<VibeScore[]>([]);

    // Computed values
    const activeFilterCount = useMemo(() =>
        Object.values(filters).filter(Boolean).length,
        [filters]
    );

    const hasActiveFilters = activeFilterCount > 0;

    // Actions
    const toggleFilter = useCallback((filter: VibeFilterType) => {
        setFilters(prev => ({
            ...prev,
            [filter]: !prev[filter],
        }));
    }, []);

    const setFilter = useCallback((filter: VibeFilterType, value: boolean) => {
        setFilters(prev => ({
            ...prev,
            [filter]: value,
        }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);

    const setAllFilters = useCallback((newFilters: Partial<VibeFilters>) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
        }));
    }, []);

    // Calculate vibe match percentage
    const calculateVibeMatch = useCallback((score: VibeScore, activeFilters: VibeFilters): number => {
        const filterKeys = Object.entries(activeFilters)
            .filter(([, active]) => active)
            .map(([key]) => key as VibeFilterType);

        if (filterKeys.length === 0) return 100;

        const vibeMap: Record<VibeFilterType, boolean> = {
            surf: score.surf_zone,
            nightlife: score.nightlife,
            silence: score.total_silence,
            forest: score.forest_retreat,
            beach: score.beach_access,
        };

        const matches = filterKeys.filter(key => vibeMap[key]).length;
        return Math.round((matches / filterKeys.length) * 100);
    }, []);

    // Fetch vibe scores on mount
    useEffect(() => {
        async function fetchVibeScores() {
            const supabase = getSupabase();
            if (!supabase) {
                // Use mock data if no Supabase connection
                setVibeScores([]);
                return;
            }

            try {
                setIsLoading(true);
                const { data, error: fetchError } = await supabase
                    .from('vibe_scores')
                    .select('*')
                    .eq('season', season);

                if (fetchError) throw fetchError;
                setVibeScores(data || []);
            } catch (err) {
                console.error('Error fetching vibe scores:', err);
                setError('Error al cargar datos de zonas');
            } finally {
                setIsLoading(false);
            }
        }

        fetchVibeScores();
    }, [season]);

    // Fetch and filter properties when filters change
    useEffect(() => {
        async function fetchFilteredProperties() {
            const supabase = getSupabase();
            if (!supabase) {
                // Mock data for development
                setProperties([]);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Build query based on active filters
                const query = supabase
                    .from('properties')
                    .select(`
            id,
            title,
            slug,
            price,
            currency,
            main_image,
            location:locations(name, slug)
          `)
                    .in('status', ['for_sale', 'for_rent'])
                    .order('is_featured', { ascending: false })
                    .limit(20);

                const { data: propertiesData, error: propertiesError } = await query;

                if (propertiesError) throw propertiesError;

                // Match properties with vibe scores and calculate match percentage
                const rawProperties = (propertiesData || []) as RawProperty[];
                const enrichedProperties: FilteredProperty[] = rawProperties.map(property => {
                    const vibeScore = vibeScores.find(v => v.property_id === property.id) || null;
                    const vibeMatch = vibeScore
                        ? calculateVibeMatch(vibeScore, filters)
                        : hasActiveFilters ? 50 : 100; // Default match if no vibe data

                    const location = Array.isArray(property.location)
                        ? property.location[0]
                        : property.location || { name: 'Unknown', slug: 'unknown' };

                    return {
                        id: property.id,
                        title: property.title,
                        slug: property.slug,
                        price: property.price,
                        currency: property.currency,
                        main_image: property.main_image,
                        location,
                        vibeScore,
                        vibeMatch,
                    };
                });

                // Sort by vibe match percentage
                enrichedProperties.sort((a, b) => b.vibeMatch - a.vibeMatch);

                // Filter out properties with 0% match if filters are active
                const filteredProperties = hasActiveFilters
                    ? enrichedProperties.filter(p => p.vibeMatch > 0)
                    : enrichedProperties;

                setProperties(filteredProperties);
            } catch (err) {
                console.error('Error fetching properties:', err);
                setError('Error al cargar propiedades');
            } finally {
                setIsLoading(false);
            }
        }

        fetchFilteredProperties();
    }, [filters, vibeScores, hasActiveFilters, calculateVibeMatch]);

    return {
        filters,
        isLoading,
        error,
        properties,
        toggleFilter,
        setFilter,
        clearFilters,
        setAllFilters,
        activeFilterCount,
        hasActiveFilters,
    };
}

// Export default for convenience
export default useVibeFilter;

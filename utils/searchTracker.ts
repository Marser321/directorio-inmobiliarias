import { createClient } from '@/lib/insforge/compat-supabase';

// Supabase client for search tracking (using anon key for insert-only)
const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

interface SearchParams {
    query?: string;
    category?: string;
    neighborhood?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    bedroomsMin?: number;
    resultsCount: number;
}

/**
 * Track user searches for analytics and innovation insights.
 * Used by Manager Agent to identify gaps and suggest new categories.
 */
export async function trackSearch(params: SearchParams): Promise<void> {
    if (!supabase) {
        console.warn('[SearchTracker] Supabase not configured, skipping tracking');
        return;
    }

    try {
        // Get or create session ID
        let sessionId = typeof window !== 'undefined'
            ? sessionStorage.getItem('search_session_id')
            : null;

        if (!sessionId && typeof window !== 'undefined') {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('search_session_id', sessionId);
        }

        await supabase.from('user_searches').insert({
            query: params.query || null,
            results_count: params.resultsCount,
            category: params.category || null,
            neighborhood: params.neighborhood || null,
            city: params.city || null,
            price_min: params.priceMin || null,
            price_max: params.priceMax || null,
            bedrooms_min: params.bedroomsMin || null,
            session_id: sessionId,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            source: 'web'
        });
    } catch (error) {
        // Silent fail - don't block user experience for analytics
        console.warn('[SearchTracker] Failed to track search:', error);
    }
}

/**
 * Hook-friendly wrapper for tracking searches
 */
export function useSearchTracking() {
    return {
        trackSearch,

        // Convenience method for tracking failed searches
        trackFailedSearch: (query: string, filters?: Partial<SearchParams>) => {
            return trackSearch({
                query,
                resultsCount: 0,
                ...filters
            });
        }
    };
}

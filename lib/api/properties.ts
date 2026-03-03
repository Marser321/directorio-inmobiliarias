import { createClient } from '@/lib/insforge/compat-supabase'
import type { PropertyFilters } from '@/hooks/usePropertyFilters'

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
)

export interface PropertyResult {
    id: number
    title: string
    slug: string
    price: number
    currency: string
    bedrooms: number
    bathrooms: number
    built_area: number
    plot_area: number | null
    status: string
    description: string | null
    main_image: string | null
    images: string[]
    features: Record<string, unknown>
    location: {
        id: number
        name: string
        slug: string
    } | null
    agency: {
        id: number
        name: string
    } | null
    created_at: string
    is_featured: boolean
    boost_level: number
}

export interface FetchPropertiesResult {
    data: PropertyResult[]
    count: number
    error: Error | null
}

/**
 * fetchFilteredProperties - Fetch properties with dynamic filters
 * 
 * Builds a Supabase query based on active filters:
 * - Price range
 * - Bedroom count
 * - Operation type (for_sale, for_rent)
 * - Property type (from features JSON)
 * - Amenities (searches in features JSONB)
 * - Text search (uses trigram similarity)
 * - Location filtering
 * 
 * @param filters - PropertyFilters object
 * @param page - Page number (0-indexed)
 * @param pageSize - Items per page
 * @returns Promise<FetchPropertiesResult>
 */
export async function fetchFilteredProperties(
    filters: PropertyFilters,
    page = 0,
    pageSize = 12
): Promise<FetchPropertiesResult> {
    try {
        // Start building query
        let query = supabase
            .from('properties')
            .select(`
                *,
                location:locations(id, name, slug),
                agency:agencies(id, name)
            `, { count: 'exact' })

        // Operation type filter
        if (filters.operationType === 'for_sale') {
            query = query.eq('status', 'for_sale')
        } else if (filters.operationType === 'for_rent') {
            query = query.eq('status', 'for_rent')
        } else {
            // Show all active listings
            query = query.in('status', ['for_sale', 'for_rent'])
        }

        // Price range filter
        if (filters.minPrice > 0) {
            query = query.gte('price', filters.minPrice)
        }
        if (filters.maxPrice < 10000000) {
            query = query.lte('price', filters.maxPrice)
        }

        // Bedrooms filter
        if (filters.minBedrooms > 0) {
            query = query.gte('bedrooms', filters.minBedrooms)
        }
        if (filters.maxBedrooms < 10) {
            query = query.lte('bedrooms', filters.maxBedrooms)
        }

        // Location filter
        if (filters.locationId) {
            query = query.eq('location_id', filters.locationId)
        }

        // Property type filter (stored in features.type)
        if (filters.propertyType) {
            query = query.contains('features', { type: filters.propertyType })
        }

        // Amenities filter (stored in features.amenities array)
        // @Jules: Consider creating a dedicated amenities column for better performance
        if (filters.amenities.length > 0) {
            // Check if features contains each amenity
            // Using containedBy for partial matching
            for (const amenity of filters.amenities) {
                query = query.or(`features->amenities.cs.{${amenity}}`)
            }
        }

        // Text search (uses trigram index)
        if (filters.searchQuery && filters.searchQuery.trim()) {
            const searchTerm = filters.searchQuery.trim()
            query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        }

        // Ordering: Featured first, then boost level, then newest
        query = query
            .order('is_featured', { ascending: false })
            .order('boost_level', { ascending: false })
            .order('created_at', { ascending: false })

        // Pagination
        const from = page * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)

        // Execute query
        const { data, error, count } = await query

        if (error) {
            console.error('Error fetching properties:', error)
            return { data: [], count: 0, error }
        }

        return {
            data: data as PropertyResult[],
            count: count || 0,
            error: null
        }
    } catch (error) {
        console.error('Unexpected error fetching properties:', error)
        return {
            data: [],
            count: 0,
            error: error instanceof Error ? error : new Error('Unknown error')
        }
    }
}

/**
 * Fetch a single property by ID
 */
export async function fetchPropertyById(id: number): Promise<PropertyResult | null> {
    const { data, error } = await supabase
        .from('properties')
        .select(`
            *,
            location:locations(id, name, slug),
            agency:agencies(id, name)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching property:', error)
        return null
    }

    return data as PropertyResult
}

/**
 * Fetch properties with images from property_images table
 */
export async function fetchPropertyWithImages(id: number) {
    const { data, error } = await supabase
        .from('properties')
        .select(`
            *,
            location:locations(id, name, slug),
            agency:agencies(id, name),
            property_images(id, url, display_order, caption)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching property with images:', error)
        return null
    }

    // Sort images by display_order
    if (data?.property_images) {
        data.property_images.sort((a: { display_order: number }, b: { display_order: number }) =>
            a.display_order - b.display_order
        )
    }

    return data
}

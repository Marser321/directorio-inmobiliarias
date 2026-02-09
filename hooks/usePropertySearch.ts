"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Property } from "@/types/database.types"
import { SearchFilters } from "./useSearchFilters"

export type MapBounds = {
    north: number
    south: number
    east: number
    west: number
} | null

export type PropertyWithLocation = Property & {
    lat?: number
    lng?: number
    location_name?: string
}

// Mock data for development (when Supabase has no data)
const MOCK_PROPERTIES: PropertyWithLocation[] = [
    {
        id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: "Villa Moderna La Juanita",
        slug: "villa-moderna-la-juanita",
        description: "Espectacular villa con vistas panorámicas al océano",
        price: 1200000,
        currency: "USD",
        status: "for_sale",
        is_featured: true,
        built_area: 280,
        plot_area: 800,
        bedrooms: 4,
        bathrooms: 3,
        garage_spaces: 2,
        location_id: 1,
        agency_id: 1,
        agent_id: null,
        main_image: "/images/placeholders/luxury-villa.jpg",
        images: [
            "/images/placeholders/luxury-villa.jpg",
            "/images/placeholders/interior-view.jpg",
            "/images/placeholders/interior-living.jpg",
        ],
        video_url: null,
        floor_plan_url: null,
        features: { pool: true, garage: true, sea_view: true },
        lifestyle_tags: ["waterfront", "sunset"],
        location_point: null,
        view_count: 156,
        lat: -34.915,
        lng: -54.86,
        location_name: "José Ignacio, La Juanita",
        boost_level: 3,
        quality_score: 95,
        quality_feedback: "Excelente presentación",
        featured_until: null,
    },
    {
        id: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: "Penthouse Playa Brava",
        slug: "penthouse-playa-brava",
        description: "Penthouse de lujo frente al mar con terraza privada",
        price: 950000,
        currency: "USD",
        status: "for_sale",
        is_featured: true,
        built_area: 180,
        plot_area: null,
        bedrooms: 3,
        bathrooms: 2,
        garage_spaces: 1,
        location_id: 2,
        agency_id: 1,
        agent_id: null,
        main_image: "/images/placeholders/urban-penthouse.jpg",
        images: [
            "/images/placeholders/urban-penthouse.jpg",
            "/images/placeholders/interior-living.jpg",
        ],
        video_url: null,
        floor_plan_url: null,
        features: { pool: false, garage: true, sea_view: true, gym: true },
        lifestyle_tags: ["waterfront", "nightlife"],
        location_point: null,
        view_count: 89,
        lat: -34.94,
        lng: -54.91,
        location_name: "Playa Brava, Punta del Este",
        boost_level: 2,
        quality_score: 88,
        quality_feedback: "Faltan fotos secundarias",
        featured_until: null,
    },
    {
        id: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: "Chacra Rústica Contemporánea",
        slug: "chacra-rustica-contemporanea",
        description: "Chacra de 5 hectáreas con diseño contemporáneo",
        price: 2500000,
        currency: "USD",
        status: "for_sale",
        is_featured: false,
        built_area: 450,
        plot_area: 50000,
        bedrooms: 5,
        bathrooms: 4,
        garage_spaces: 3,
        location_id: 3,
        agency_id: 2,
        agent_id: null,
        main_image: "/images/placeholders/farm-ranch.jpg",
        images: [
            "/images/placeholders/farm-ranch.jpg",
            "/images/placeholders/interior-view.jpg",
        ],
        video_url: null,
        floor_plan_url: null,
        features: { pool: true, garage: true, fireplace: true, bbq: true },
        lifestyle_tags: ["nature", "security"],
        location_point: null,
        view_count: 234,
        lat: -34.85,
        lng: -54.7,
        location_name: "José Ignacio, Chacras",
        boost_level: 1,
        quality_score: 92,
        quality_feedback: "Localización verified",
        featured_until: null,
    },
    {
        id: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: "Apartamento Boutique Centro",
        slug: "apartamento-boutique-centro",
        description: "Elegante apartamento en el corazón de Punta del Este",
        price: 480000,
        currency: "USD",
        status: "for_sale",
        is_featured: false,
        built_area: 120,
        plot_area: null,
        bedrooms: 2,
        bathrooms: 2,
        garage_spaces: 1,
        location_id: 4,
        agency_id: 1,
        agent_id: null,
        main_image: "/images/placeholders/modern-apartment.jpg",
        images: [
            "/images/placeholders/modern-apartment.jpg",
        ],
        video_url: null,
        floor_plan_url: null,
        features: { garage: true, gym: true, concierge: true },
        lifestyle_tags: ["shopping", "nightlife", "social"],
        location_point: null,
        view_count: 67,
        lat: -34.912,
        lng: -54.865,
        location_name: "Centro, Punta del Este",
        boost_level: 1,
        quality_score: 75,
        quality_feedback: "Sugerencia: Mejores fotos",
        featured_until: null,
    },
    {
        id: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: "Casa Frente al Puerto",
        slug: "casa-frente-puerto",
        description: "Casa con vistas directas al puerto de yates",
        price: 1800000,
        currency: "USD",
        status: "for_sale",
        is_featured: true,
        built_area: 320,
        plot_area: 600,
        bedrooms: 4,
        bathrooms: 3,
        garage_spaces: 2,
        location_id: 5,
        agency_id: 2,
        agent_id: null,
        main_image: "/images/placeholders/beach-house.jpg",
        images: [
            "/images/placeholders/beach-house.jpg",
            "/images/placeholders/modern-apartment.jpg",
        ],
        video_url: null,
        floor_plan_url: null,
        features: { pool: true, garage: true, dock: true },
        lifestyle_tags: ["boating", "waterfront", "social"],
        location_point: null,
        view_count: 189,
        lat: -34.92,
        lng: -54.85,
        location_name: "Puerto, Punta del Este",
        boost_level: 3,
        quality_score: 98,
        quality_feedback: "Listing premium",
        featured_until: null,
    },
    {
        id: 6,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: "Loft Industrial Renovado",
        slug: "loft-industrial-renovado",
        description: "Loft de diseño en edificio histórico restaurado",
        price: 380000,
        currency: "USD",
        status: "for_rent",
        is_featured: false,
        built_area: 95,
        plot_area: null,
        bedrooms: 1,
        bathrooms: 1,
        garage_spaces: 0,
        location_id: 4,
        agency_id: 1,
        agent_id: null,
        main_image: "/images/placeholders/interior-living.jpg",
        images: [
            "/images/placeholders/interior-living.jpg",
        ],
        video_url: null,
        floor_plan_url: null,
        features: { exposed_brick: true, high_ceilings: true },
        lifestyle_tags: ["culture", "social"],
        location_point: null,
        view_count: 45,
        lat: -34.908,
        lng: -54.875,
        location_name: "La Barra, Punta del Este",
        boost_level: 1,
        quality_score: 80,
        quality_feedback: "Ok",
        featured_until: null,
    },
]

type UsePropertySearchOptions = {
    filters: SearchFilters
    bounds?: MapBounds
    limit?: number
}

export function usePropertySearch({ filters, bounds, limit = 50 }: UsePropertySearchOptions) {
    const [properties, setProperties] = useState<PropertyWithLocation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [totalCount, setTotalCount] = useState(0)

    const fetchProperties = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Try to fetch from Supabase first
            let query = supabase
                .from("properties")
                .select("*, locations(name), location_point_geojson", { count: "exact" })

            // Apply filters
            if (filters.query) {
                query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
            }
            if (filters.priceMin) {
                query = query.gte("price", filters.priceMin)
            }
            if (filters.priceMax) {
                query = query.lte("price", filters.priceMax)
            }
            if (filters.bedrooms) {
                query = query.gte("bedrooms", filters.bedrooms)
            }
            if (filters.bathrooms) {
                query = query.gte("bathrooms", filters.bathrooms)
            }
            if (filters.propertyType) {
                // Assuming property_type column exists or using features
                query = query.contains("features", { type: filters.propertyType })
            }
            if (filters.status) {
                query = query.eq("status", filters.status)
            }
            if (filters.lifestyles.length > 0) {
                query = query.overlaps("lifestyle_tags", filters.lifestyles)
            }

            // Apply sorting
            switch (filters.sortBy) {
                case "price_asc":
                    query = query.order("price", { ascending: true })
                    break
                case "price_desc":
                    query = query.order("price", { ascending: false })
                    break
                case "newest":
                    query = query.order("created_at", { ascending: false })
                    break
                default:
                    query = query.order("is_featured", { ascending: false }).order("view_count", { ascending: false })
            }

            query = query.limit(limit)

            const { data, error: dbError, count } = await query

            if (dbError) throw dbError

            if (data && data.length > 0) {
                // Transform data to include lat/lng (cast due to complex Supabase join types)
                const transformed = (data as unknown as Property[]).map((p) => {
                    const locName = (p as unknown as { locations?: { name: string } }).locations?.name || "Punta del Este"

                    // Try to get coordinates from PostGIS data
                    let realLat: number | undefined;
                    let realLng: number | undefined;

                    // Handle location_point_geojson from computed column
                    // PostgREST return from computed column will be the JSON object
                    const locPoint = (p as any).location_point_geojson as { type: string, coordinates: number[] } | null;

                    if (locPoint && locPoint.type === 'Point' && Array.isArray(locPoint.coordinates)) {
                        realLng = locPoint.coordinates[0];
                        realLat = locPoint.coordinates[1];
                    }

                    if (!realLat && !realLng) {
                        const loc = p.location as unknown as { type: string, coordinates: number[] } | null;
                        if (loc && loc.type === 'Point' && Array.isArray(loc.coordinates)) {
                            realLng = loc.coordinates[0];
                            realLat = loc.coordinates[1];
                        }
                    }

                    // Fallback to deterministic coordinates if no real data
                    const coords: Record<string, [number, number]> = {
                        "Punta del Este": [-34.955, -54.935],
                        "La Barra": [-34.912, -54.858],
                        "Jose Ignacio": [-34.805, -54.632],
                        "Manantiales": [-34.885, -54.845],
                        "Beverly Hills": [-34.925, -54.915],
                        "Pinares": [-34.905, -54.935],
                    }

                    const [defaultLat, defaultLng] = coords[locName] || coords["Punta del Este"]

                    return {
                        ...p,
                        // Only replace main_image if it's missing or a placeholder, don't overwrite real Supabase URLs
                        main_image: p.main_image || '/images/placeholders/luxury-villa.jpg',
                        images: p.images && p.images.length > 0 ? p.images : ['/images/placeholders/luxury-villa.jpg'],

                        // Use real coordinates if available, otherwise fallback
                        lat: realLat || (defaultLat + (Math.random() * 0.001 - 0.0005)),
                        lng: realLng || (defaultLng + (Math.random() * 0.001 - 0.0005)),
                        location_name: locName,
                    }
                })
                setProperties(transformed as PropertyWithLocation[])
                setTotalCount(count || transformed.length)
            } else {
                // Fall back to mock data if DB is empty
                let filtered = [...MOCK_PROPERTIES]

                // Apply client-side filtering to mock data
                if (filters.query) {
                    const q = filters.query.toLowerCase()
                    filtered = filtered.filter(p =>
                        p.title.toLowerCase().includes(q) ||
                        p.description?.toLowerCase().includes(q) ||
                        p.location_name?.toLowerCase().includes(q)
                    )
                }
                if (filters.priceMin) {
                    filtered = filtered.filter(p => p.price >= filters.priceMin!)
                }
                if (filters.priceMax) {
                    filtered = filtered.filter(p => p.price <= filters.priceMax!)
                }
                if (filters.bedrooms) {
                    filtered = filtered.filter(p => (p.bedrooms || 0) >= filters.bedrooms!)
                }
                if (filters.bathrooms) {
                    filtered = filtered.filter(p => (p.bathrooms || 0) >= filters.bathrooms!)
                }
                if (filters.status) {
                    filtered = filtered.filter(p => p.status === filters.status)
                }
                if (filters.lifestyles.length > 0) {
                    filtered = filtered.filter(p =>
                        p.lifestyle_tags?.some((tag: string) => filters.lifestyles.includes(tag))
                    )
                }
                if (filters.features.length > 0) {
                    filtered = filtered.filter(p => {
                        const feats = p.features as Record<string, boolean> | null
                        return filters.features.some(f => feats?.[f] === true)
                    })
                }

                // Apply bounds filter if map bounds provided
                if (bounds) {
                    filtered = filtered.filter(p =>
                        p.lat && p.lng &&
                        p.lat >= bounds.south && p.lat <= bounds.north &&
                        p.lng >= bounds.west && p.lng <= bounds.east
                    )
                }

                // Apply sorting
                switch (filters.sortBy) {
                    case "price_asc":
                        filtered.sort((a, b) => a.price - b.price)
                        break
                    case "price_desc":
                        filtered.sort((a, b) => b.price - a.price)
                        break
                    case "newest":
                        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        break
                    default:
                        filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
                }

                setProperties(filtered)
                setTotalCount(filtered.length)
            }
        } catch (err) {
            // On error, use mock data
            console.warn("Using mock data:", err)
            setProperties(MOCK_PROPERTIES)
            setTotalCount(MOCK_PROPERTIES.length)
        } finally {
            setIsLoading(false)
        }
    }, [filters, bounds, limit])

    useEffect(() => {
        fetchProperties()
    }, [fetchProperties])

    return {
        properties,
        isLoading,
        error,
        totalCount,
        refetch: fetchProperties,
    }
}

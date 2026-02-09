'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export interface PropertyFilters {
    minPrice: number
    maxPrice: number
    minBedrooms: number
    maxBedrooms: number
    amenities: string[]
    operationType: 'for_sale' | 'for_rent' | 'all'
    propertyType: string | null
    searchQuery: string
    locationId: number | null
}

const DEFAULT_FILTERS: PropertyFilters = {
    minPrice: 0,
    maxPrice: 10000000,
    minBedrooms: 0,
    maxBedrooms: 10,
    amenities: [],
    operationType: 'all',
    propertyType: null,
    searchQuery: '',
    locationId: null,
}

/**
 * usePropertyFilters - Hook for managing property search filters
 * Features:
 * - Syncs with URL query params for shareable searches
 * - Debounced updates to prevent excessive API calls
 * - Type-safe filter state management
 */
export function usePropertyFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Parse initial state from URL
    const initialFilters = useMemo((): PropertyFilters => ({
        minPrice: parseInt(searchParams.get('minPrice') || '0'),
        maxPrice: parseInt(searchParams.get('maxPrice') || '10000000'),
        minBedrooms: parseInt(searchParams.get('minBedrooms') || '0'),
        maxBedrooms: parseInt(searchParams.get('maxBedrooms') || '10'),
        amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
        operationType: (searchParams.get('operation') as PropertyFilters['operationType']) || 'all',
        propertyType: searchParams.get('type') || null,
        searchQuery: searchParams.get('q') || '',
        locationId: searchParams.get('location') ? parseInt(searchParams.get('location')!) : null,
    }), [searchParams])

    const [filters, setFilters] = useState<PropertyFilters>(initialFilters)

    // Sync filters to URL
    const syncToUrl = useCallback((newFilters: PropertyFilters) => {
        const params = new URLSearchParams()

        if (newFilters.minPrice > 0) params.set('minPrice', newFilters.minPrice.toString())
        if (newFilters.maxPrice < 10000000) params.set('maxPrice', newFilters.maxPrice.toString())
        if (newFilters.minBedrooms > 0) params.set('minBedrooms', newFilters.minBedrooms.toString())
        if (newFilters.amenities.length > 0) params.set('amenities', newFilters.amenities.join(','))
        if (newFilters.operationType !== 'all') params.set('operation', newFilters.operationType)
        if (newFilters.propertyType) params.set('type', newFilters.propertyType)
        if (newFilters.searchQuery) params.set('q', newFilters.searchQuery)
        if (newFilters.locationId) params.set('location', newFilters.locationId.toString())

        const newUrl = `${window.location.pathname}?${params.toString()}`
        router.replace(newUrl, { scroll: false })
    }, [router])

    // Update a single filter
    const updateFilter = useCallback(<K extends keyof PropertyFilters>(
        key: K,
        value: PropertyFilters[K]
    ) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value }
            return newFilters
        })
    }, [])

    // Update multiple filters at once
    const updateFilters = useCallback((updates: Partial<PropertyFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }))
    }, [])

    // Toggle an amenity
    const toggleAmenity = useCallback((amenityId: string) => {
        setFilters(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenityId)
                ? prev.amenities.filter(id => id !== amenityId)
                : [...prev.amenities, amenityId]
        }))
    }, [])

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS)
    }, [])

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return (
            filters.minPrice > 0 ||
            filters.maxPrice < 10000000 ||
            filters.minBedrooms > 0 ||
            filters.amenities.length > 0 ||
            filters.operationType !== 'all' ||
            filters.propertyType !== null ||
            filters.searchQuery !== '' ||
            filters.locationId !== null
        )
    }, [filters])

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.minPrice > 0 || filters.maxPrice < 10000000) count++
        if (filters.minBedrooms > 0) count++
        if (filters.amenities.length > 0) count++
        if (filters.operationType !== 'all') count++
        if (filters.propertyType !== null) count++
        if (filters.searchQuery !== '') count++
        if (filters.locationId !== null) count++
        return count
    }, [filters])

    // Debounced URL sync
    useEffect(() => {
        const timer = setTimeout(() => {
            syncToUrl(filters)
        }, 300)
        return () => clearTimeout(timer)
    }, [filters, syncToUrl])

    return {
        filters,
        updateFilter,
        updateFilters,
        toggleAmenity,
        clearFilters,
        hasActiveFilters,
        activeFilterCount,
    }
}

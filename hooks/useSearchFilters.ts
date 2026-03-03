"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo, useTransition, useRef, useEffect } from "react"

export type SearchFilters = {
    query: string
    priceMin: number | null
    priceMax: number | null
    bedrooms: number | null
    bathrooms: number | null
    propertyType: string | null
    status: "for_sale" | "for_rent" | null
    features: string[]
    lifestyles: string[]
    sortBy: "relevance" | "price_asc" | "price_desc" | "newest"
}

// Debounce helper
function useDebounce<T extends (...args: Parameters<T>) => void>(
    fn: T,
    delay: number
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    const debounced = useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => fn(...args), delay)
    }, [fn, delay])

    return debounced as T
}

export function useSearchFilters() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()

    // Parse current URL params into filter object
    const filters = useMemo<SearchFilters>(() => {
        const featuresParam = searchParams.get("features")
        const lifestylesParam = searchParams.get("lifestyles")

        return {
            query: searchParams.get("q") || "",
            priceMin: searchParams.get("price_min") ? Number(searchParams.get("price_min")) : null,
            priceMax: searchParams.get("price_max") ? Number(searchParams.get("price_max")) : null,
            bedrooms: searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : null,
            bathrooms: searchParams.get("bathrooms") ? Number(searchParams.get("bathrooms")) : null,
            propertyType: searchParams.get("type") || null,
            status: (searchParams.get("status") as SearchFilters["status"]) || null,
            features: featuresParam ? featuresParam.split(",") : [],
            lifestyles: lifestylesParam ? lifestylesParam.split(",") : [],
            sortBy: (searchParams.get("sort") as SearchFilters["sortBy"]) || "relevance",
        }
    }, [searchParams])

    // Update URL with new filters
    const updateURL = useCallback(
        (newFilters: Partial<SearchFilters>) => {
            const params = new URLSearchParams(searchParams.toString())

            const merged = { ...filters, ...newFilters }

            // Update each param
            if (merged.query) params.set("q", merged.query)
            else params.delete("q")

            if (merged.priceMin) params.set("price_min", String(merged.priceMin))
            else params.delete("price_min")

            if (merged.priceMax) params.set("price_max", String(merged.priceMax))
            else params.delete("price_max")

            if (merged.bedrooms) params.set("bedrooms", String(merged.bedrooms))
            else params.delete("bedrooms")

            if (merged.bathrooms) params.set("bathrooms", String(merged.bathrooms))
            else params.delete("bathrooms")

            if (merged.propertyType) params.set("type", merged.propertyType)
            else params.delete("type")

            if (merged.status) params.set("status", merged.status)
            else params.delete("status")

            if (merged.features.length > 0) params.set("features", merged.features.join(","))
            else params.delete("features")

            if (merged.lifestyles.length > 0) params.set("lifestyles", merged.lifestyles.join(","))
            else params.delete("lifestyles")

            if (merged.sortBy !== "relevance") params.set("sort", merged.sortBy)
            else params.delete("sort")

            startTransition(() => {
                router.push(`${pathname}?${params.toString()}`, { scroll: false })
            })
        },
        [searchParams, filters, pathname, router]
    )

    // Debounced version for text input
    const debouncedUpdateURL = useDebounce(updateURL, 300)

    // Convenience setters
    const setQuery = useCallback((query: string) => debouncedUpdateURL({ query }), [debouncedUpdateURL])
    const setPriceRange = useCallback((min: number | null, max: number | null) => updateURL({ priceMin: min, priceMax: max }), [updateURL])
    const setBedrooms = useCallback((bedrooms: number | null) => updateURL({ bedrooms }), [updateURL])
    const setBathrooms = useCallback((bathrooms: number | null) => updateURL({ bathrooms }), [updateURL])
    const setPropertyType = useCallback((propertyType: string | null) => updateURL({ propertyType }), [updateURL])
    const setStatus = useCallback((status: SearchFilters["status"]) => updateURL({ status }), [updateURL])
    const setSortBy = useCallback((sortBy: SearchFilters["sortBy"]) => updateURL({ sortBy }), [updateURL])

    const toggleFeature = useCallback((feature: string) => {
        const newFeatures = filters.features.includes(feature)
            ? filters.features.filter(f => f !== feature)
            : [...filters.features, feature]
        updateURL({ features: newFeatures })
    }, [filters.features, updateURL])

    const toggleLifestyle = useCallback((lifestyle: string) => {
        const newLifestyles = filters.lifestyles.includes(lifestyle)
            ? filters.lifestyles.filter(l => l !== lifestyle)
            : [...filters.lifestyles, lifestyle]
        updateURL({ lifestyles: newLifestyles })
    }, [filters.lifestyles, updateURL])

    const resetFilters = useCallback(() => {
        startTransition(() => {
            router.push(pathname, { scroll: false })
        })
    }, [pathname, router])

    const hasActiveFilters = useMemo(() => {
        return (
            filters.query !== "" ||
            filters.priceMin !== null ||
            filters.priceMax !== null ||
            filters.bedrooms !== null ||
            filters.bathrooms !== null ||
            filters.propertyType !== null ||
            filters.status !== null ||
            filters.features.length > 0 ||
            filters.lifestyles.length > 0
        )
    }, [filters])

    return {
        filters,
        isPending,
        hasActiveFilters,
        setQuery,
        setPriceRange,
        setBedrooms,
        setBathrooms,
        setPropertyType,
        setStatus,
        setSortBy,
        toggleFeature,
        toggleLifestyle,
        resetFilters,
        updateURL,
    }
}

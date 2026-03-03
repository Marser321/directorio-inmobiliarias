"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SearchFilters } from "./useSearchFilters"
import { MapBounds } from "./useMapBounds"
import type { PropertySearchItem, SearchApiResponse } from "@/types/domain"
import { trackFunnelEvent } from "@/lib/analytics/funnel"

export type PropertyWithLocation = PropertySearchItem

interface UsePropertySearchOptions {
  filters: SearchFilters
  bounds?: MapBounds | null
  limit?: number
  enabled?: boolean
}

function appendIfValue(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined) return
  if (typeof value === "string" && value.trim().length === 0) return
  params.set(key, String(value))
}

function buildSearchParams(filters: SearchFilters, bounds?: MapBounds | null, limit = 50) {
  const params = new URLSearchParams()

  appendIfValue(params, "q", filters.query)
  appendIfValue(params, "price_min", filters.priceMin)
  appendIfValue(params, "price_max", filters.priceMax)
  appendIfValue(params, "bedrooms", filters.bedrooms)
  appendIfValue(params, "bathrooms", filters.bathrooms)
  appendIfValue(params, "type", filters.propertyType)
  appendIfValue(params, "status", filters.status)
  appendIfValue(params, "sort", filters.sortBy)
  appendIfValue(params, "limit", limit)

  if (filters.features.length > 0) {
    params.set("features", filters.features.join(","))
  }

  if (filters.lifestyles.length > 0) {
    params.set("lifestyles", filters.lifestyles.join(","))
  }

  if (bounds) {
    params.set("search_as_move", "true")
    appendIfValue(params, "north", bounds.north)
    appendIfValue(params, "south", bounds.south)
    appendIfValue(params, "east", bounds.east)
    appendIfValue(params, "west", bounds.west)
  }

  return params
}

function getPriceBand(filters: SearchFilters) {
  const min = filters.priceMin ?? 0
  const max = filters.priceMax ?? 0

  if (max > 0 && max <= 300000) return "entry"
  if (max > 300000 && max <= 800000) return "mid"
  if (max > 800000 && max <= 1500000) return "premium"
  if (max > 1500000 || min >= 1500000) return "ultra"
  return "all"
}

export function usePropertySearch({ filters, bounds, limit = 50, enabled = true }: UsePropertySearchOptions) {
  const [properties, setProperties] = useState<PropertyWithLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [queryMs, setQueryMs] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const queryString = useMemo(() => buildSearchParams(filters, bounds, limit).toString(), [filters, bounds, limit])

  const fetchProperties = useCallback(async () => {
    if (!enabled) {
      setProperties([])
      setTotalCount(0)
      setIsLoading(false)
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search/properties?${queryString}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      })

      const payload = (await response.json()) as SearchApiResponse | { error?: string; query_ms?: number }

      if (!response.ok || !("data" in payload)) {
        throw new Error((payload as { error?: string }).error || "No se pudo cargar la búsqueda")
      }

      setProperties(payload.data)
      setTotalCount(payload.total_estimate)
      setQueryMs(payload.query_ms)
      setNextCursor(payload.next_cursor)

      void trackFunnelEvent("search_results_loaded", {
        metadata: {
          query: filters.query || null,
          results_count: payload.data.length,
          total_estimate: payload.total_estimate,
          query_ms: payload.query_ms,
          sort: filters.sortBy,
          has_bounds: Boolean(bounds),
          price_band: getPriceBand(filters),
          zone: payload.data[0]?.location_name || "unknown",
        },
      })
    } catch (err: unknown) {
      if (controller.signal.aborted) return

      const nextError = err instanceof Error ? err : new Error("Error inesperado en búsqueda")
      setError(nextError)
      setProperties([])
      setTotalCount(0)
      setNextCursor(null)
      setQueryMs(0)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [enabled, queryString, filters, bounds])

  useEffect(() => {
    void fetchProperties()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [fetchProperties])

  return {
    properties,
    isLoading,
    error,
    totalCount,
    queryMs,
    nextCursor,
    refetch: fetchProperties,
  }
}

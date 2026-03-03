"use client"

import { useState, useCallback } from "react"

export type MapBounds = {
    north: number
    south: number
    east: number
    west: number
}

export type MapViewport = {
    center: [number, number]
    zoom: number
    bounds: MapBounds | null
}

// Default viewport: Punta del Este region
const DEFAULT_VIEWPORT: MapViewport = {
    center: [-34.9126, -54.8711],
    zoom: 11,
    bounds: null,
}

export function useMapBounds() {
    const [viewport, setViewport] = useState<MapViewport>(DEFAULT_VIEWPORT)
    const [isSearchAsMove, setIsSearchAsMove] = useState(false)
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null)

    const updateBounds = useCallback((bounds: MapBounds) => {
        setViewport(prev => ({ ...prev, bounds }))
    }, [])

    const updateCenter = useCallback((center: [number, number], zoom?: number) => {
        setViewport(prev => ({
            ...prev,
            center,
            zoom: zoom ?? prev.zoom,
        }))
    }, [])

    const toggleSearchAsMove = useCallback(() => {
        setIsSearchAsMove(prev => !prev)
    }, [])

    const resetViewport = useCallback(() => {
        setViewport(DEFAULT_VIEWPORT)
    }, [])

    const highlightProperty = useCallback((id: number | null) => {
        setHighlightedPropertyId(id)
    }, [])

    return {
        viewport,
        isSearchAsMove,
        highlightedPropertyId,
        updateBounds,
        updateCenter,
        toggleSearchAsMove,
        resetViewport,
        highlightProperty,
    }
}

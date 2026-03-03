
"use client"

import React, { createContext, useContext, useState } from "react"

type MapContextType = {
    activePropertyId: number | null
    hoveredPropertyId: number | null
    setActiveProperty: (id: number | null) => void
    setHoveredProperty: (id: number | null) => void
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: React.ReactNode }) {
    const [activePropertyId, setActiveProperty] = useState<number | null>(null)
    const [hoveredPropertyId, setHoveredProperty] = useState<number | null>(null)

    return (
        <MapContext.Provider value={{ activePropertyId, hoveredPropertyId, setActiveProperty, setHoveredProperty }}>
            {children}
        </MapContext.Provider>
    )
}

export function useMap() {
    const context = useContext(MapContext)
    if (context === undefined) {
        throw new Error("useMap must be used within a MapProvider")
    }
    return context
}

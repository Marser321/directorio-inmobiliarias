"use client"

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyWithLocation } from '@/hooks/usePropertySearch'
import { MapBounds } from '@/hooks/useMapBounds'

// Dynamically import the map to avoid SSR issues (window not defined)
const ClusteredMap = dynamic(() => import('@/components/map/ClusteredMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[400px] relative bg-slate-100 flex items-center justify-center rounded-xl overflow-hidden">
            <Skeleton className="w-full h-full absolute inset-0" />
            <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 text-sm font-medium">Cargando mapa...</span>
            </div>
        </div>
    ),
})

interface InteractiveMapProps {
    properties?: PropertyWithLocation[]
    highlightedPropertyId?: number | null
    onBoundsChange?: (bounds: MapBounds) => void
    onPropertyHover?: (id: number | string | null) => void
    isSearchAsMove?: boolean
    className?: string
}

export default function InteractiveMap({
    properties = [],
    highlightedPropertyId = null,
    onBoundsChange = () => { },
    onPropertyHover = () => { },
    isSearchAsMove = false,
    className,
}: InteractiveMapProps) {
    return (
        <ClusteredMap
            properties={properties}
            highlightedPropertyId={highlightedPropertyId}
            onBoundsChange={onBoundsChange}
            onPropertyHover={onPropertyHover}
            isSearchAsMove={isSearchAsMove}
            className={className}
        />
    )
}

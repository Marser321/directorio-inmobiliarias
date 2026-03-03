'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ExplorePanel from '@/components/explore/ExplorePanel';
import VibeToggles from '@/components/explore/VibeToggles';

// Dynamic import for map (SSR disabled for Leaflet)
const NeighborhoodExplorerMap = dynamic(
    () => import('@/components/explore/NeighborhoodExplorerMap'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-neutral-100 animate-pulse flex items-center justify-center">
                <div className="text-neutral-400">Cargando mapa...</div>
            </div>
        )
    }
);

// Types
export type VibeFilter = 'surf' | 'nightlife' | 'silence' | 'forest' | 'beach';

interface VibeFilters {
    surf: boolean;
    nightlife: boolean;
    silence: boolean;
    forest: boolean;
    beach: boolean;
}

export default function ExplorePage() {
    // Active filters state
    const [activeFilters, setActiveFilters] = useState<VibeFilters>({
        surf: false,
        nightlife: false,
        silence: false,
        forest: false,
        beach: false,
    });

    // Hovered zone for panel updates
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    // Selected zone for detailed view
    const [selectedZone, setSelectedZone] = useState<string | null>(null);

    // Toggle filter handler
    const toggleFilter = (filter: VibeFilter) => {
        setActiveFilters(prev => ({
            ...prev,
            [filter]: !prev[filter],
        }));
    };

    // Clear all filters
    const clearFilters = () => {
        setActiveFilters({
            surf: false,
            nightlife: false,
            silence: false,
            forest: false,
            beach: false,
        });
    };

    return (
        <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-background">
            {/* Floating Toggle Controls */}
            <VibeToggles
                activeFilters={activeFilters}
                onToggle={toggleFilter}
                onClear={clearFilters}
            />

            {/* Main Map Area */}
            <div className="flex-1 relative h-[60vh] lg:h-full">
                <NeighborhoodExplorerMap
                    activeFilters={activeFilters}
                    onZoneHover={setHoveredZone}
                    onZoneSelect={setSelectedZone}
                    hoveredZone={hoveredZone}
                    selectedZone={selectedZone}
                />
            </div>

            {/* Side Panel */}
            <ExplorePanel
                hoveredZone={hoveredZone}
                selectedZone={selectedZone}
                activeFilters={activeFilters}
                onSelectZone={setSelectedZone}
            />
        </div>
    );
}

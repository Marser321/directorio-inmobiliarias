'use client';

import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';

// Types
interface VibeFilters {
    surf: boolean;
    nightlife: boolean;
    silence: boolean;
    forest: boolean;
    beach: boolean;
}

interface Zone {
    id: string;
    name: string;
    lat: number;
    lng: number;
    radius: number;
    vibes: {
        surf: boolean;
        nightlife: boolean;
        silence: boolean;
        forest: boolean;
        beach: boolean;
    };
    vibeScore: number;
    description: string;
}

interface NeighborhoodExplorerMapProps {
    activeFilters: VibeFilters;
    onZoneHover: (zone: string | null) => void;
    onZoneSelect: (zone: string | null) => void;
    hoveredZone: string | null;
    selectedZone: string | null;
}

// Punta del Este Center
const CENTER_LAT = -34.9126;
const CENTER_LNG = -54.8711;

// Zone data for Punta del Este
const ZONES: Zone[] = [
    {
        id: 'la-barra',
        name: 'La Barra',
        lat: -34.8580,
        lng: -54.7600,
        radius: 2500,
        vibes: { surf: true, nightlife: true, silence: false, forest: false, beach: true },
        vibeScore: 82,
        description: 'Epicentro del surf y la vida nocturna. Playa con olas consistentes.',
    },
    {
        id: 'jose-ignacio',
        name: 'José Ignacio',
        lat: -34.8330,
        lng: -54.6330,
        radius: 2000,
        vibes: { surf: true, nightlife: false, silence: true, forest: false, beach: true },
        vibeScore: 95,
        description: 'Exclusivo y tranquilo. El refugio de celebridades y millonarios.',
    },
    {
        id: 'punta-centro',
        name: 'Punta del Este Centro',
        lat: -34.9700,
        lng: -54.9500,
        radius: 2000,
        vibes: { surf: false, nightlife: true, silence: false, forest: false, beach: true },
        vibeScore: 75,
        description: 'El corazón de la península. Casinos, restaurantes y vida urbana.',
    },
    {
        id: 'punta-ballena',
        name: 'Punta Ballena',
        lat: -34.9100,
        lng: -55.0200,
        radius: 3000,
        vibes: { surf: false, nightlife: false, silence: true, forest: true, beach: false },
        vibeScore: 88,
        description: 'Casapueblo y vistas épicas. Naturaleza y tranquilidad absoluta.',
    },
    {
        id: 'manantiales',
        name: 'Manantiales',
        lat: -34.8450,
        lng: -54.7200,
        radius: 1800,
        vibes: { surf: true, nightlife: true, silence: false, forest: false, beach: true },
        vibeScore: 80,
        description: 'El equilibrio perfecto entre surf, gastronomía y vida nocturna.',
    },
    {
        id: 'montoya',
        name: 'Montoya',
        lat: -34.8900,
        lng: -54.8300,
        radius: 1500,
        vibes: { surf: true, nightlife: false, silence: true, forest: false, beach: true },
        vibeScore: 85,
        description: 'Surf local y atardeceres legendarios. Para los que saben.',
    },
    {
        id: 'bikini',
        name: 'Bikini',
        lat: -34.8700,
        lng: -54.8000,
        radius: 1200,
        vibes: { surf: true, nightlife: false, silence: true, forest: false, beach: true },
        vibeScore: 87,
        description: 'Playa virgen y tranquilidad. El secreto mejor guardado.',
    },
    {
        id: 'chihuahua',
        name: 'Chihuahua',
        lat: -34.8200,
        lng: -54.5800,
        radius: 2000,
        vibes: { surf: false, nightlife: false, silence: true, forest: true, beach: false },
        vibeScore: 92,
        description: 'Bosques, lagos y aislamiento total. Naturaleza en estado puro.',
    },
];

// Color schemes for different vibes
const VIBE_COLORS = {
    surf: { fill: '#3B82F6', stroke: '#1D4ED8' },       // Blue
    nightlife: { fill: '#EF4444', stroke: '#B91C1C' }, // Red
    silence: { fill: '#10B981', stroke: '#047857' },   // Green
    forest: { fill: '#84CC16', stroke: '#4D7C0F' },    // Lime
    beach: { fill: '#F59E0B', stroke: '#D97706' },     // Amber
    default: { fill: '#6B7280', stroke: '#374151' },   // Gray
};

// Get zone color based on active filters
function getZoneColor(zone: Zone, activeFilters: VibeFilters): { fill: string; stroke: string } {
    const activeKeys = Object.entries(activeFilters)
        .filter(([, active]) => active)
        .map(([key]) => key as keyof VibeFilters);

    if (activeKeys.length === 0) {
        // No filters: show based on dominant vibe
        if (zone.vibes.surf) return VIBE_COLORS.surf;
        if (zone.vibes.nightlife) return VIBE_COLORS.nightlife;
        if (zone.vibes.silence) return VIBE_COLORS.silence;
        return VIBE_COLORS.default;
    }

    // Check if zone matches any active filter
    const matches = activeKeys.filter(key => zone.vibes[key]);

    if (matches.length > 0) {
        // Return color of first matching filter
        return VIBE_COLORS[matches[0]];
    }

    return VIBE_COLORS.default;
}

// Check if zone matches active filters
function zoneMatchesFilters(zone: Zone, activeFilters: VibeFilters): boolean {
    const activeKeys = Object.entries(activeFilters)
        .filter(([, active]) => active)
        .map(([key]) => key as keyof VibeFilters);

    if (activeKeys.length === 0) return true;

    return activeKeys.some(key => zone.vibes[key]);
}

// Component to handle map interactions
function MapEvents({
    onZoneSelect
}: {
    onZoneSelect: (zone: string | null) => void;
}) {
    const map = useMap();

    useEffect(() => {
        map.on('click', (e) => {
            // Check if click was on empty space
            const target = e.originalEvent.target as HTMLElement;
            if (target.classList.contains('leaflet-container')) {
                onZoneSelect(null);
            }
        });
    }, [map, onZoneSelect]);

    return null;
}

export default function NeighborhoodExplorerMap({
    activeFilters,
    onZoneHover,
    onZoneSelect,
    hoveredZone,
    selectedZone,
}: NeighborhoodExplorerMapProps) {
    // Filter and sort zones
    const visibleZones = useMemo(() => {
        return ZONES.filter(zone => zoneMatchesFilters(zone, activeFilters))
            .sort((a, b) => b.vibeScore - a.vibeScore);
    }, [activeFilters]);

    return (
        <>
            {/* Global styles for heat effect */}
            <style jsx global>{`
        .zone-circle {
          transition: all 0.3s ease;
        }
        .zone-circle:hover {
          filter: brightness(1.2);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          backdrop-filter: blur(10px);
          background: rgba(255,255,255,0.95);
        }
        .leaflet-popup-content {
          margin: 16px 20px;
          font-family: var(--font-sans);
        }
        .leaflet-popup-tip {
          background: rgba(255,255,255,0.95);
        }
      `}</style>

            <MapContainer
                center={[CENTER_LAT, CENTER_LNG]}
                zoom={11}
                scrollWheelZoom={true}
                className="w-full h-full z-0"
                style={{ background: '#F8FAFC' }}
            >
                {/* Premium Dark Tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapEvents onZoneSelect={onZoneSelect} />

                {/* Zone Circles with Heat Effect */}
                {visibleZones.map((zone) => {
                    const isHovered = hoveredZone === zone.id;
                    const isSelected = selectedZone === zone.id;
                    const colors = getZoneColor(zone, activeFilters);
                    const matches = zoneMatchesFilters(zone, activeFilters);

                    return (
                        <Circle
                            key={zone.id}
                            center={[zone.lat, zone.lng]}
                            radius={zone.radius}
                            pathOptions={{
                                fillColor: colors.fill,
                                fillOpacity: matches ? (isHovered || isSelected ? 0.5 : 0.3) : 0.1,
                                color: colors.stroke,
                                weight: isHovered || isSelected ? 3 : 1,
                                opacity: matches ? 1 : 0.3,
                            }}
                            eventHandlers={{
                                mouseover: () => onZoneHover(zone.id),
                                mouseout: () => onZoneHover(null),
                                click: () => onZoneSelect(zone.id),
                            }}
                        >
                            <Popup>
                                <div className="min-w-[220px]">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-serif text-xl font-bold text-neutral-900">
                                            {zone.name}
                                        </h3>
                                        <span
                                            className="text-sm font-bold px-2 py-1 rounded-full"
                                            style={{
                                                backgroundColor: `${colors.fill}20`,
                                                color: colors.stroke
                                            }}
                                        >
                                            {zone.vibeScore}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-neutral-600 mb-3">
                                        {zone.description}
                                    </p>

                                    {/* Vibe Tags */}
                                    <div className="flex flex-wrap gap-1">
                                        {zone.vibes.surf && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                🏄 Surf
                                            </span>
                                        )}
                                        {zone.vibes.nightlife && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                                🌙 Nightlife
                                            </span>
                                        )}
                                        {zone.vibes.silence && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                                🧘 Silencio
                                            </span>
                                        )}
                                        {zone.vibes.forest && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-lime-100 text-lime-700">
                                                🌲 Bosque
                                            </span>
                                        )}
                                        {zone.vibes.beach && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                                🏖️ Playa
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Circle>
                    );
                })}
            </MapContainer>
        </>
    );
}

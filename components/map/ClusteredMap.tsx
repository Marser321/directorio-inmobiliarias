"use client"

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { PropertyWithLocation } from '@/hooks/usePropertySearch'
import { MapBounds } from '@/hooks/useMapBounds'
import Link from 'next/link'

// Custom gold marker icon for properties
const createPropertyIcon = (price: string, isHighlighted: boolean) => {
    return L.divIcon({
        className: 'custom-property-marker',
        html: `
            <div class="property-marker ${isHighlighted ? 'highlighted' : ''}">
                <span>${price}</span>
            </div>
        `,
        iconSize: [80, 32],
        iconAnchor: [40, 32],
    })
}

// Custom cluster icon - using any for cluster since @types/leaflet doesn't export MarkerCluster
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterCustomIcon = (cluster: any) => {
    const count = cluster.getChildCount()
    let size = 'small'
    let dimensions = 40

    if (count >= 10 && count < 50) {
        size = 'medium'
        dimensions = 50
    } else if (count >= 50) {
        size = 'large'
        dimensions = 60
    }

    return L.divIcon({
        html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
        className: 'custom-cluster-marker',
        iconSize: L.point(dimensions, dimensions),
    })
}

// Format price for marker display
const formatMarkerPrice = (price: number): string => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`
    if (price >= 1000) return `$${Math.round(price / 1000)}K`
    return `$${price}`
}

// Punta del Este Coordinates
const CENTER_LAT = -34.9126
const CENTER_LNG = -54.8711

interface MapEventsHandlerProps {
    onBoundsChange: (bounds: MapBounds) => void
    isSearchAsMove: boolean
}

function hasCoordinates(property: PropertyWithLocation): property is PropertyWithLocation & { lat: number; lng: number } {
    return (
        typeof property.lat === 'number' &&
        Number.isFinite(property.lat) &&
        typeof property.lng === 'number' &&
        Number.isFinite(property.lng)
    )
}

function MapEventsHandler({ onBoundsChange, isSearchAsMove }: MapEventsHandlerProps) {
    const map = useMapEvents({
        moveend: () => {
            if (isSearchAsMove) {
                const bounds = map.getBounds()
                onBoundsChange({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                })
            }
        },
    })
    return null
}

interface FitBoundsProps {
    properties: PropertyWithLocation[]
}

function FitBoundsToMarkers({ properties }: FitBoundsProps) {
    const map = useMap()

    useEffect(() => {
        if (properties.length > 0) {
            const validCoords = properties
                .filter(hasCoordinates)
                .map((property) => [property.lat, property.lng] as [number, number])

            if (validCoords.length > 0) {
                const bounds = L.latLngBounds(validCoords)
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
            }
        }
    }, [properties, map])

    return null
}

function PropertyMarkerPopup({ property }: { property: PropertyWithLocation }) {
    return (
        <div className="min-w-[200px] -m-3">
            {property.main_image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={property.main_image}
                    alt={property.title}
                    className="w-full h-24 object-cover rounded-t"
                />
            )}
            <div className="p-2">
                <h4 className="font-serif font-bold text-slate-900 text-sm line-clamp-1">
                    {property.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                    {property.location_name}
                </p>
                <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-[#D4AF37]">
                        {formatMarkerPrice(property.price)}
                    </span>
                    <Link
                        href={`/property/${property.id}`}
                        className="text-xs text-slate-600 hover:text-[#D4AF37] underline"
                    >
                        Ver más →
                    </Link>
                </div>
            </div>
        </div>
    )
}

interface ClusteredMapProps {
    properties: PropertyWithLocation[]
    highlightedPropertyId: number | null
    onBoundsChange: (bounds: MapBounds) => void
    onPropertyHover: (id: number | string | null) => void
    isSearchAsMove: boolean
    className?: string
}

export default function ClusteredMap({
    properties,
    highlightedPropertyId,
    onBoundsChange,
    onPropertyHover,
    isSearchAsMove,
    className,
}: ClusteredMapProps) {

    // Memoize markers to prevent unnecessary re-renders
    const markers = useMemo(() => {
        return properties
            .filter(hasCoordinates)
            .map(property => {
                const isHighlighted = property.id === highlightedPropertyId
                const icon = createPropertyIcon(
                    formatMarkerPrice(property.price),
                    isHighlighted
                )

                return (
                    <Marker
                        key={property.id}
                        position={[property.lat, property.lng]}
                        icon={icon}
                        eventHandlers={{
                            mouseover: () => onPropertyHover(property.id),
                            mouseout: () => onPropertyHover(null),
                        }}
                    >
                        <Popup className="property-popup">
                            <PropertyMarkerPopup property={property} />
                        </Popup>
                    </Marker>
                )
            })
    }, [properties, highlightedPropertyId, onPropertyHover])

    return (
        <div className={className}>
            <MapContainer
                center={[CENTER_LAT, CENTER_LNG]}
                zoom={11}
                scrollWheelZoom={false}
                className="w-full h-full z-0"
                style={{ background: '#f1f5f9' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={createClusterCustomIcon}
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                    zoomToBoundsOnClick={true}
                >
                    {markers}
                </MarkerClusterGroup>

                <MapEventsHandler
                    onBoundsChange={onBoundsChange}
                    isSearchAsMove={isSearchAsMove}
                />

                <FitBoundsToMarkers properties={properties} />
            </MapContainer>

            {/* CSS for custom markers */}
            <style jsx global>{`
                .property-marker {
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 16px;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    border: 2px solid #D4AF37;
                    transition: all 0.2s ease;
                }
                
                .property-marker.highlighted {
                    background: linear-gradient(135deg, #D4AF37 0%, #b8942a 100%);
                    transform: scale(1.15);
                    z-index: 1000 !important;
                    box-shadow: 0 4px 16px rgba(212, 175, 55, 0.5);
                }
                
                .cluster-marker {
                    background: linear-gradient(135deg, #D4AF37 0%, #b8942a 100%);
                    border: 3px solid white;
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
                }
                
                .cluster-small {
                    width: 40px;
                    height: 40px;
                    font-size: 12px;
                }
                
                .cluster-medium {
                    width: 50px;
                    height: 50px;
                    font-size: 14px;
                }
                
                .cluster-large {
                    width: 60px;
                    height: 60px;
                    font-size: 16px;
                }
                
                .property-popup .leaflet-popup-content-wrapper {
                    padding: 0;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .property-popup .leaflet-popup-content {
                    margin: 0;
                    padding: 0;
                }
                
                .property-popup .leaflet-popup-tip {
                    background: white;
                }
            `}</style>
        </div>
    )
}

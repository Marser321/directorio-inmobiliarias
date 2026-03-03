'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Leaflet with webpack
const customIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

interface LocationPickerMapProps {
    latitude?: number
    longitude?: number
    onLocationSelect: (lat: number, lng: number) => void
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

export default function LocationPickerMap({ latitude, longitude, onLocationSelect }: LocationPickerMapProps) {
    // Default center: Punta del Este, Uruguay
    const defaultCenter: [number, number] = [-34.9667, -54.9500]
    const hasCoordinates =
        typeof latitude === 'number' &&
        Number.isFinite(latitude) &&
        typeof longitude === 'number' &&
        Number.isFinite(longitude)
    const center: [number, number] = hasCoordinates
        ? [latitude, longitude]
        : defaultCenter

    return (
        <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            className="h-64 w-full"
            style={{ background: '#1a1a1a' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onLocationSelect={onLocationSelect} />
            {hasCoordinates && (
                <Marker position={[latitude, longitude]} icon={customIcon} />
            )}
        </MapContainer>
    )
}

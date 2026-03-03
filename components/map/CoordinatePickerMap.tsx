'use client'

import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const DEFAULT_CENTER: [number, number] = [-34.9667, -54.95]

interface CoordinatePickerMapProps {
  latitude?: number | null
  longitude?: number | null
  onLocationSelect: (lat: number, lng: number) => void
  className?: string
}

function hasCoordinates(lat?: number | null, lng?: number | null) {
  return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      onLocationSelect(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function MapCenterSync({ latitude, longitude }: { latitude?: number | null; longitude?: number | null }) {
  const map = useMap()

  useEffect(() => {
    if (!hasCoordinates(latitude, longitude)) return
    const lat = Number(latitude)
    const lng = Number(longitude)
    map.setView([lat, lng], Math.max(map.getZoom(), 13), { animate: true })
  }, [latitude, longitude, map])

  return null
}

export default function CoordinatePickerMap({
  latitude,
  longitude,
  onLocationSelect,
  className = 'h-64 w-full',
}: CoordinatePickerMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (hasCoordinates(latitude, longitude)) {
      return [Number(latitude), Number(longitude)]
    }
    return DEFAULT_CENTER
  }, [latitude, longitude])

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className={className}
      style={{ background: '#f8fafc' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onLocationSelect={onLocationSelect} />
      <MapCenterSync latitude={latitude} longitude={longitude} />

      {hasCoordinates(latitude, longitude) ? (
        <Marker position={[Number(latitude), Number(longitude)]} icon={markerIcon} />
      ) : null}
    </MapContainer>
  )
}

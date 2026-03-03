"use client"

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const CENTER_LAT = -34.9126
const CENTER_LNG = -54.8711

type MapPin = {
    id: number
    lat: number
    lng: number
    title: string
    price: number
    currency: string
}

type SearchRow = {
    id: number
    title: string
    lat: number | null
    lng: number | null
    price: number
    currency: string
}

function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price)
}

export default function LeafletMap() {
    const [pins, setPins] = useState<MapPin[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        fetch('/api/search/properties?limit=40&sort=relevance', {
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(payload?.error || 'No se pudo cargar el mapa')
                }

                const rows = Array.isArray(payload?.data) ? (payload.data as SearchRow[]) : []
                const nextPins = rows
                    .filter((row) => typeof row.lat === 'number' && typeof row.lng === 'number')
                    .map((row) => ({
                        id: row.id,
                        lat: row.lat as number,
                        lng: row.lng as number,
                        title: row.title,
                        price: row.price,
                        currency: row.currency || 'USD',
                    }))

                setPins(nextPins)
                setErrorMessage(null)
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') return
                const message = error instanceof Error ? error.message : 'No se pudo cargar el mapa'
                setPins([])
                setErrorMessage(message)
            })
            .finally(() => setIsLoading(false))

        return () => controller.abort()
    }, [])

    const hasPins = useMemo(() => pins.length > 0, [pins.length])

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={[CENTER_LAT, CENTER_LNG]}
                zoom={11}
                scrollWheelZoom={false}
                className="w-full h-full z-0"
                style={{ background: '#f1f5f9' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {pins.map((pin) => (
                    <Marker key={pin.id} position={[pin.lat, pin.lng]}>
                        <Popup>
                            <div className="text-center">
                                <strong className="block text-slate-900 font-serif">{pin.title}</strong>
                                <span className="text-[#C6A665] font-bold">{formatPrice(pin.price, pin.currency)}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {isLoading ? (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center text-sm text-slate-600">
                    Cargando mapa...
                </div>
            ) : null}

            {!isLoading && errorMessage ? (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-500/90 px-3 py-2 text-xs text-white">
                    {errorMessage}
                </div>
            ) : null}

            {!isLoading && !errorMessage && !hasPins ? (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-white">
                    No hay propiedades georreferenciadas para mostrar.
                </div>
            ) : null}
        </div>
    )
}

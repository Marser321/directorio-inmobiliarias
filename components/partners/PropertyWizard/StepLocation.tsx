'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UseFormReturn } from 'react-hook-form'
import { MapPin, Navigation } from 'lucide-react'
import dynamic from 'next/dynamic'
import { LocationData } from './schemas'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

// Dynamic import for Leaflet (SSR incompatible)
const LocationPickerMap = dynamic(
    () => import('./LocationPickerMap'),
    { ssr: false, loading: () => <div className="h-64 bg-muted/50 rounded-xl animate-pulse" /> }
)

interface Location {
    id: number
    name: string
    type: string
    parent_id: number | null
}

interface StepLocationProps {
    form: UseFormReturn<LocationData>
}

export function StepLocation({ form }: StepLocationProps) {
    const { register, formState: { errors }, watch, setValue } = form
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)

    const latitude = watch('latitude')
    const longitude = watch('longitude')
    const hasSelectedCoordinates =
        typeof latitude === 'number' &&
        Number.isFinite(latitude) &&
        typeof longitude === 'number' &&
        Number.isFinite(longitude)

    // Fetch locations from Supabase
    useEffect(() => {
        const fetchLocations = async () => {
            const supabase = getSupabaseBrowserClient()
            const { data, error } = await supabase
                .from('locations')
                .select('id, name, type, parent_id')
                .order('name')

            if (!error && data) {
                setLocations(data)
            }
            setLoading(false)
        }
        fetchLocations()
    }, [])

    // Group locations by parent for hierarchical display
    const groupedLocations = locations.reduce((acc, loc) => {
        const parentName = loc.parent_id
            ? locations.find(l => l.id === loc.parent_id)?.name || 'Otros'
            : 'Ciudades'
        if (!acc[parentName]) acc[parentName] = []
        acc[parentName].push(loc)
        return acc
    }, {} as Record<string, Location[]>)

    const handleMapClick = (lat: number, lng: number) => {
        setValue('latitude', lat, { shouldValidate: true })
        setValue('longitude', lng, { shouldValidate: true })
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Address */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Dirección *
                </label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        {...register('address')}
                        type="text"
                        placeholder="Ej: Rambla Lorenzo Batlle Pacheco 123, La Barra"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    />
                </div>
                {errors.address && (
                    <span className="text-xs text-red-400 mt-1 block">{errors.address.message}</span>
                )}
            </div>

            {/* Location Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Zona *
                </label>
                <select
                    {...register('location_id', { valueAsNumber: true })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    disabled={loading}
                >
                    <option value="">Selecciona una zona</option>
                    {Object.entries(groupedLocations).map(([group, locs]) => (
                        <optgroup key={group} label={group}>
                            {locs.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} {loc.type && `(${loc.type})`}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {errors.location_id && (
                    <span className="text-xs text-red-400 mt-1 block">{errors.location_id.message}</span>
                )}
            </div>

            {/* Interactive Map */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Ubicación en el Mapa
                    <span className="text-xs text-muted-foreground ml-2">(Haz clic para marcar)</span>
                </label>
                <div className="rounded-xl overflow-hidden border border-border">
                    <LocationPickerMap
                        latitude={latitude}
                        longitude={longitude}
                        onLocationSelect={handleMapClick}
                    />
                </div>

                {/* Coordinates Display */}
                {hasSelectedCoordinates && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <Navigation className="w-4 h-4 text-gold" />
                        <span>
                            Lat: <span className="text-foreground">{latitude.toFixed(6)}</span>,
                            Lng: <span className="text-foreground">{longitude.toFixed(6)}</span>
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}

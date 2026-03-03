'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import { updatePropertyAction } from '@/app/actions/update-property-action'
import { toast } from 'sonner'
import { Loader2, Upload, X, Home, MapPin, DollarSign, Navigation } from 'lucide-react'

const CoordinatePickerMap = dynamic(() => import('@/components/map/CoordinatePickerMap'), {
    ssr: false,
    loading: () => <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />,
})

type GeoPoint = {
    type?: string
    coordinates?: unknown[]
} | null

interface Property {
    id: number
    title: string
    slug: string
    description?: string
    price: number
    currency: string
    status: string
    location_id: number
    address?: string | null
    location_lat?: number | null
    location_lng?: number | null
    location_point_geojson?: GeoPoint
    agency_id?: number | null
    images?: string[]
    location?: { id: number; name: string }
    agency?: { id: number; name: string }
}

interface PropertyEditFormProps {
    property: Property
    locations: { id: number; name: string; type: string; center_lat?: number | null; center_lng?: number | null }[]
    agencies: { id: number; name: string }[]
}

function asFiniteNumber(value: unknown) {
    if (typeof value !== 'number') return null
    return Number.isFinite(value) ? value : null
}

function getInitialCoordinates(property: Property) {
    const directLat = asFiniteNumber(property.location_lat)
    const directLng = asFiniteNumber(property.location_lng)
    if (directLat !== null && directLng !== null) {
        return { latitude: directLat, longitude: directLng }
    }

    const coords = property.location_point_geojson?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
        const longitude = asFiniteNumber(coords[0])
        const latitude = asFiniteNumber(coords[1])
        if (latitude !== null && longitude !== null) {
            return { latitude, longitude }
        }
    }

    return { latitude: null, longitude: null }
}

export function PropertyEditForm({ property, locations, agencies }: PropertyEditFormProps) {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadedImages, setUploadedImages] = useState<string[]>(property.images || [])
    const initialCoordinates = getInitialCoordinates(property)

    const [formData, setFormData] = useState({
        title: property.title || '',
        description: property.description || '',
        price: property.price || 0,
        currency: property.currency || 'USD',
        status: property.status || 'for_sale',
        location_id: property.location_id || 0,
        address: property.address || '',
        latitude: initialCoordinates.latitude as number | null,
        longitude: initialCoordinates.longitude as number | null,
        agency_id: property.agency_id || null,
    })

    const selectedLocation = useMemo(
        () => locations.find((location) => location.id === formData.location_id),
        [locations, formData.location_id]
    )

    const hasCoordinates =
        typeof formData.latitude === 'number' &&
        Number.isFinite(formData.latitude) &&
        typeof formData.longitude === 'number' &&
        Number.isFinite(formData.longitude)

    const updateCoordinates = (latitude: number | null, longitude: number | null) => {
        setFormData((prev) => ({
            ...prev,
            latitude,
            longitude,
        }))
    }

    const handleLocationChange = (locationId: number) => {
        setFormData((prev) => ({
            ...prev,
            location_id: locationId,
        }))

        const nextLocation = locations.find((location) => location.id === locationId)
        if (
            typeof nextLocation?.center_lat === 'number' &&
            Number.isFinite(nextLocation.center_lat) &&
            typeof nextLocation?.center_lng === 'number' &&
            Number.isFinite(nextLocation.center_lng)
        ) {
            updateCoordinates(nextLocation.center_lat, nextLocation.center_lng)
        }
    }

    const applyLocationCentroid = () => {
        if (
            typeof selectedLocation?.center_lat === 'number' &&
            Number.isFinite(selectedLocation.center_lat) &&
            typeof selectedLocation?.center_lng === 'number' &&
            Number.isFinite(selectedLocation.center_lng)
        ) {
            updateCoordinates(selectedLocation.center_lat, selectedLocation.center_lng)
            toast.success('Coordenadas actualizadas al centro de la zona.')
            return
        }

        toast.error('La zona seleccionada no tiene centro geográfico configurado.')
    }

    // Handle Image Upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const files = Array.from(e.target.files)
        const newUrls: string[] = []

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(filePath)

                newUrls.push(publicUrl)
            }
            setUploadedImages((prev) => [...prev, ...newUrls])
            toast.success('Imágenes agregadas')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido'
            toast.error('Error subiendo imágenes: ' + message)
        } finally {
            setUploading(false)
        }
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updatePropertyAction(property.id, {
            ...formData,
            address: formData.address.trim() || null,
            images: uploadedImages
        })

        setLoading(false)
        if (result.success) {
            toast.success(result.message)
            router.push('/admin/properties')
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información Básica */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Información Básica
                </h2>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={5}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="for_sale">En Venta</SelectItem>
                                <SelectItem value="for_rent">En Alquiler</SelectItem>
                                <SelectItem value="sold">Vendida</SelectItem>
                                <SelectItem value="rented">Alquilada</SelectItem>
                                <SelectItem value="reserved">Reservada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            {/* Precio */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Precio
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="price">Precio *</Label>
                        <Input
                            id="price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select
                            value={formData.currency}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="UYU">UYU</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            {/* Ubicación y Agencia */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Ubicación y Agencia
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Ubicación *</Label>
                        <Select
                            value={formData.location_id.toString()}
                            onValueChange={(v) => handleLocationChange(Number(v))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id.toString()}>
                                        {loc.name} ({loc.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección / Referencia</Label>
                        <Input
                            id="address"
                            placeholder="Ej: Rambla Lorenzo Batlle Pacheco 123"
                            value={formData.address}
                            onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Agencia</Label>
                        <Select
                            value={formData.agency_id?.toString() || ''}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, agency_id: v ? Number(v) : null }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sin agencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin agencia</SelectItem>
                                {agencies.map((ag) => (
                                    <SelectItem key={ag.id} value={ag.id.toString()}>
                                        {ag.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">Coordenadas del anuncio</p>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={applyLocationCentroid}>
                                Usar centro de zona
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateCoordinates(null, null)}
                            >
                                Limpiar
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="latitude">Latitud</Label>
                            <Input
                                id="latitude"
                                type="number"
                                step="0.000001"
                                min="-90"
                                max="90"
                                value={formData.latitude ?? ''}
                                onChange={(event) => {
                                    const value = event.target.value.trim()
                                    setFormData((prev) => ({
                                        ...prev,
                                        latitude: value === '' ? null : Number(value),
                                    }))
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="longitude">Longitud</Label>
                            <Input
                                id="longitude"
                                type="number"
                                step="0.000001"
                                min="-180"
                                max="180"
                                value={formData.longitude ?? ''}
                                onChange={(event) => {
                                    const value = event.target.value.trim()
                                    setFormData((prev) => ({
                                        ...prev,
                                        longitude: value === '' ? null : Number(value),
                                    }))
                                }}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-border">
                        <CoordinatePickerMap
                            latitude={formData.latitude}
                            longitude={formData.longitude}
                            onLocationSelect={(latitude, longitude) => updateCoordinates(latitude, longitude)}
                            className="h-64 w-full"
                        />
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-gold" />
                        {hasCoordinates
                            ? `Lat ${formData.latitude?.toFixed(6)} / Lng ${formData.longitude?.toFixed(6)}`
                            : 'Haz clic en el mapa o ingresa coordenadas manualmente.'}
                    </p>
                </div>
            </section>

            {/* Imágenes */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6">Imágenes</h2>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                {uploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Upload className="w-5 h-5" />
                                )}
                                <span>Agregar Imágenes</span>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                            {uploadedImages.map((url, i) => (
                                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                                    <Image
                                        src={url}
                                        alt={`Image ${i + 1}`}
                                        fill
                                        unoptimized
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="object-cover w-full h-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading || uploading}
                    className="bg-slate-900 hover:bg-slate-800 text-white min-w-[160px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        'Guardar Cambios'
                    )}
                </Button>
            </div>
        </form>
    )
}

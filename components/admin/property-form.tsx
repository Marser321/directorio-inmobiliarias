'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { createPropertyAction } from '@/app/actions/create-property-action'
import { toast } from 'sonner'
import { Loader2, Navigation, X } from 'lucide-react'
import Image from 'next/image'

const CoordinatePickerMap = dynamic(() => import('@/components/map/CoordinatePickerMap'), {
    ssr: false,
    loading: () => <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />,
})

interface LocationOption {
    id: number | string
    name: string
    type: string
    center_lat?: number | null
    center_lng?: number | null
}

interface AgencyOption {
    id: number | string
    name: string
}

export function PropertyForm() {
    const router = useRouter()
    const supabase = createClient()

    // State
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [locations, setLocations] = useState<LocationOption[]>([])
    const [agencies, setAgencies] = useState<AgencyOption[]>([])
    const [uploadedImages, setUploadedImages] = useState<string[]>([])
    const [currency, setCurrency] = useState<'USD' | 'UYU'>('USD')
    const [status, setStatus] = useState<'for_sale' | 'for_rent' | 'sold' | 'rented' | 'reserved'>('for_sale')
    const [locationId, setLocationId] = useState<string>('')
    const [agencyId, setAgencyId] = useState<string>('')
    const [address, setAddress] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)

    // Load dependencies (Locations, Agencies)
    useEffect(() => {
        const loadData = async () => {
            const { data: locs } = await supabase
                .from('locations')
                .select('id, name, type, center_lat, center_lng')
                .order('name')
            const { data: ags } = await supabase.from('agencies').select('id, name').order('name')
            if (locs) setLocations(locs)
            if (ags) setAgencies(ags)
        }
        loadData()
    }, [supabase])

    const selectedLocation = locations.find((location) => location.id.toString() === locationId)
    const hasCoordinates =
        typeof latitude === 'number' &&
        Number.isFinite(latitude) &&
        typeof longitude === 'number' &&
        Number.isFinite(longitude)

    const applyLocationCentroid = () => {
        if (
            typeof selectedLocation?.center_lat === 'number' &&
            Number.isFinite(selectedLocation.center_lat) &&
            typeof selectedLocation?.center_lng === 'number' &&
            Number.isFinite(selectedLocation.center_lng)
        ) {
            setLatitude(selectedLocation.center_lat)
            setLongitude(selectedLocation.center_lng)
            toast.success('Coordenadas ajustadas al centro de zona.')
            return
        }

        toast.error('La zona seleccionada no tiene centro geográfico configurado.')
    }

    const handleLocationSelect = (value: string) => {
        setLocationId(value)

        const nextLocation = locations.find((location) => location.id.toString() === value)
        if (
            typeof nextLocation?.center_lat === 'number' &&
            Number.isFinite(nextLocation.center_lat) &&
            typeof nextLocation?.center_lng === 'number' &&
            Number.isFinite(nextLocation.center_lng) &&
            !hasCoordinates
        ) {
            setLatitude(nextLocation.center_lat)
            setLongitude(nextLocation.center_lng)
        }
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
                const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${fileName}`

                // Upload to the shared property media bucket
                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filePath, file)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw uploadError
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(filePath)

                newUrls.push(publicUrl)
            }
            setUploadedImages((prev) => [...prev, ...newUrls])
            toast.success('Imágenes subidas')
        } catch {
            toast.error('Error subiendo imágenes: verificá que el bucket "property-images" exista y sea público.')
        } finally {
            setUploading(false)
        }
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!locationId) {
            toast.error('Selecciona una ubicación antes de crear la propiedad.')
            return
        }

        if (!agencyId) {
            toast.error('Selecciona una agencia antes de crear la propiedad.')
            return
        }

        const coordinatesProvided = latitude !== null || longitude !== null
        if (coordinatesProvided && !hasCoordinates) {
            toast.error('Si completas coordenadas, debes ingresar latitud y longitud válidas.')
            return
        }

        setLoading(true)

        const formData = new FormData(e.currentTarget)
        // Add images
        formData.set('images_urls', uploadedImages.join(','))
        formData.set('currency', currency)
        formData.set('status', status)
        formData.set('location_id', locationId)
        formData.set('agency_id', agencyId)
        formData.set('address', address.trim())
        formData.set('latitude', hasCoordinates ? String(latitude) : '')
        formData.set('longitude', hasCoordinates ? String(longitude) : '')

        const result = await createPropertyAction(formData)

        setLoading(false)
        if (result.success) {
            toast.success('Propiedad creada!')
            router.push('/admin/properties')
            router.refresh()
        } else {
            toast.error('Error: ' + result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl shadow-sm border">
            <div className="space-y-2">
                <Label htmlFor="title">Título de la Propiedad</Label>
                <Input id="title" name="title" placeholder="Ej: Villa en La Barra" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Precio</Label>
                    <Input id="price" name="price" type="number" placeholder="0" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'UYU')}>
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

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
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
                <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Select
                        value={locationId}
                        onValueChange={handleLocationSelect}
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
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
                    <Label htmlFor="agency">Agencia</Label>
                    <Select value={agencyId} onValueChange={(value) => setAgencyId(value)} required>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar agencia..." />
                        </SelectTrigger>
                        <SelectContent>
                            {agencies.map((ag) => (
                                <SelectItem key={ag.id} value={ag.id.toString()}>
                                    {ag.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/70 p-4 bg-background/40">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Ubicación precisa</p>
                    <Button type="button" variant="outline" size="sm" onClick={applyLocationCentroid}>
                        Usar centro de zona
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Dirección / Referencia</Label>
                    <Input
                        id="address"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Ej: Rambla Lorenzo Batlle Pacheco 123"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="latitude">Latitud</Label>
                        <Input
                            id="latitude"
                            type="number"
                            step="0.000001"
                            min="-90"
                            max="90"
                            value={latitude ?? ''}
                            onChange={(event) => {
                                const value = event.target.value.trim()
                                setLatitude(value === '' ? null : Number(value))
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
                            value={longitude ?? ''}
                            onChange={(event) => {
                                const value = event.target.value.trim()
                                setLongitude(value === '' ? null : Number(value))
                            }}
                        />
                    </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-border">
                    <CoordinatePickerMap
                        latitude={latitude}
                        longitude={longitude}
                        onLocationSelect={(nextLat, nextLng) => {
                            setLatitude(nextLat)
                            setLongitude(nextLng)
                        }}
                        className="h-64 w-full"
                    />
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-gold" />
                    {hasCoordinates
                        ? `Lat ${latitude?.toFixed(6)} / Lng ${longitude?.toFixed(6)}`
                        : 'Haz clic en el mapa para fijar la ubicación exacta.'}
                </p>
            </div>

            <div className="space-y-2">
                <Label>Imágenes</Label>
                <div className="flex items-center gap-4">
                    <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                    {uploading && <Loader2 className="animate-spin h-5 w-5" />}
                </div>

                {/* Preview */}
                {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {uploadedImages.map((url, i) => (
                            <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-slate-100">
                                <Image src={url} alt="Uploaded" fill className="object-cover w-full h-full" unoptimized />
                                <button
                                    type="button"
                                    onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" placeholder="Detalles de la propiedad..." rows={5} />
            </div>

            <Button type="submit" disabled={loading || uploading} className="w-full bg-slate-900 text-white">
                {loading ? 'Guardando...' : 'Crear Propiedad'}
            </Button>
        </form>
    )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Loader2, MapPin, Navigation } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const CoordinatePickerMap = dynamic(() => import('@/components/map/CoordinatePickerMap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />,
})

type PropertyStatus = 'for_sale' | 'for_rent' | 'sold' | 'rented' | 'reserved'

type GeoPoint = {
  type?: string
  coordinates?: unknown[]
} | null

interface EditableProperty {
  id: number
  title: string
  description: string | null
  price: number
  status: PropertyStatus
  location_id: number | null
  address: string | null
  location_lat?: number | null
  location_lng?: number | null
  location_point_geojson?: GeoPoint
}

interface LocationOption {
  id: number
  name: string
  type: string
  center_lat?: number | null
  center_lng?: number | null
}

const STATUS_LABELS: Record<PropertyStatus, string> = {
  for_sale: 'En Venta',
  for_rent: 'En Alquiler',
  sold: 'Vendida',
  rented: 'Alquilada',
  reserved: 'Reservada',
}

function asFiniteNumber(value: unknown) {
  if (typeof value !== 'number') return null
  return Number.isFinite(value) ? value : null
}

function extractCoordinates(property: EditableProperty) {
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

export default function PartnerPropertyEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const propertyId = useMemo(() => Number(params?.id || ''), [params?.id])
  const isValidPropertyId = Number.isFinite(propertyId) && propertyId > 0

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [property, setProperty] = useState<EditableProperty | null>(null)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<PropertyStatus>('for_sale')
  const [locationId, setLocationId] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  useEffect(() => {
    if (!isValidPropertyId) {
      return
    }

    let active = true

    const fetchProperty = async () => {
      const response = await fetch(`/api/partners/properties/${propertyId}`, { cache: 'no-store' })
      const payload = await response.json()
      const supabase = getSupabaseBrowserClient()
      const { data: locationRows, error: locationError } = await supabase
        .from('locations')
        .select('id, name, type, center_lat, center_lng')
        .order('name')

      if (!active) return

      if (!response.ok || !payload?.data?.property) {
        toast.error(payload?.error || 'No se pudo cargar la propiedad para edición.')
        setLoading(false)
        return
      }

      if (!locationError && Array.isArray(locationRows)) {
        setLocations(locationRows as LocationOption[])
      }

      const data = payload.data.property as EditableProperty
      const coordinates = extractCoordinates(data)
      setProperty(data)
      setTitle(data.title || '')
      setDescription(data.description || '')
      setPrice(String(data.price ?? ''))
      setStatus((data.status as PropertyStatus) || 'for_sale')
      setLocationId(typeof data.location_id === 'number' ? data.location_id : null)
      setAddress(data.address || '')
      setLatitude(coordinates.latitude)
      setLongitude(coordinates.longitude)
      setLoading(false)
    }

    void fetchProperty()

    return () => {
      active = false
    }
  }, [isValidPropertyId, propertyId])

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === locationId),
    [locations, locationId]
  )

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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!property) return

    const parsedPrice = Number(price)
    if (!title.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error('Completá título y precio válido antes de guardar.')
      return
    }

    if (!locationId) {
      toast.error('Selecciona una zona para la propiedad.')
      return
    }

    const coordinatesProvided = latitude !== null || longitude !== null
    const coordinatesComplete = hasCoordinates
    if (coordinatesProvided && !coordinatesComplete) {
      toast.error('Si completas coordenadas, debes ingresar latitud y longitud válidas.')
      return
    }

    setSaving(true)

    const response = await fetch(`/api/partners/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        status,
        location_id: locationId,
        address: address.trim() || null,
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
      }),
    })

    const payload = await response.json()

    setSaving(false)

    if (!response.ok) {
      toast.error(payload?.error || 'No se pudo guardar la propiedad.')
      return
    }

    toast.success('Propiedad actualizada correctamente.')
    router.push('/partners/dashboard')
    router.refresh()
  }

  if (!isValidPropertyId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">El identificador de propiedad no es válido.</p>
          <Link href="/partners/dashboard" className="text-gold hover:underline">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">No se encontró la propiedad solicitada.</p>
          <Link href="/partners/dashboard" className="text-gold hover:underline">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/partners/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            Editar <span className="text-gold">Propiedad</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Ajustá datos principales de la publicación.
          </p>
        </div>

        <form onSubmit={handleSave} className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Título
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-foreground mb-2">
                Precio
              </label>
              <input
                id="price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as PropertyStatus)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
              >
                {(Object.keys(STATUS_LABELS) as PropertyStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/70 p-4 bg-background/40">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                Ubicación de la propiedad
              </p>
              <button
                type="button"
                onClick={applyLocationCentroid}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-gold hover:text-gold transition-colors"
              >
                Usar centro de zona
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location_id" className="block text-sm font-medium text-foreground mb-2">
                  Zona
                </label>
                <select
                  id="location_id"
                  value={locationId ?? ''}
                  onChange={(event) => {
                    const nextLocationId = Number(event.target.value)
                    setLocationId(Number.isFinite(nextLocationId) && nextLocationId > 0 ? nextLocationId : null)
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                >
                  <option value="">Seleccionar zona</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                  Dirección / Referencia
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Ej: Rambla Lorenzo Batlle Pacheco 123"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-foreground mb-2">
                  Latitud
                </label>
                <input
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
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-foreground mb-2">
                  Longitud
                </label>
                <input
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
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
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

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full btn-luxe py-3 px-6 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

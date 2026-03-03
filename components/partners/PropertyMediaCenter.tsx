'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  Save,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'
import { LuxeStudioRail } from '@/components/partners/LuxeStudioRail'
import type { LuxeStudioRequestType, PropertyAssetHealth } from '@/types/domain'

type PropertyStatus = 'for_sale' | 'for_rent' | 'sold' | 'rented' | 'reserved' | string

type PropertyResponse = {
  id: number
  title: string
  slug: string | null
  price: number
  currency: string
  status: PropertyStatus
  features?: Record<string, unknown> | null
  view_count?: number | null
  main_image?: string | null
  video_url?: string | null
  virtual_tour_url?: string | null
}

type RawMediaRow = {
  id?: string | number
  media_type?: 'image' | 'video' | 'tour360' | 'floorplan' | string
  url?: string
  key?: string | null
  display_order?: number
  is_primary?: boolean
  metadata?: Record<string, unknown> | null
}

type MediaItem = {
  id?: string | number
  media_type: 'image' | 'video' | 'tour360' | 'floorplan'
  url: string
  key: string | null
  display_order: number
  is_primary: boolean
  metadata: Record<string, unknown>
}

type ImageQualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

type ImageQualityMetrics = {
  score: number
  level: ImageQualityLevel
  sharpness: number
  exposure: number
  contrast: number
  composition: number
  notes: string[]
  checked_at: string
}

type PropertyCoverageType = 'house' | 'apartment' | 'land' | 'commercial' | 'generic'

type CoveragePreset = {
  label: string
  minPhotos: number
  requiresVideo: boolean
  requiresTour360: boolean
  focusPoints: string[]
}

const COVERAGE_PRESETS: Record<PropertyCoverageType, CoveragePreset> = {
  house: {
    label: 'Casa',
    minPhotos: 12,
    requiresVideo: true,
    requiresTour360: true,
    focusPoints: ['Fachada y acceso', 'Living/comedor', 'Exterior y amenities'],
  },
  apartment: {
    label: 'Apartamento',
    minPhotos: 9,
    requiresVideo: true,
    requiresTour360: false,
    focusPoints: ['Living y vista', 'Cocina y dormitorios', 'Amenities del edificio'],
  },
  land: {
    label: 'Terreno',
    minPhotos: 6,
    requiresVideo: false,
    requiresTour360: false,
    focusPoints: ['Frente y fondo', 'Entorno inmediato', 'Accesos y referencias'],
  },
  commercial: {
    label: 'Comercial',
    minPhotos: 10,
    requiresVideo: true,
    requiresTour360: true,
    focusPoints: ['Frente comercial', 'Flujo interior', 'Infraestructura y servicios'],
  },
  generic: {
    label: 'General',
    minPhotos: 8,
    requiresVideo: true,
    requiresTour360: false,
    focusPoints: ['Cobertura completa', 'Espacios clave', 'Contexto de zona'],
  },
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function toImageKey(item: { id?: string | number; url: string }) {
  return String(item.id || item.url)
}

function resolveQualityLevel(score: number): ImageQualityLevel {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 55) return 'fair'
  if (score > 0) return 'poor'
  return 'unknown'
}

function parseStoredQuality(metadata: Record<string, unknown>): ImageQualityMetrics | null {
  const quality = metadata.quality
  if (!quality || typeof quality !== 'object') return null
  const source = quality as Record<string, unknown>
  const score = typeof source.score === 'number' && Number.isFinite(source.score) ? clamp(source.score) : null
  if (score === null) return null

  return {
    score,
    level: resolveQualityLevel(score),
    sharpness:
      typeof source.sharpness === 'number' && Number.isFinite(source.sharpness) ? clamp(source.sharpness) : score,
    exposure:
      typeof source.exposure === 'number' && Number.isFinite(source.exposure) ? clamp(source.exposure) : score,
    contrast:
      typeof source.contrast === 'number' && Number.isFinite(source.contrast) ? clamp(source.contrast) : score,
    composition:
      typeof source.composition === 'number' && Number.isFinite(source.composition) ? clamp(source.composition) : score,
    notes:
      Array.isArray(source.notes) && source.notes.every((note) => typeof note === 'string')
        ? (source.notes as string[]).slice(0, 3)
        : [],
    checked_at:
      typeof source.checked_at === 'string' && source.checked_at.length > 0 ? source.checked_at : new Date().toISOString(),
  }
}

function getQualityBadgeClass(level: ImageQualityLevel) {
  if (level === 'excellent') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (level === 'good') return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
  if (level === 'fair') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (level === 'poor') return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
  return 'border-border/70 bg-background/70 text-muted-foreground'
}

function getQualityLabel(level: ImageQualityLevel) {
  if (level === 'excellent') return 'Excelente'
  if (level === 'good') return 'Buena'
  if (level === 'fair') return 'Aceptable'
  if (level === 'poor') return 'Baja'
  return 'Sin análisis'
}

function loadImageForAnalysis(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar imagen para análisis'))
    image.src = url
  })
}

async function analyzeImageQuality(url: string): Promise<ImageQualityMetrics> {
  try {
    const image = await loadImageForAnalysis(url)
    const maxDimension = 320
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const width = Math.max(64, Math.round(image.width * scale))
    const height = Math.max(64, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('Canvas context unavailable')
    }

    ctx.drawImage(image, 0, 0, width, height)
    const data = ctx.getImageData(0, 0, width, height).data
    const gray = new Float32Array(width * height)

    let sum = 0
    for (let i = 0; i < gray.length; i += 1) {
      const offset = i * 4
      const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]
      gray[i] = luminance
      sum += luminance
    }

    const mean = sum / gray.length
    let varianceAccumulator = 0
    for (let i = 0; i < gray.length; i += 1) {
      const delta = gray[i] - mean
      varianceAccumulator += delta * delta
    }
    const stdDev = Math.sqrt(varianceAccumulator / gray.length)

    let lapSum = 0
    let lapSqSum = 0
    let lapCount = 0
    const thirdsEnergy = new Array(9).fill(0) as number[]
    let totalEnergy = 0

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x
        const center = gray[index]
        const left = gray[index - 1]
        const right = gray[index + 1]
        const top = gray[index - width]
        const bottom = gray[index + width]

        const lap = 4 * center - left - right - top - bottom
        lapSum += lap
        lapSqSum += lap * lap
        lapCount += 1

        const gx = right - left
        const gy = bottom - top
        const energy = Math.abs(gx) + Math.abs(gy)
        totalEnergy += energy

        const cellX = Math.min(2, Math.floor((x / width) * 3))
        const cellY = Math.min(2, Math.floor((y / height) * 3))
        thirdsEnergy[cellY * 3 + cellX] += energy
      }
    }

    const lapMean = lapCount > 0 ? lapSum / lapCount : 0
    const lapVariance = lapCount > 0 ? lapSqSum / lapCount - lapMean * lapMean : 0

    const exposureScore = clamp(100 - Math.abs(mean - 128) * 1.6)
    const contrastScore = clamp((stdDev / 64) * 100)
    const sharpnessScore = clamp((lapVariance / 900) * 100)

    let compositionScore = 45
    if (totalEnergy > 0) {
      const normalized = thirdsEnergy.map((value) => value / totalEnergy)
      const entropy = normalized.reduce((acc, value) => (value > 0 ? acc - value * Math.log(value) : acc), 0)
      const normalizedEntropy = entropy / Math.log(9)
      const centerRatio = normalized[4]
      const centerBonus = centerRatio >= 0.12 && centerRatio <= 0.45 ? 10 : -8
      compositionScore = clamp(normalizedEntropy * 90 + centerBonus)
    }

    const score = clamp(sharpnessScore * 0.35 + exposureScore * 0.25 + contrastScore * 0.2 + compositionScore * 0.2)
    const notes: string[] = []
    if (sharpnessScore < 45) notes.push('Mejorar nitidez o estabilización')
    if (exposureScore < 45) notes.push('Ajustar exposición/iluminación')
    if (contrastScore < 45) notes.push('Incrementar contraste visual')
    if (compositionScore < 45) notes.push('Revisar encuadre y balance de planos')

    return {
      score,
      level: resolveQualityLevel(score),
      sharpness: sharpnessScore,
      exposure: exposureScore,
      contrast: contrastScore,
      composition: compositionScore,
      notes: notes.slice(0, 3),
      checked_at: new Date().toISOString(),
    }
  } catch {
    return {
      score: 0,
      level: 'unknown',
      sharpness: 0,
      exposure: 0,
      contrast: 0,
      composition: 0,
      notes: ['No se pudo analizar automáticamente esta imagen'],
      checked_at: new Date().toISOString(),
    }
  }
}

function resolveCoverageType(property: PropertyResponse | null): PropertyCoverageType {
  if (!property?.features || typeof property.features !== 'object') return 'generic'

  const features = property.features as Record<string, unknown>
  const rawType = typeof features.type === 'string' ? features.type : typeof features.property_type === 'string' ? features.property_type : ''
  const normalized = rawType.trim().toLowerCase()

  if (normalized === 'house') return 'house'
  if (normalized === 'apartment') return 'apartment'
  if (normalized === 'land') return 'land'
  if (normalized === 'commercial') return 'commercial'
  return 'generic'
}

function toMediaItems(input: RawMediaRow[]): MediaItem[] {
  return input
    .map((item, index) => {
      const mediaType: MediaItem['media_type'] =
        item.media_type === 'video' || item.media_type === 'tour360' || item.media_type === 'floorplan'
          ? item.media_type
          : 'image'

      return {
        id: item.id,
        media_type: mediaType,
        url: typeof item.url === 'string' ? item.url : '',
        key: typeof item.key === 'string' ? item.key : null,
        display_order: Number.isFinite(item.display_order) ? Number(item.display_order) : index,
        is_primary: item.is_primary === true,
        metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
      }
    })
    .filter((item) => item.url.length > 0)
    .sort((a, b) => a.display_order - b.display_order)
}

function toAssetHealth(photosCount: number, hasVideo: boolean, hasTour: boolean): PropertyAssetHealth {
  if (photosCount >= 5 && hasVideo && hasTour) return 'healthy'
  if (photosCount >= 3 || hasVideo || hasTour) return 'needs_media'
  return 'critical'
}

function toEmbedUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)

    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }

    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      if (id) return `https://player.vimeo.com/video/${id}`
    }
  } catch {
    return null
  }

  return null
}

function AssetHealthBadge({ health }: { health: PropertyAssetHealth }) {
  const classes: Record<PropertyAssetHealth, string> = {
    healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    needs_media: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    critical: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  }

  const labels: Record<PropertyAssetHealth, string> = {
    healthy: 'Asset completo',
    needs_media: 'Asset parcial',
    critical: 'Asset crítico',
  }

  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', classes[health])}>{labels[health]}</span>
}

export function PropertyMediaCenter() {
  const params = useParams<{ id: string }>()
  const propertyId = Number(params?.id || '')
  const isValidPropertyId = Number.isFinite(propertyId) && propertyId > 0

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [property, setProperty] = useState<PropertyResponse | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [tourUrl, setTourUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [qualityByImage, setQualityByImage] = useState<Record<string, ImageQualityMetrics>>({})

  useEffect(() => {
    if (!isValidPropertyId) {
      setErrorMessage('El identificador de propiedad no es válido.')
      setLoading(false)
      return
    }

    let active = true

    const fetchData = async () => {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/partners/properties/${propertyId}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!active) return

      if (!response.ok || !payload?.data?.property) {
        setErrorMessage(payload?.error || 'No se pudo cargar la propiedad para Media Center.')
        setProperty(null)
        setMedia([])
        setLoading(false)
        return
      }

      const loadedProperty = payload.data.property as PropertyResponse
      const loadedMedia = toMediaItems((payload.data.media || []) as RawMediaRow[])
      const initialQuality: Record<string, ImageQualityMetrics> = {}

      loadedMedia
        .filter((item) => item.media_type === 'image')
        .forEach((item) => {
          const parsed = parseStoredQuality(item.metadata)
          if (!parsed) return
          initialQuality[toImageKey(item)] = parsed
        })

      setProperty(loadedProperty)
      setMedia(loadedMedia)
      setQualityByImage(initialQuality)
      setVideoUrl(loadedProperty.video_url || loadedMedia.find((item) => item.media_type === 'video')?.url || '')
      setTourUrl(loadedProperty.virtual_tour_url || loadedMedia.find((item) => item.media_type === 'tour360')?.url || '')
      setLoading(false)
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [isValidPropertyId, propertyId])

  const photos = useMemo(
    () => media.filter((item) => item.media_type === 'image').sort((a, b) => a.display_order - b.display_order),
    [media]
  )

  const pendingQualityPhotos = useMemo(
    () => photos.filter((photo) => !qualityByImage[toImageKey(photo)]),
    [photos, qualityByImage]
  )

  const primaryPhotoId = useMemo(() => {
    const explicit = photos.find((item) => item.is_primary)
    return explicit?.id || explicit?.url || photos[0]?.id || photos[0]?.url || null
  }, [photos])

  const embedVideoUrl = useMemo(() => toEmbedUrl(videoUrl), [videoUrl])
  const embedTourUrl = useMemo(() => toEmbedUrl(tourUrl), [tourUrl])

  const assetHealth = useMemo(
    () => toAssetHealth(photos.length, Boolean(videoUrl.trim()), Boolean(tourUrl.trim())),
    [photos.length, tourUrl, videoUrl]
  )

  const coverageType = useMemo(() => resolveCoverageType(property), [property])
  const coveragePreset = COVERAGE_PRESETS[coverageType]
  const meetsPhotoTarget = photos.length >= coveragePreset.minPhotos
  const meetsVideoTarget = coveragePreset.requiresVideo ? Boolean(videoUrl.trim()) : true
  const meetsTourTarget = coveragePreset.requiresTour360 ? Boolean(tourUrl.trim()) : true
  const qualityEvaluated = photos
    .map((photo) => qualityByImage[toImageKey(photo)] || null)
    .filter((entry): entry is ImageQualityMetrics => entry !== null && entry.level !== 'unknown')
  const qualityGoodCount = qualityEvaluated.filter((entry) => entry.score >= 70).length
  const qualityRatio = qualityEvaluated.length > 0 ? qualityGoodCount / qualityEvaluated.length : 0
  const minimumEvaluatedImages = photos.length > 0 ? Math.min(photos.length, 4) : 0
  const meetsQualityTarget =
    photos.length > 0 && qualityEvaluated.length >= minimumEvaluatedImages && qualityRatio >= 0.6

  const coverageChecklist = [
    {
      key: 'photos',
      label: `${coveragePreset.minPhotos}+ fotos`,
      done: meetsPhotoTarget,
      detail: `${photos.length}/${coveragePreset.minPhotos}`,
    },
    {
      key: 'video',
      label: coveragePreset.requiresVideo ? 'Video activo' : 'Video opcional',
      done: meetsVideoTarget,
      detail: coveragePreset.requiresVideo ? (videoUrl.trim() ? 'Configurado' : 'Pendiente') : 'No obligatorio',
    },
    {
      key: 'tour360',
      label: coveragePreset.requiresTour360 ? 'Tour 360 activo' : 'Tour 360 opcional',
      done: meetsTourTarget,
      detail: coveragePreset.requiresTour360 ? (tourUrl.trim() ? 'Configurado' : 'Pendiente') : 'No obligatorio',
    },
    {
      key: 'quality',
      label: 'Calidad visual mínima',
      done: meetsQualityTarget,
      detail:
        photos.length === 0
          ? 'Sin fotos'
          : qualityEvaluated.length === 0
            ? 'Analizando...'
            : `${qualityGoodCount}/${qualityEvaluated.length} fotos con score >= 70`,
    },
  ] as const

  const coverageCompletedCount = coverageChecklist.filter((item) => item.done).length
  const coverageCompletion = Math.round((coverageCompletedCount / coverageChecklist.length) * 100)
  const missingCoverageActions = coverageChecklist.filter((item) => !item.done).map((item) => item.label)
  const recommendedServices = useMemo(() => {
    const services: LuxeStudioRequestType[] = []
    if (!meetsPhotoTarget || !meetsQualityTarget) {
      services.push('property_photos')
    }
    if (!meetsVideoTarget || !meetsTourTarget) {
      services.push('video_tour')
    }
    return services
  }, [meetsPhotoTarget, meetsQualityTarget, meetsTourTarget, meetsVideoTarget])

  useEffect(() => {
    if (pendingQualityPhotos.length === 0) return

    let cancelled = false

    const runAnalysis = async () => {
      for (const photo of pendingQualityPhotos) {
        if (cancelled) return
        const quality = await analyzeImageQuality(photo.url)
        if (cancelled) return
        const key = toImageKey(photo)
        setQualityByImage((current) => {
          if (current[key]) return current
          return {
            ...current,
            [key]: quality,
          }
        })
      }
    }

    void runAnalysis()

    return () => {
      cancelled = true
    }
  }, [pendingQualityPhotos])

  const reorderPhotos = (fromIndex: number, direction: 'left' | 'right') => {
    setMedia((current) => {
      const currentPhotos = current.filter((item) => item.media_type === 'image').sort((a, b) => a.display_order - b.display_order)
      const targetIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1
      if (targetIndex < 0 || targetIndex >= currentPhotos.length) return current

      const nextPhotos = [...currentPhotos]
      const [moved] = nextPhotos.splice(fromIndex, 1)
      nextPhotos.splice(targetIndex, 0, moved)

      const photoByKey = new Map(
        nextPhotos.map((item, index) => [String(item.id || item.url), { ...item, display_order: index }])
      )

      return current.map((item) => {
        if (item.media_type !== 'image') return item
        const key = String(item.id || item.url)
        return photoByKey.get(key) || item
      })
    })
  }

  const setPrimaryPhoto = (target: MediaItem) => {
    setMedia((current) =>
      current.map((item) => {
        if (item.media_type !== 'image') return item
        const same = String(item.id || item.url) === String(target.id || target.url)
        return { ...item, is_primary: same }
      })
    )
  }

  const removePhoto = (target: MediaItem) => {
    setMedia((current) => {
      const next = current.filter(
        (item) => !(item.media_type === 'image' && String(item.id || item.url) === String(target.id || target.url))
      )

      const nextPhotos = next.filter((item) => item.media_type === 'image').sort((a, b) => a.display_order - b.display_order)
      if (nextPhotos.length > 0 && !nextPhotos.some((item) => item.is_primary)) {
        nextPhotos[0] = { ...nextPhotos[0], is_primary: true }
      }

      const photoByKey = new Map(
        nextPhotos.map((item, index) => [String(item.id || item.url), { ...item, display_order: index }])
      )

      return next.map((item) => {
        if (item.media_type !== 'image') return item
        const key = String(item.id || item.url)
        return photoByKey.get(key) || item
      })
    })
  }

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const images = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (images.length === 0) {
      toast.error('Selecciona archivos de imagen válidos.')
      return
    }

    setUploading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const uploadedItems: MediaItem[] = []

      for (const file of images) {
        const ext = file.name.split('.').pop() || 'jpg'
        const key = `properties/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('property-images').upload(key, file)

        if (uploadError) {
          throw new Error(uploadError.message || `No se pudo subir ${file.name}`)
        }

        const { data } = supabase.storage.from('property-images').getPublicUrl(key)
        uploadedItems.push({
          media_type: 'image',
          url: data.publicUrl,
          key,
          display_order: 0,
          is_primary: false,
          metadata: {},
        })
      }

      setMedia((current) => {
        const currentPhotos = current.filter((item) => item.media_type === 'image').sort((a, b) => a.display_order - b.display_order)
        const hasPrimary = currentPhotos.some((item) => item.is_primary)
        const startOrder = currentPhotos.length

        const withOrder = uploadedItems.map((item, index) => ({
          ...item,
          display_order: startOrder + index,
          is_primary: !hasPrimary && index === 0 && currentPhotos.length === 0,
        }))

        return [...current, ...withOrder]
      })

      toast.success(`${uploadedItems.length} imagen${uploadedItems.length === 1 ? '' : 'es'} subida${uploadedItems.length === 1 ? '' : 's'} al Media Center.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron subir las imágenes.'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!property) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const photoItems = media
        .filter((item) => item.media_type === 'image')
        .sort((a, b) => a.display_order - b.display_order)
        .map((item, index) => {
          const isPrimary = primaryPhotoId ? String(item.id || item.url) === String(primaryPhotoId) : index === 0
          const quality = qualityByImage[toImageKey(item)]
          const metadata = quality
            ? {
                ...item.metadata,
                quality,
              }
            : item.metadata

          return {
            id: item.id,
            media_type: 'image' as const,
            url: item.url,
            key: item.key,
            display_order: index,
            is_primary: isPrimary,
            metadata,
          }
        })

      const payloadMedia: Array<{
        id?: string | number
        media_type: 'image' | 'video' | 'tour360'
        url: string
        key: string | null
        display_order: number
        is_primary: boolean
        metadata: Record<string, unknown>
      }> = [...photoItems]

      if (videoUrl.trim().length > 0) {
        payloadMedia.push({
          media_type: 'video',
          url: videoUrl.trim(),
          key: null,
          display_order: payloadMedia.length,
          is_primary: payloadMedia.length === 0,
          metadata: {},
        })
      }

      if (tourUrl.trim().length > 0) {
        payloadMedia.push({
          media_type: 'tour360',
          url: tourUrl.trim(),
          key: null,
          display_order: payloadMedia.length,
          is_primary: payloadMedia.length === 0,
          metadata: {},
        })
      }

      if (payloadMedia.length > 0) {
        const orderResponse = await fetch(`/api/partners/properties/${property.id}/media/order`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: payloadMedia }),
        })

        const orderPayload = await orderResponse.json().catch(() => null)
        if (!orderResponse.ok) {
          throw new Error(orderPayload?.error || 'No se pudo guardar el orden de media.')
        }
      }

      const propertyResponse = await fetch(`/api/partners/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl.trim() || null,
          tour_360_url: tourUrl.trim() || null,
        }),
      })

      const propertyPayload = await propertyResponse.json().catch(() => null)
      if (!propertyResponse.ok) {
        throw new Error(propertyPayload?.error || 'No se pudo actualizar video/tour.')
      }

      toast.success('Media Center actualizado correctamente.')

      const refreshedMedia = toMediaItems((propertyPayload?.data?.media || payloadMedia) as RawMediaRow[])
      if (refreshedMedia.length > 0) {
        setMedia(refreshedMedia)
      }

      const refreshedProperty = propertyPayload?.data?.property as PropertyResponse | undefined
      if (refreshedProperty) {
        setProperty(refreshedProperty)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el Media Center.'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (!isValidPropertyId) {
    return (
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border/70 bg-card/90 p-6">
          <p className="text-sm text-muted-foreground">El identificador de propiedad no es válido.</p>
          <Link href="/partners/dashboard/properties" className="mt-3 inline-flex text-sm text-accent-gold-strong hover:underline">
            Volver a propiedades
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-2xl border border-border/70 bg-card/90 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-gold-strong" />
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border/70 bg-card/90 p-6">
          <p className="text-sm text-muted-foreground">{errorMessage || 'No se encontró la propiedad solicitada.'}</p>
          <Link href="/partners/dashboard/properties" className="mt-3 inline-flex text-sm text-accent-gold-strong hover:underline">
            Volver a propiedades
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-editorial-layer px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/partners/dashboard/properties"
                className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-ink-strong"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a propiedades
              </Link>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Media Center</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink-strong md:text-3xl">{property.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gestiona fotos, video y tour 360 con persistencia directa sobre la propiedad.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AssetHealthBadge health={assetHealth} />
              <Link
                href={`/property/${property.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong"
              >
                Ver público
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Fotos</p>
              <p className="text-xl font-semibold text-ink-strong">{photos.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Video</p>
              <p className="text-xl font-semibold text-ink-strong">{videoUrl.trim() ? 'Sí' : 'No'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Tour 360</p>
              <p className="text-xl font-semibold text-ink-strong">{tourUrl.trim() ? 'Sí' : 'No'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Estado listing</p>
              <p className="text-sm font-medium text-ink-strong">{property.status}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-surface-0/70 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Preset de cobertura</p>
                <p className="mt-1 text-sm font-medium text-ink-strong">
                  {coveragePreset.label}: {coverageCompletion}% completo
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Prioridades visuales: {coveragePreset.focusPoints.join(' · ')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Calidad evaluada: {qualityEvaluated.length}/{photos.length} fotos analizadas · {Math.round(qualityRatio * 100)}% en nivel objetivo
                </p>
              </div>
              <div className="w-full max-w-[220px]">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Completitud de assets</span>
                  <span>{coverageCompletion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border/80">
                  <div className="h-full bg-accent-gold-soft transition-all duration-500" style={{ width: `${coverageCompletion}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {coverageChecklist.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs',
                    item.done
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  )}
                >
                  <div className="flex items-center gap-1">
                    {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <p className="mt-1 opacity-80">{item.detail}</p>
                </div>
              ))}
            </div>

            {missingCoverageActions.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Pendientes clave: {missingCoverageActions.join(', ')}.
                </p>
                {recommendedServices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recommendedServices.map((service) => (
                      <Link
                        key={service}
                        href={`/partners/dashboard/marketing?service=${service}&propertyId=${property.id}&source=media_center_preset`}
                        className="inline-flex items-center gap-1 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-2.5 py-1 text-[11px] font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
                      >
                        Resolver con Luxe Studio
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
                Cobertura recomendada completa para este tipo de propiedad.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink-strong">Fotos de propiedad</h2>
                  <p className="text-sm text-muted-foreground">
                    Sube, ordena, define principal y elimina imágenes desde un panel único.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-3 py-1.5 text-sm text-ink-strong transition-colors hover:bg-accent-gold-soft/20">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Subir fotos
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={(event) => {
                      void handleUploadPhotos(event.target.files)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border/80 bg-surface-0/60 px-4 py-10 text-center">
                  <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Esta propiedad aún no tiene fotos cargadas.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {photos.map((item, index) => {
                    const itemKey = String(item.id || item.url)
                    const isPrimary = String(primaryPhotoId) === itemKey
                    const quality = qualityByImage[itemKey]

                    return (
                      <div key={itemKey} className="overflow-hidden rounded-xl border border-border/70 bg-surface-0/70">
                        <div className="relative aspect-[4/3] bg-muted/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                          {isPrimary ? (
                            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/15 px-2 py-1 text-[11px] font-medium text-ink-strong">
                              <Star className="h-3 w-3 fill-current" />
                              Principal
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Orden #{index + 1}</span>
                            <span className="truncate">{item.key || 'sin-key'}</span>
                          </div>
                          <div className="rounded-lg border border-border/70 bg-background/70 px-2.5 py-2">
                            {quality ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className={cn('rounded-full border px-2 py-0.5 font-medium', getQualityBadgeClass(quality.level))}>
                                    Calidad {getQualityLabel(quality.level)}
                                  </span>
                                  <span className="text-muted-foreground">Score {Math.round(quality.score)}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Nitidez {Math.round(quality.sharpness)} · Exposición {Math.round(quality.exposure)} · Contraste {Math.round(quality.contrast)}
                                </p>
                                {quality.notes.length > 0 ? (
                                  <p className="text-[11px] text-muted-foreground">{quality.notes[0]}</p>
                                ) : null}
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Analizando calidad automáticamente...</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => reorderPhotos(index, 'left')}
                              disabled={index === 0}
                              className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong disabled:opacity-40"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderPhotos(index, 'right')}
                              disabled={index === photos.length - 1}
                              className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong disabled:opacity-40"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrimaryPhoto(item)}
                              className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong"
                            >
                              Principal
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(item)}
                              className="rounded-md border border-rose-500/40 px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/90 p-5">
              <h2 className="text-lg font-semibold text-ink-strong">Video y Tour 360</h2>
              <p className="text-sm text-muted-foreground">Define enlaces oficiales y previsualiza si el proveedor permite embebido.</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="video-url" className="text-sm font-medium text-ink-strong">
                    Video URL
                  </label>
                  <input
                    id="video-url"
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-border bg-background/85 px-3 py-2 text-sm outline-none transition-colors focus:border-accent-gold-soft/45 focus:ring-1 focus:ring-accent-gold-soft/35"
                  />
                  {embedVideoUrl ? (
                    <div className="overflow-hidden rounded-xl border border-border/70">
                      <iframe
                        title="Preview video"
                        src={embedVideoUrl}
                        className="h-48 w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : videoUrl.trim() ? (
                    <Link href={videoUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-gold-strong hover:underline">
                      <Film className="h-3.5 w-3.5" />
                      Abrir enlace de video
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin video configurado.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="tour-url" className="text-sm font-medium text-ink-strong">
                    Tour 360 URL
                  </label>
                  <input
                    id="tour-url"
                    type="url"
                    value={tourUrl}
                    onChange={(event) => setTourUrl(event.target.value)}
                    placeholder="https://my.matterport.com/show/?m=..."
                    className="w-full rounded-xl border border-border bg-background/85 px-3 py-2 text-sm outline-none transition-colors focus:border-accent-gold-soft/45 focus:ring-1 focus:ring-accent-gold-soft/35"
                  />
                  {embedTourUrl ? (
                    <div className="overflow-hidden rounded-xl border border-border/70">
                      <iframe title="Preview tour" src={embedTourUrl} className="h-48 w-full" allowFullScreen />
                    </div>
                  ) : tourUrl.trim() ? (
                    <Link href={tourUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-gold-strong hover:underline">
                      <Eye className="h-3.5 w-3.5" />
                      Abrir enlace de tour 360
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin tour 360 configurado.</p>
                  )}
                </div>
              </div>

              {errorMessage ? <p className="mt-3 text-sm text-rose-500">{errorMessage}</p> : null}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-4 py-2 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </button>
                <span className="text-xs text-muted-foreground">Persistencia: `property_media` + `properties.video_url/virtual_tour_url`</span>
              </div>
            </div>
          </div>

          <LuxeStudioRail source="property_media_center" propertyId={property.id} className="h-fit" />
        </section>
      </div>
    </div>
  )
}

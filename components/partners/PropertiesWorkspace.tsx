'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Camera,
  CircleAlert,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth, useUserAgency } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { LuxeStudioRail } from '@/components/partners/LuxeStudioRail'
import type { MediaCenterPropertyDto, PropertyAssetHealth } from '@/types/domain'

type PropertyStatus = 'for_sale' | 'for_rent' | 'sold' | 'rented' | 'reserved' | string

type RawMedia = {
  id?: string
  media_type?: string
  url?: string
}

type RawPropertyRow = {
  id: number
  title: string
  slug: string | null
  status: PropertyStatus
  price: number
  currency: string
  view_count: number | null
  main_image: string | null
  video_url?: string | null
  virtual_tour_url?: string | null
  property_images?: { url: string }[]
  property_media?: RawMedia[]
}

function asAssetHealth(photosCount: number, hasVideo: boolean, hasTour: boolean): PropertyAssetHealth {
  if (photosCount >= 5 && hasVideo && hasTour) return 'healthy'
  if (photosCount >= 3 || hasVideo || hasTour) return 'needs_media'
  return 'critical'
}

function toMediaCenterDto(row: RawPropertyRow): MediaCenterPropertyDto {
  const canonicalImages = (row.property_media || []).filter((item) => item.media_type === 'image').length
  const photosCount = canonicalImages > 0 ? canonicalImages : row.property_images?.length || 0
  const hasVideo = Boolean(
    row.video_url || (row.property_media || []).some((item) => item.media_type === 'video' && item.url)
  )
  const hasTour = Boolean(
    row.virtual_tour_url || (row.property_media || []).some((item) => item.media_type === 'tour360' && item.url)
  )

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    price: Number(row.price || 0),
    currency: row.currency || 'USD',
    views: Number(row.view_count || 0),
    photos_count: photosCount,
    has_video: hasVideo,
    has_tour360: hasTour,
    asset_health: asAssetHealth(photosCount, hasVideo, hasTour),
    video_url: row.video_url || null,
    tour_360_url: row.virtual_tour_url || null,
    main_image: row.main_image || row.property_images?.[0]?.url || null,
    mediaCanonical: (row.property_media || []).length > 0,
  }
}

function statusLabel(status: PropertyStatus) {
  if (status === 'for_sale') return 'En venta'
  if (status === 'for_rent') return 'En alquiler'
  if (status === 'sold') return 'Vendida'
  if (status === 'rented') return 'Alquilada'
  if (status === 'reserved') return 'Reservada'
  return status
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function AssetHealthBadge({ health }: { health: PropertyAssetHealth }) {
  const labels: Record<PropertyAssetHealth, string> = {
    healthy: 'Completo',
    needs_media: 'Parcial',
    critical: 'Crítico',
  }

  const tone: Record<PropertyAssetHealth, string> = {
    healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    needs_media: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    critical: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  }

  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', tone[health])}>{labels[health]}</span>
}

export function PropertiesWorkspace() {
  const { agency, loading: agencyLoading } = useUserAgency()
  const { loading: authLoading, featureFlags } = useAuth()
  const [items, setItems] = useState<MediaCenterPropertyDto[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (agencyLoading) return

    if (!agency?.id) {
      queueMicrotask(() => {
        setItems([])
        setLoading(false)
      })
      return
    }

    let active = true

    const fetchProperties = async () => {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseBrowserClient()
      const baseSelect =
        'id, title, slug, status, price, currency, view_count, main_image, video_url, virtual_tour_url, property_images(url), property_media(id, media_type, url)'
      const fallbackSelect =
        'id, title, slug, status, price, currency, view_count, main_image, video_url, virtual_tour_url, property_images(url)'

      let queryResult = await supabase
        .from('properties')
        .select(baseSelect)
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false })

      if (queryResult.error?.message?.toLowerCase().includes('property_media')) {
        queryResult = await supabase
          .from('properties')
          .select(fallbackSelect)
          .eq('agency_id', agency.id)
          .order('created_at', { ascending: false })
      }

      if (!active) return

      if (queryResult.error) {
        setItems([])
        setError(queryResult.error.message || 'No se pudo cargar el workspace de propiedades.')
      } else {
        const mapped = ((queryResult.data || []) as RawPropertyRow[]).map(toMediaCenterDto)
        setItems(mapped)
      }

      setLoading(false)
    }

    void fetchProperties()

    return () => {
      active = false
    }
  }, [agency?.id, agencyLoading])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        (item.slug || '').toLowerCase().includes(term) ||
        statusLabel(item.status).toLowerCase().includes(term)
      )
    })
  }, [items, query])

  const coverage = useMemo(() => {
    const total = items.length
    const healthy = items.filter((item) => item.asset_health === 'healthy').length
    const critical = items.filter((item) => item.asset_health === 'critical').length

    return {
      total,
      healthy,
      critical,
      withVideo: items.filter((item) => item.has_video).length,
      withTour: items.filter((item) => item.has_tour360).length,
    }
  }, [items])

  const firstCritical = useMemo(
    () => items.find((item) => item.asset_health === 'critical') || items.find((item) => item.asset_health === 'needs_media'),
    [items]
  )

  if (authLoading || agencyLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-2xl border border-border/70 bg-card/80 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-gold-strong" />
        </div>
      </div>
    )
  }

  if (!featureFlags.properties) {
    return (
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border/70 bg-card/80 p-6 text-sm text-muted-foreground">
          El módulo de propiedades está desactivado en este entorno (`FEATURE_INSFORGE_PROPERTIES=false`).
        </div>
      </div>
    )
  }

  if (!agency) {
    return (
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border/70 bg-card/80 p-6 text-sm text-muted-foreground">
          No hay una agencia asociada para cargar este workspace.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-editorial-layer px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border/70 bg-card/90 p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Workspace de propiedades</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink-strong md:text-3xl">Inventario multimedia de {agency.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Centraliza edición de datos, media y cobertura de activos por propiedad.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/partners/dashboard/new"
                className="inline-flex items-center gap-2 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-3 py-1.5 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
              >
                <Sparkles className="h-4 w-4" />
                Nueva propiedad
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Propiedades</p>
              <p className="text-xl font-semibold text-ink-strong">{coverage.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">Completas</p>
              <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{coverage.healthy}</p>
            </div>
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">Críticas</p>
              <p className="text-xl font-semibold text-rose-700 dark:text-rose-300">{coverage.critical}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Con video</p>
              <p className="text-xl font-semibold text-ink-strong">{coverage.withVideo}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-0/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Con tour 360</p>
              <p className="text-xl font-semibold text-ink-strong">{coverage.withTour}</p>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90">
            <div className="border-b border-border/70 px-5 py-4">
              <label className="relative block max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título, slug o estado"
                  className="w-full rounded-xl border border-border bg-background/85 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent-gold-soft/45 focus:ring-1 focus:ring-accent-gold-soft/35"
                />
              </label>
              {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-surface-0/70 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left">Título</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Precio</th>
                    <th className="px-4 py-3 text-left">Vistas</th>
                    <th className="px-4 py-3 text-left">Fotos</th>
                    <th className="px-4 py-3 text-left">Video</th>
                    <th className="px-4 py-3 text-left">Tour 360</th>
                    <th className="px-4 py-3 text-left">Asset health</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 align-top transition-colors hover:bg-surface-0/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-strong">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">#{item.id}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{statusLabel(item.status)}</td>
                      <td className="px-4 py-3 text-ink-strong">{formatPrice(item.price, item.currency)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.views.toLocaleString('es-UY')}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {item.photos_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 text-xs', item.has_video ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground')}>
                          <Film className="h-3.5 w-3.5" />
                          {item.has_video ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 text-xs', item.has_tour360 ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground')}>
                          <Eye className="h-3.5 w-3.5" />
                          {item.has_tour360 ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AssetHealthBadge health={item.asset_health} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/partners/dashboard/edit/${item.id}`}
                              className="rounded-lg border border-border/80 bg-background/85 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent-gold-soft/40 hover:text-ink-strong"
                            >
                              Editar datos
                            </Link>
                            <Link
                              href={`/partners/dashboard/properties/${item.id}/media`}
                              className="rounded-lg border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-2.5 py-1 text-xs text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
                            >
                              Abrir Media Center
                            </Link>
                            <Link
                              href={`/property/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/85 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong"
                            >
                              Ver público
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {item.asset_health !== 'healthy' ? (
                            <Link
                              href={`/partners/dashboard/marketing?service=property_photos&propertyId=${item.id}&source=properties_workspace_row`}
                              className="inline-flex w-fit items-center gap-1 text-xs text-accent-gold-strong hover:underline"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Completar cobertura con Luxe Studio
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CircleAlert className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No encontramos propiedades con ese criterio. Ajusta la búsqueda o crea una nueva ficha.
                </p>
                <div className="mt-4">
                  <Link
                    href="/partners/dashboard/new"
                    className="inline-flex items-center gap-2 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-3 py-1.5 text-sm text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
                  >
                    Crear propiedad
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <LuxeStudioRail
            source="properties_workspace"
            propertyId={firstCritical?.id ?? null}
            className="h-fit"
          />
        </section>
      </div>
    </div>
  )
}

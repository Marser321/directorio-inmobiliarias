import { NextResponse } from 'next/server'
import { z } from 'zod'
import { asCompatDatabase, type CompatDatabase, type CompatError } from '@/lib/insforge/compat'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { normalizeEnvValue, parseBooleanEnv } from '@/lib/env/normalize'

const PROPERTY_STATUSES = ['for_sale', 'for_rent', 'sold', 'rented', 'reserved'] as const
const PUBLICATION_STATUSES = ['draft', 'pending_review', 'published', 'archived'] as const
const MEDIA_TYPES = ['image', 'video', 'tour360', 'floorplan'] as const

const MAX_MEDIA_ITEMS = 80
const MAX_IMAGES = 40
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 6
const GEOCODE_NEGATIVE_CACHE_TTL_MS = 1000 * 60 * 15
const GEOCODER_TIMEOUT_MS = 3500

export type CoordinateSource = 'manual' | 'geocoded' | 'centroid' | 'none'

export interface CoordinateResolution {
  latitude: number | null
  longitude: number | null
  source: CoordinateSource
}

type GeocodeCacheEntry = {
  expiresAt: number
  point: { latitude: number; longitude: number } | null
}

const geocodeCache = new Map<string, GeocodeCacheEntry>()

function isAddressGeocodingEnabled() {
  return parseBooleanEnv(process.env.FEATURE_ADDRESS_GEOCODING, true).value
}

const optionalUrlSchema = z.union([z.string().trim().url(), z.literal(''), z.null()]).optional()
const titleSchema = z.string().trim().min(5).max(160)
const slugSchema = z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/)
const descriptionSchema = z.string().trim().max(6000).nullable()
const currencySchema = z.string().trim().min(3).max(3).transform((v) => v.toUpperCase())
const statusSchema = z.enum(PROPERTY_STATUSES)
const publicationStatusSchema = z.enum(PUBLICATION_STATUSES)
const locationIdSchema = z.coerce.number().int().positive()
const agencyIdSchema = z.coerce.number().int().positive()
const optionalAddressSchema = z.string().trim().max(255).nullable()
const optionalIntSchema = z.coerce.number().int().min(0).max(100).nullable()
const optionalAreaSchema = z.coerce.number().min(0).max(1000000).nullable()
const optionalLatitudeSchema = z.coerce.number().min(-90).max(90).nullable()
const optionalLongitudeSchema = z.coerce.number().min(-180).max(180).nullable()
const featuresSchema = z.record(z.string(), z.unknown()).nullable()
const lifestyleTagsSchema = z.array(z.string().trim().min(1).max(120)).max(80)

export const propertyMediaSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  media_type: z.enum(MEDIA_TYPES),
  url: z.string().trim().url(),
  key: z.string().trim().min(1).max(500).optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional(),
  is_primary: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})
const mediaArraySchema = z.array(propertyMediaSchema).max(MAX_MEDIA_ITEMS)

export const createPropertySchema = z.object({
  title: titleSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema.optional(),
  price: z.coerce.number().positive(),
  currency: currencySchema.default('USD'),
  status: statusSchema.default('for_sale'),
  publication_status: publicationStatusSchema.optional(),
  location_id: locationIdSchema,
  agency_id: agencyIdSchema.optional(),
  address: optionalAddressSchema.optional(),
  latitude: optionalLatitudeSchema.optional(),
  longitude: optionalLongitudeSchema.optional(),
  bedrooms: optionalIntSchema.optional(),
  bathrooms: optionalIntSchema.optional(),
  garage_spaces: optionalIntSchema.optional(),
  built_area: optionalAreaSchema.optional(),
  plot_area: optionalAreaSchema.optional(),
  features: featuresSchema.optional(),
  lifestyle_tags: lifestyleTagsSchema.optional(),
  video_url: optionalUrlSchema,
  tour_360_url: optionalUrlSchema,
  is_featured: z.boolean().optional(),
  media: mediaArraySchema.default([]),
})

export const updatePropertySchema = z
  .object({
    title: titleSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema.optional(),
    price: z.coerce.number().positive().optional(),
    currency: currencySchema.optional(),
    status: statusSchema.optional(),
    publication_status: publicationStatusSchema.optional(),
    location_id: locationIdSchema.optional(),
    agency_id: agencyIdSchema.optional(),
    address: optionalAddressSchema.optional(),
    latitude: optionalLatitudeSchema.optional(),
    longitude: optionalLongitudeSchema.optional(),
    bedrooms: optionalIntSchema.optional(),
    bathrooms: optionalIntSchema.optional(),
    garage_spaces: optionalIntSchema.optional(),
    built_area: optionalAreaSchema.optional(),
    plot_area: optionalAreaSchema.optional(),
    features: featuresSchema.optional(),
    lifestyle_tags: lifestyleTagsSchema.optional(),
    video_url: optionalUrlSchema,
    tour_360_url: optionalUrlSchema,
    is_featured: z.boolean().optional(),
    media: mediaArraySchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required to update a property',
  })

export const mediaOrderSchema = z.object({
  media: z
    .array(
      z
        .object({
          id: z.union([z.string(), z.number()]).optional(),
          url: z.string().trim().url().optional(),
          media_type: z.enum(MEDIA_TYPES).optional(),
          key: z.string().trim().min(1).max(500).optional().nullable(),
          display_order: z.coerce.number().int().min(0).optional(),
          is_primary: z.boolean().optional(),
          metadata: z.record(z.string(), z.unknown()).optional().nullable(),
        })
        .refine((item) => item.id !== undefined || item.url !== undefined, {
          message: 'Each media item must include id or url',
        })
    )
    .min(1)
    .max(MAX_MEDIA_ITEMS),
})

interface ProfileRow extends Record<string, unknown> {
  role?: string
  is_admin?: boolean
}

interface MembershipRow extends Record<string, unknown> {
  agency_id?: number
  role?: string
}

interface PropertyRow extends Record<string, unknown> {
  id?: number
  agency_id?: number
  owner_id?: string | null
  images?: string[] | null
  main_image?: string | null
  video_url?: string | null
  virtual_tour_url?: string | null
}

interface PropertyMediaRow extends Record<string, unknown> {
  id?: string
  property_id?: number
  media_type?: string
  url?: string
  key?: string | null
  display_order?: number
  is_primary?: boolean
  metadata?: Record<string, unknown> | null
}

interface LocationContextRow extends Record<string, unknown> {
  id?: number
  name?: string | null
  slug?: string | null
  center_lat?: number | null
  center_lng?: number | null
}

interface SyncPropertyMediaResult {
  media: PropertyMediaRow[]
  error: CompatError | null
  tableAvailable: boolean
}

export interface PropertyScope {
  database: CompatDatabase
  user: {
    id: string
    email: string | null
  }
  profile: ProfileRow | null
  membership: MembershipRow | null
  isAdmin: boolean
}

function parsePropertyId(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

export function getPropertyIdFromParam(param: string) {
  const parsed = parsePropertyId(param)
  if (!parsed) {
    return {
      error: NextResponse.json({ error: 'Invalid property id' }, { status: 400 }),
      propertyId: null,
    }
  }

  return {
    error: null,
    propertyId: parsed,
  }
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function createSlug(inputTitle: string, explicitSlug?: string) {
  const base = slugify(explicitSlug || inputTitle) || `property-${Date.now()}`
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}

function normalizeUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function buildGeoPointGeoJson(latitude: number | null | undefined, longitude: number | null | undefined) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  return {
    type: 'Point',
    coordinates: [Number(longitude.toFixed(7)), Number(latitude.toFixed(7))],
  }
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toNormalizedCoordinatePoint(latitude: unknown, longitude: unknown) {
  const normalizedLat = asFiniteNumber(latitude)
  const normalizedLng = asFiniteNumber(longitude)
  if (normalizedLat === null || normalizedLng === null) return null
  if (normalizedLat < -90 || normalizedLat > 90) return null
  if (normalizedLng < -180 || normalizedLng > 180) return null

  return {
    latitude: Number(normalizedLat.toFixed(7)),
    longitude: Number(normalizedLng.toFixed(7)),
  }
}

function normalizeLocationId(value: unknown) {
  const parsed = asFiniteNumber(value)
  if (parsed === null || parsed <= 0) return null
  return Math.trunc(parsed)
}

function buildGeocodeCacheKey(query: string) {
  return query.toLowerCase().replace(/\s+/g, ' ').trim()
}

function getGeocoderUserAgent() {
  const appUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000'
  return `luxe-estate-geocoder/1.0 (+${appUrl})`
}

async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 5) return null

  const cacheKey = buildGeocodeCacheKey(normalizedQuery)
  const cached = geocodeCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.point
  }

  if (cached) {
    geocodeCache.delete(cacheKey)
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'uy')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('q', normalizedQuery)

  const contactEmail = process.env.GEOCODING_CONTACT_EMAIL
  if (contactEmail) {
    url.searchParams.set('email', contactEmail)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es,en;q=0.8',
        'User-Agent': getGeocoderUserAgent(),
      },
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      geocodeCache.set(cacheKey, {
        point: null,
        expiresAt: Date.now() + GEOCODE_NEGATIVE_CACHE_TTL_MS,
      })
      return null
    }

    const payload = (await response.json()) as Array<{ lat?: string; lon?: string }> | unknown
    const first = Array.isArray(payload) && payload.length > 0 ? payload[0] : null
    const point = toNormalizedCoordinatePoint(first?.lat, first?.lon)

    geocodeCache.set(cacheKey, {
      point,
      expiresAt: Date.now() + (point ? GEOCODE_CACHE_TTL_MS : GEOCODE_NEGATIVE_CACHE_TTL_MS),
    })
    return point
  } catch {
    geocodeCache.set(cacheKey, {
      point: null,
      expiresAt: Date.now() + GEOCODE_NEGATIVE_CACHE_TTL_MS,
    })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function loadLocationContext(database: CompatDatabase, locationId: number): Promise<LocationContextRow | null> {
  const primaryQuery = await database
    .from('locations')
    .select('id, name, slug, center_lat, center_lng')
    .eq('id', locationId)
    .maybeSingle<LocationContextRow>()

  if (
    primaryQuery.error &&
    (isMissingColumnError(primaryQuery.error, 'center_lat') || isMissingColumnError(primaryQuery.error, 'center_lng'))
  ) {
    const fallbackQuery = await database
      .from('locations')
      .select('id, name, slug')
      .eq('id', locationId)
      .maybeSingle<LocationContextRow>()

    if (fallbackQuery.error || !fallbackQuery.data?.id) {
      return null
    }

    return {
      ...fallbackQuery.data,
      center_lat: null,
      center_lng: null,
    }
  }

  if (primaryQuery.error || !primaryQuery.data?.id) {
    return null
  }

  return primaryQuery.data
}

export async function resolvePropertyCoordinates(
  database: CompatDatabase,
  input: {
    locationId?: number | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
  }
): Promise<CoordinateResolution> {
  const manualPoint = toNormalizedCoordinatePoint(input.latitude, input.longitude)
  if (manualPoint) {
    return {
      latitude: manualPoint.latitude,
      longitude: manualPoint.longitude,
      source: 'manual',
    }
  }

  const normalizedLocationId = normalizeLocationId(input.locationId)
  const locationContext = normalizedLocationId ? await loadLocationContext(database, normalizedLocationId) : null
  const normalizedAddress = normalizeOptionalText(input.address)
  const geocodingEnabled = isAddressGeocodingEnabled()

  if (normalizedAddress && geocodingEnabled) {
    const geocodeQuery = [normalizedAddress, locationContext?.name || null, 'Uruguay'].filter(Boolean).join(', ')
    const geocodedPoint = await geocodeAddress(geocodeQuery)
    if (geocodedPoint) {
      return {
        latitude: geocodedPoint.latitude,
        longitude: geocodedPoint.longitude,
        source: 'geocoded',
      }
    }
  }

  const centroidPoint = toNormalizedCoordinatePoint(locationContext?.center_lat, locationContext?.center_lng)
  if (centroidPoint) {
    return {
      latitude: centroidPoint.latitude,
      longitude: centroidPoint.longitude,
      source: 'centroid',
    }
  }

  return {
    latitude: null,
    longitude: null,
    source: 'none',
  }
}

export function applyResolvedCoordinates(payload: Record<string, unknown>, coordinates: CoordinateResolution) {
  const geoPoint = buildGeoPointGeoJson(coordinates.latitude, coordinates.longitude)
  const geoCoords = Array.isArray(geoPoint?.coordinates) ? geoPoint.coordinates : null

  payload.location_point_geojson = geoPoint
  payload.location_lat = geoCoords ? geoCoords[1] : null
  payload.location_lng = geoCoords ? geoCoords[0] : null
}

function isMissingTableError(error: CompatError | null | undefined, table: string) {
  const message = error?.message?.toLowerCase() || ''
  const code = (error as { code?: string } | null | undefined)?.code?.toLowerCase() || ''
  const serialized = JSON.stringify(error || {}).toLowerCase()
  const haystack = `${message} ${serialized}`
  const normalizedTable = table.toLowerCase()
  return (
    haystack.includes(`relation \"${normalizedTable}\" does not exist`) ||
    haystack.includes(`relation '${normalizedTable}' does not exist`) ||
    haystack.includes(`relation ${normalizedTable} does not exist`) ||
    haystack.includes(`relation \"public.${normalizedTable}\" does not exist`) ||
    haystack.includes(`relation 'public.${normalizedTable}' does not exist`) ||
    haystack.includes(`relation public.${normalizedTable} does not exist`) ||
    haystack.includes(`could not find the '${normalizedTable}' table`) ||
    haystack.includes(`could not find the \"${normalizedTable}\" table`) ||
    haystack.includes(`'${normalizedTable}' table of`) ||
    code === '42p01' ||
    (code.startsWith('pgrst') && haystack.includes(normalizedTable) && haystack.includes('table'))
  )
}

function isMissingColumnError(error: CompatError | null | undefined, column: string) {
  const message = error?.message?.toLowerCase() || ''
  const code = (error as { code?: string } | null | undefined)?.code?.toLowerCase() || ''
  const serialized = JSON.stringify(error || {}).toLowerCase()
  const haystack = `${message} ${serialized}`
  const normalizedColumn = column.toLowerCase()
  return (
    haystack.includes(`column \"${normalizedColumn}\"`) ||
    haystack.includes(`column '${normalizedColumn}'`) ||
    haystack.includes(`column ${normalizedColumn}`) ||
    haystack.includes(`could not find the '${normalizedColumn}' column`) ||
    haystack.includes(`could not find the \"${normalizedColumn}\" column`) ||
    haystack.includes(`'${normalizedColumn}' column of`) ||
    code === '42703' ||
    (code.startsWith('pgrst') && haystack.includes(normalizedColumn) && haystack.includes('column'))
  )
}

export function normalizeMediaItems(items: Array<z.infer<typeof propertyMediaSchema>>) {
  const deduped = new Map<string, z.infer<typeof propertyMediaSchema>>()

  for (const item of items) {
    const key = `${item.media_type}:${item.url.trim()}`
    if (!deduped.has(key)) {
      deduped.set(key, item)
    }
  }

  const sorted = [...deduped.values()]
    .slice(0, MAX_MEDIA_ITEMS)
    .sort((a, b) => (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER))
    .map((item, index) => ({
      ...item,
      url: item.url.trim(),
      display_order: Number.isFinite(item.display_order) ? item.display_order : index,
      key: normalizeOptionalText(item.key),
      metadata: item.metadata ?? {},
      is_primary: item.is_primary === true,
    }))

  let primaryIndex = sorted.findIndex((item) => item.is_primary)
  if (primaryIndex < 0) {
    primaryIndex = sorted.findIndex((item) => item.media_type === 'image')
  }
  if (primaryIndex < 0 && sorted.length > 0) {
    primaryIndex = 0
  }

  return sorted.map((item, index) => ({
    ...item,
    is_primary: index === primaryIndex,
    display_order: index,
  }))
}

function normalizeLegacyImages(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  const urls = images
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)

  return urls.slice(0, MAX_IMAGES)
}

export function deriveLegacyMediaFields(
  normalizedMedia: ReturnType<typeof normalizeMediaItems>,
  fallbackVideoUrl?: string | null,
  fallbackTourUrl?: string | null
) {
  const imageMedia = normalizedMedia.filter((item) => item.media_type === 'image').slice(0, MAX_IMAGES)
  const primaryImage = imageMedia.find((item) => item.is_primary) || imageMedia[0] || null
  const videoMedia = normalizedMedia.find((item) => item.media_type === 'video')
  const tourMedia = normalizedMedia.find((item) => item.media_type === 'tour360')

  return {
    images: imageMedia.map((item) => item.url),
    main_image: primaryImage?.url || null,
    video_url: videoMedia?.url || normalizeUrl(fallbackVideoUrl),
    virtual_tour_url: tourMedia?.url || normalizeUrl(fallbackTourUrl),
  }
}

export function fallbackMediaFromProperty(property: PropertyRow | null | undefined) {
  if (!property) return [] as ReturnType<typeof normalizeMediaItems>

  const fromImages = normalizeLegacyImages(property.images).map((url, index) => ({
    media_type: 'image' as const,
    url,
    key: null,
    display_order: index,
    is_primary: property.main_image ? property.main_image === url : index === 0,
    metadata: {},
  }))

  const fromVideo = normalizeUrl(property.video_url)
    ? [
        {
          media_type: 'video' as const,
          url: normalizeUrl(property.video_url) as string,
          key: null,
          display_order: fromImages.length,
          is_primary: fromImages.length === 0,
          metadata: {},
        },
      ]
    : []

  const fromTour = normalizeUrl(property.virtual_tour_url)
    ? [
        {
          media_type: 'tour360' as const,
          url: normalizeUrl(property.virtual_tour_url) as string,
          key: null,
          display_order: fromImages.length + fromVideo.length,
          is_primary: fromImages.length === 0 && fromVideo.length === 0,
          metadata: {},
        },
      ]
    : []

  return normalizeMediaItems([...fromImages, ...fromVideo, ...fromTour])
}

function buildPermissionError() {
  return NextResponse.json({ error: 'Forbidden agency scope' }, { status: 403 })
}

export async function resolvePropertyScope() {
  const client = await createInsforgeServerClient()
  const database = asCompatDatabase(client.database)
  const { user } = await getServerUser()

  if (!user?.id) {
    return {
      scope: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await database
    .from('profiles')
    .select('id, role, is_admin')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  const { data: membership } = await database
    .from('agency_memberships')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .maybeSingle<MembershipRow>()

  const isAdmin = Boolean(profile?.is_admin || profile?.role === 'platform_admin')

  return {
    scope: {
      database,
      user: {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : null,
      },
      profile: profile || null,
      membership: membership || null,
      isAdmin,
    } satisfies PropertyScope,
    error: null,
  }
}

export function resolveAgencyForWrite(scope: PropertyScope, requestedAgencyId?: number) {
  const membershipAgencyId = scope.membership?.agency_id

  if (scope.isAdmin) {
    const adminAgencyId = requestedAgencyId || membershipAgencyId
    if (!adminAgencyId) {
      return {
        agencyId: null,
        error: NextResponse.json(
          { error: 'agency_id is required for admins without agency membership' },
          { status: 400 }
        ),
      }
    }

    return {
      agencyId: adminAgencyId,
      error: null,
    }
  }

  if (!membershipAgencyId) {
    return {
      agencyId: null,
      error: buildPermissionError(),
    }
  }

  if (requestedAgencyId && requestedAgencyId !== membershipAgencyId) {
    return {
      agencyId: null,
      error: buildPermissionError(),
    }
  }

  return {
    agencyId: membershipAgencyId,
    error: null,
  }
}

export async function getPropertyForScope(scope: PropertyScope, propertyId: number) {
  const { data: property, error } = await scope.database
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .maybeSingle<PropertyRow>()

  if (error) {
    return {
      property: null,
      error: NextResponse.json({ error: error.message || 'Failed to fetch property' }, { status: 400 }),
    }
  }

  if (!property?.id) {
    return {
      property: null,
      error: NextResponse.json({ error: 'Property not found' }, { status: 404 }),
    }
  }

  if (scope.isAdmin) {
    return {
      property,
      error: null,
    }
  }

  if (!scope.membership?.agency_id || scope.membership.agency_id !== property.agency_id) {
    return {
      property: null,
      error: buildPermissionError(),
    }
  }

  return {
    property,
    error: null,
  }
}

export async function insertPropertyWithCompat(database: CompatDatabase, payload: Record<string, unknown>) {
  const performInsert = async (insertPayload: Record<string, unknown>) =>
    database.from('properties').insert([insertPayload]).select('*').single<PropertyRow>()

  let result = await performInsert(payload)

  if (
    result.error &&
    (isMissingColumnError(result.error, 'publication_status') ||
      isMissingColumnError(result.error, 'published_at') ||
      isMissingColumnError(result.error, 'published_by') ||
      isMissingColumnError(result.error, 'location_point_geojson') ||
      isMissingColumnError(result.error, 'location_lat') ||
      isMissingColumnError(result.error, 'location_lng'))
  ) {
    const legacyPayload = { ...payload }
    delete legacyPayload.publication_status
    delete legacyPayload.published_at
    delete legacyPayload.published_by
    delete legacyPayload.location_point_geojson
    delete legacyPayload.location_lat
    delete legacyPayload.location_lng
    result = await performInsert(legacyPayload)
  }

  return result
}

export async function updatePropertyWithCompat(
  database: CompatDatabase,
  propertyId: number,
  payload: Record<string, unknown>
) {
  const performUpdate = async (updatePayload: Record<string, unknown>) =>
    database.from('properties').update(updatePayload).eq('id', propertyId).select('*').single<PropertyRow>()

  let result = await performUpdate(payload)

  if (
    result.error &&
    (isMissingColumnError(result.error, 'publication_status') ||
      isMissingColumnError(result.error, 'published_at') ||
      isMissingColumnError(result.error, 'published_by') ||
      isMissingColumnError(result.error, 'location_point_geojson') ||
      isMissingColumnError(result.error, 'location_lat') ||
      isMissingColumnError(result.error, 'location_lng'))
  ) {
    const legacyPayload = { ...payload }
    delete legacyPayload.publication_status
    delete legacyPayload.published_at
    delete legacyPayload.published_by
    delete legacyPayload.location_point_geojson
    delete legacyPayload.location_lat
    delete legacyPayload.location_lng
    result = await performUpdate(legacyPayload)
  }

  return result
}

export async function syncPropertyMedia(
  database: CompatDatabase,
  propertyId: number,
  mediaInput: Array<z.infer<typeof propertyMediaSchema>>
): Promise<SyncPropertyMediaResult> {
  const normalized = normalizeMediaItems(mediaInput)
  let tableAvailable = true

  const cleanup = await database.from('property_media').delete().eq('property_id', propertyId)
  if (cleanup.error) {
    if (isMissingTableError(cleanup.error, 'property_media')) {
      tableAvailable = false
    } else {
      // Non-fatal canonical sync failure: keep compatibility path alive.
      tableAvailable = false
    }
  }

  let insertedRows: PropertyMediaRow[] = []

  if (tableAvailable && normalized.length > 0) {
    const insertPayload = normalized.map((item, index) => ({
      property_id: propertyId,
      media_type: item.media_type,
      url: item.url,
      key: item.key ?? null,
      display_order: item.display_order ?? index,
      is_primary: item.is_primary === true,
      metadata: item.metadata ?? {},
    }))

    const { data, error } = await database
      .from('property_media')
      .insert(insertPayload)
      .select('*')

    if (error) {
      if (isMissingTableError(error, 'property_media')) {
        tableAvailable = false
      } else {
        // Non-fatal canonical sync failure: keep compatibility path alive.
        tableAvailable = false
      }
    }

    if (tableAvailable) {
      insertedRows = (Array.isArray(data) ? data : []) as PropertyMediaRow[]
    }
  }

  const imageRows = normalized
    .filter((item) => item.media_type === 'image')
    .map((item, index) => ({
      property_id: propertyId,
      url: item.url,
      key: item.key ?? null,
      display_order: item.display_order ?? index,
      caption: item.is_primary ? 'Imagen Principal' : null,
    }))

  const legacyDelete = await database.from('property_images').delete().eq('property_id', propertyId)
  if (!legacyDelete.error || !isMissingTableError(legacyDelete.error, 'property_images')) {
    if (imageRows.length > 0) {
      await database.from('property_images').insert(imageRows)
    }
  }

  return {
    media: insertedRows,
    error: null,
    tableAvailable,
  }
}

export async function loadPropertyMedia(database: CompatDatabase, propertyId: number, property?: PropertyRow | null) {
  const { data, error } = await database
    .from('property_media')
    .select('*')
    .eq('property_id', propertyId)
    .order('display_order', { ascending: true })

  if (!error && Array.isArray(data) && data.length > 0) {
    return {
      media: data as PropertyMediaRow[],
      fromCanonical: true,
    }
  }

  return {
    media: fallbackMediaFromProperty(property),
    fromCanonical: false,
  }
}

export async function writeAuditEvent(
  database: CompatDatabase,
  payload: {
    actorId: string
    agencyId: number | null | undefined
    entityType: string
    entityId: string
    action: string
    diff?: Record<string, unknown>
  }
) {
  try {
    await database.from('audit_events').insert([
      {
        actor_id: payload.actorId,
        agency_id: payload.agencyId ?? null,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        action: payload.action,
        diff: payload.diff || {},
      },
    ])
  } catch {
    // Best effort audit logging.
  }
}

export function buildCreatePayload(
  input: z.infer<typeof createPropertySchema>,
  agencyId: number,
  ownerId: string
) {
  const normalizedMedia = normalizeMediaItems(input.media || [])
  const legacyMedia = deriveLegacyMediaFields(normalizedMedia, normalizeUrl(input.video_url), normalizeUrl(input.tour_360_url))
  const geoPoint = buildGeoPointGeoJson(input.latitude, input.longitude)
  const geoCoords = Array.isArray(geoPoint?.coordinates) ? geoPoint.coordinates : null

  const publicationStatus = input.publication_status || 'draft'
  const publicationMeta =
    publicationStatus === 'published'
      ? {
          published_at: new Date().toISOString(),
          published_by: ownerId,
        }
      : {
          published_at: null,
          published_by: null,
        }

  return {
    propertyPayload: {
      title: input.title.trim(),
      slug: createSlug(input.title, input.slug),
      description: normalizeOptionalText(input.description),
      price: input.price,
      currency: input.currency,
      status: input.status,
      publication_status: publicationStatus,
      ...publicationMeta,
      location_id: input.location_id,
      location_point_geojson: geoPoint,
      location_lat: geoCoords ? geoCoords[1] : null,
      location_lng: geoCoords ? geoCoords[0] : null,
      agency_id: agencyId,
      owner_id: ownerId,
      address: normalizeOptionalText(input.address),
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      garage_spaces: input.garage_spaces ?? 0,
      built_area: input.built_area ?? null,
      plot_area: input.plot_area ?? null,
      features: input.features || {},
      lifestyle_tags: input.lifestyle_tags || [],
      is_featured: input.is_featured === true,
      images: legacyMedia.images,
      main_image: legacyMedia.main_image,
      video_url: legacyMedia.video_url,
      virtual_tour_url: legacyMedia.virtual_tour_url,
    },
    normalizedMedia,
  }
}

export interface PropertyPublishChecklist {
  minImages: boolean
  descriptionLength: boolean
  hasLocation: boolean
  hasPriceAndCurrency: boolean
  isComplete: boolean
}

export function evaluatePropertyQualityChecklist(
  input: z.infer<typeof createPropertySchema>,
  normalizedMedia: ReturnType<typeof normalizeMediaItems>,
  resolvedCoordinates?: CoordinateResolution | null
): PropertyPublishChecklist {
  const imageCount = normalizedMedia.filter((item) => item.media_type === 'image').length
  const descriptionLength = (input.description?.trim().length || 0) >= 120
  const hasCoordinates = resolvedCoordinates
    ? resolvedCoordinates.latitude !== null && resolvedCoordinates.longitude !== null
    : buildGeoPointGeoJson(input.latitude, input.longitude) !== null
  const hasLocation = Boolean(input.location_id) && Boolean(input.address?.trim()) && hasCoordinates
  const hasPriceAndCurrency = Number(input.price) > 0 && Boolean(input.currency?.trim())
  const minImages = imageCount >= 5

  return {
    minImages,
    descriptionLength,
    hasLocation,
    hasPriceAndCurrency,
    isComplete: minImages && descriptionLength && hasLocation && hasPriceAndCurrency,
  }
}

export function buildUpdatePayload(
  input: z.infer<typeof updatePropertySchema>,
  scope: PropertyScope,
  existingProperty: PropertyRow
) {
  const payload: Record<string, unknown> = {}

  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.slug !== undefined) payload.slug = createSlug(input.title || String(existingProperty.title || 'property'), input.slug)
  if (input.description !== undefined) payload.description = normalizeOptionalText(input.description)
  if (input.price !== undefined) payload.price = input.price
  if (input.currency !== undefined) payload.currency = input.currency
  if (input.status !== undefined) payload.status = input.status
  if (input.location_id !== undefined) payload.location_id = input.location_id
  if (input.address !== undefined) payload.address = normalizeOptionalText(input.address)
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const geoPoint = buildGeoPointGeoJson(input.latitude ?? null, input.longitude ?? null)
    const geoCoords = Array.isArray(geoPoint?.coordinates) ? geoPoint.coordinates : null
    payload.location_point_geojson = geoPoint
    payload.location_lat = geoCoords ? geoCoords[1] : null
    payload.location_lng = geoCoords ? geoCoords[0] : null
  }
  if (input.bedrooms !== undefined) payload.bedrooms = input.bedrooms
  if (input.bathrooms !== undefined) payload.bathrooms = input.bathrooms
  if (input.garage_spaces !== undefined) payload.garage_spaces = input.garage_spaces
  if (input.built_area !== undefined) payload.built_area = input.built_area
  if (input.plot_area !== undefined) payload.plot_area = input.plot_area
  if (input.features !== undefined) payload.features = input.features || {}
  if (input.lifestyle_tags !== undefined) payload.lifestyle_tags = input.lifestyle_tags || []
  if (input.is_featured !== undefined) payload.is_featured = input.is_featured

  const publicationStatus = input.publication_status
  if (publicationStatus !== undefined) {
    payload.publication_status = publicationStatus

    if (publicationStatus === 'published') {
      if (!scope.isAdmin) {
        throw new Error('Only admins can publish directly')
      }

      payload.published_at = new Date().toISOString()
      payload.published_by = scope.user.id
    } else {
      payload.published_at = null
      payload.published_by = null
    }
  }

  let normalizedMedia: ReturnType<typeof normalizeMediaItems> | null = null
  if (input.media !== undefined) {
    normalizedMedia = normalizeMediaItems(input.media)
    const legacyMedia = deriveLegacyMediaFields(
      normalizedMedia,
      normalizeUrl(input.video_url),
      normalizeUrl(input.tour_360_url)
    )

    payload.images = legacyMedia.images
    payload.main_image = legacyMedia.main_image
    payload.video_url = legacyMedia.video_url
    payload.virtual_tour_url = legacyMedia.virtual_tour_url
  } else {
    if (input.video_url !== undefined) payload.video_url = normalizeUrl(input.video_url)
    if (input.tour_360_url !== undefined) payload.virtual_tour_url = normalizeUrl(input.tour_360_url)
  }

  return {
    payload,
    normalizedMedia,
  }
}

export function validationErrorResponse(error: z.ZodError) {
  return NextResponse.json(
    {
      error: 'Validation error',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
    { status: 400 }
  )
}

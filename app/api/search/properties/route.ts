import { NextResponse } from 'next/server'
import { createClient } from '@/lib/insforge/compat-supabase'
import { rankRows } from '@/lib/search/ranking'
import { getInsforgeEnv } from '@/lib/insforge/env'
import type { PropertySearchItem, SearchApiResponse } from '@/types/domain'

const MAX_LIMIT = 60
const DEFAULT_LIMIT = 24
const RANKING_VERSION = 'search-v2.0'
const SEARCH_CACHE_TTL_MS = 15_000
const SEARCH_CACHE_MAX_ITEMS = 200

type SearchCacheEntry = {
  expiresAt: number
  payload: SearchApiResponse
}

const searchResponseCache = new Map<string, SearchCacheEntry>()

type RawPropertyRow = {
  id: number
  title: string
  slug: string | null
  description: string | null
  price: number
  currency: string | null
  status: string
  is_featured: boolean
  boost_level: number | null
  quality_score: number | null
  bedrooms: number | null
  bathrooms: number | null
  built_area: number | null
  plot_area: number | null
  main_image: string | null
  images: string[] | null
  lifestyle_tags: string[] | null
  location_id: number | null
  created_at: string
  location_lat?: number | null
  location_lng?: number | null
  coordinate_source?: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown' | null
  location_point_geojson?: { type: string; coordinates: number[] } | null
  location?: {
    name?: string | null
    slug?: string | null
  } | null
}

type Bounds = {
  north: number
  south: number
  east: number
  west: number
}

function asNumber(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseList(value: string | null) {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function parseBounds(searchParams: URLSearchParams): Bounds | null {
  const north = asNumber(searchParams.get('north'))
  const south = asNumber(searchParams.get('south'))
  const east = asNumber(searchParams.get('east'))
  const west = asNumber(searchParams.get('west'))

  if (north !== null && south !== null && east !== null && west !== null) {
    return { north, south, east, west }
  }

  const rawBounds = searchParams.get('bounds')
  if (!rawBounds) return null

  const [n, s, e, w] = rawBounds.split(',').map((entry) => Number(entry))
  if ([n, s, e, w].every((entry) => Number.isFinite(entry))) {
    return { north: n, south: s, east: e, west: w }
  }

  return null
}

function normalizeLimit(limit: number | null) {
  if (!limit || limit <= 0) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

function decodeCursor(cursor: string | null) {
  if (!cursor) return 0

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { offset?: number }
    if (typeof parsed.offset === 'number' && parsed.offset >= 0) return parsed.offset
  } catch {
    return 0
  }

  return 0
}

function encodeCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url')
}

function escapeForIlike(input: string) {
  return input.replace(/[%_]/g, '').replace(/[(),]/g, ' ').trim()
}

function isMissingColumnError(error: { message?: string } | null, column: string) {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  const normalizedColumn = column.toLowerCase()
  return (
    message.includes(`column ${normalizedColumn}`) ||
    message.includes(`column public.${normalizedColumn}`) ||
    message.includes(`column properties.${normalizedColumn}`) ||
    message.includes(`"${normalizedColumn}"`) ||
    message.includes(normalizedColumn)
  )
}

function getCoordinate(row: RawPropertyRow, target: 'lat' | 'lng') {
  const directValue = target === 'lat' ? row.location_lat : row.location_lng
  if (typeof directValue === 'number' && Number.isFinite(directValue)) return directValue

  const coords = row.location_point_geojson?.coordinates
  if (Array.isArray(coords) && coords.length >= 2) {
    return target === 'lat' ? coords[1] : coords[0]
  }

  return null
}

function toSearchItem(row: RawPropertyRow, rankingScore: number): PropertySearchItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: Number(row.price || 0),
    currency: row.currency || 'USD',
    status: row.status,
    is_featured: row.is_featured === true,
    boost_level: row.boost_level,
    quality_score: row.quality_score,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    built_area: row.built_area,
    plot_area: row.plot_area,
    main_image: row.main_image,
    images: Array.isArray(row.images) ? row.images : row.main_image ? [row.main_image] : [],
    lifestyle_tags: Array.isArray(row.lifestyle_tags) ? row.lifestyle_tags : [],
    location_id: row.location_id,
    location_name: row.location?.name || null,
    location_slug: row.location?.slug || null,
    lat: getCoordinate(row, 'lat'),
    lng: getCoordinate(row, 'lng'),
    coordinate_source: row.coordinate_source || null,
    created_at: row.created_at,
    ranking_score: Number(rankingScore.toFixed(4)),
  }
}

export async function GET(request: Request) {
  const startedAt = performance.now()

  try {
    const env = getInsforgeEnv()
    if (!env.featureSearchApiV2) {
      return NextResponse.json({ error: 'Search API v2 is disabled' }, { status: 503 })
    }

    const url = new URL(request.url)
    const searchParams = url.searchParams

    const q = escapeForIlike(searchParams.get('q') || '')
    const status = searchParams.get('status')
    const priceMin = asNumber(searchParams.get('price_min'))
    const priceMax = asNumber(searchParams.get('price_max'))
    const bedrooms = asNumber(searchParams.get('bedrooms'))
    const bathrooms = asNumber(searchParams.get('bathrooms'))
    const propertyType = searchParams.get('type')
    const lifestyles = parseList(searchParams.get('lifestyles'))
    const features = parseList(searchParams.get('features'))
    const sort = (searchParams.get('sort') || 'relevance') as 'relevance' | 'price_asc' | 'price_desc' | 'newest'
    const searchAsMove = searchParams.get('search_as_move') === 'true'
    const bounds = parseBounds(searchParams)
    const cursor = searchParams.get('cursor')
    const limit = normalizeLimit(asNumber(searchParams.get('limit')))
    const offset = decodeCursor(cursor)
    const candidateWindow = sort === 'relevance' ? Math.min(limit * 5, 240) : limit
    const cacheKey = `${searchParams.toString()}::offset=${offset}::limit=${limit}`
    const cached = searchResponseCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      const durationMs = Math.round(performance.now() - startedAt)
      return NextResponse.json({
        ...cached.payload,
        query_ms: durationMs,
      })
    }

    const supabase = createClient(env.baseUrl, env.anonKey)
    const baseSelect = `
      id,
      title,
      slug,
      description,
      price,
      currency,
      status,
      is_featured,
      boost_level,
      quality_score,
      bedrooms,
      bathrooms,
      built_area,
      plot_area,
      main_image,
      images,
      lifestyle_tags,
      location_id,
      created_at,
      location_lat,
      location_lng,
      coordinate_source,
      location_point_geojson,
      location:locations(name, slug)
    `

    const buildQuery = (selectColumns: string, applyBounds = true) => {
      let query = supabase.from('properties').select(selectColumns, { count: 'exact' })

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }

      if (status === 'for_sale' || status === 'for_rent') {
        query = query.eq('status', status)
      } else {
        query = query.in('status', ['for_sale', 'for_rent'])
      }

      if (priceMin !== null) query = query.gte('price', priceMin)
      if (priceMax !== null) query = query.lte('price', priceMax)
      if (bedrooms !== null) query = query.gte('bedrooms', bedrooms)
      if (bathrooms !== null) query = query.gte('bathrooms', bathrooms)
      if (propertyType) query = query.contains('features', { type: propertyType })
      if (lifestyles.length > 0) query = query.overlaps('lifestyle_tags', lifestyles)

      if (features.length > 0) {
        for (const feature of features) {
          query = query.contains('features', { [feature]: true })
        }
      }

      if (applyBounds && searchAsMove && bounds) {
        query = query
          .gte('location_lat', bounds.south)
          .lte('location_lat', bounds.north)
          .gte('location_lng', bounds.west)
          .lte('location_lng', bounds.east)
      }

      switch (sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true }).order('id', { ascending: false })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false }).order('id', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false }).order('id', { ascending: false })
          break
        default:
          query = query
            .order('is_featured', { ascending: false })
            .order('boost_level', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
      }

      return query.range(offset, offset + candidateWindow - 1)
    }

    let { data, error, count } = await buildQuery(baseSelect)
    const hasOptionalLocationColumnError =
      isMissingColumnError(error, 'location_lat') ||
      isMissingColumnError(error, 'location_lng') ||
      isMissingColumnError(error, 'coordinate_source') ||
      isMissingColumnError(error, 'location_point_geojson')

    if (error && hasOptionalLocationColumnError) {
      const fallbackSelect = baseSelect
        .replace(',\n      location_lat', '')
        .replace(',\n      location_lng', '')
        .replace(',\n      coordinate_source', '')
        .replace(',\n      location_point_geojson', '')

      const fallbackResult = await buildQuery(fallbackSelect, false)
      data = fallbackResult.data
      error = fallbackResult.error
      count = fallbackResult.count
    }

    if (error) {
      return NextResponse.json({ error: error.message || 'Search failed' }, { status: 400 })
    }

    let rows = ((data || []) as RawPropertyRow[]).filter((row) => row && typeof row.id === 'number')
    if (searchAsMove && bounds) {
      rows = rows.filter((row) => {
        const lat = getCoordinate(row, 'lat')
        const lng = getCoordinate(row, 'lng')
        if (lat === null || lng === null) return false
        return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
      })
    }
    let items: PropertySearchItem[]

    if (sort === 'relevance') {
      const ranked = rankRows(rows, lifestyles, priceMin, priceMax)
      items = ranked.slice(0, limit).map(({ row, score }) => toSearchItem(row, score))
    } else {
      items = rows.slice(0, limit).map((row) => toSearchItem(row, 0))
    }

    const hasMore = typeof count === 'number'
      ? count > offset + items.length
      : rows.length > limit
    const nextCursor = hasMore ? encodeCursor(offset + items.length) : null
    const durationMs = Math.round(performance.now() - startedAt)

    const response: SearchApiResponse = {
      data: items,
      next_cursor: nextCursor,
      total_estimate: typeof count === 'number' ? count : items.length,
      query_ms: durationMs,
      ranking_version: RANKING_VERSION,
    }

    if (searchResponseCache.size >= SEARCH_CACHE_MAX_ITEMS) {
      const firstKey = searchResponseCache.keys().next().value
      if (typeof firstKey === 'string') {
        searchResponseCache.delete(firstKey)
      }
    }
    searchResponseCache.set(cacheKey, {
      payload: response,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    })

    return NextResponse.json(response)
  } catch (error: unknown) {
    const durationMs = Math.round(performance.now() - startedAt)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        query_ms: durationMs,
      },
      { status: 500 }
    )
  }
}

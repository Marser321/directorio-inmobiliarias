import type { CadastreLookupDto } from '@/types/domain'

const DEFAULT_QUERY_URL =
  'https://gis.maldonado.gub.uy/server/rest/services/Consulta_Catastral/MapServer/0/query'
const REQUEST_TIMEOUT_MS = 2500
const CACHE_TTL_MS = 30 * 60 * 1000

type QueryInput = {
  padron?: string | null
  address?: string | null
  city?: string | null
  lat?: number | null
  lng?: number | null
}

type ArcGisFeature = {
  attributes?: Record<string, unknown>
  geometry?: {
    x?: number
    y?: number
  } | null
}

type ArcGisResponse = {
  features?: ArcGisFeature[]
  error?: {
    message?: string
    code?: number
  }
}

type CacheEntry = {
  expiresAt: number
  value: CadastreLookupDto | null
}

export type CadastreLookupResult = {
  data: CadastreLookupDto | null
  providerStatus: 'ok' | 'not_found' | 'provider_error'
  providerLatencyMs: number
  cacheHit: boolean
}

const cache = new Map<string, CacheEntry>()

function asText(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toCacheKey(input: QueryInput) {
  if (input.padron) return `padron:${input.padron.trim().toLowerCase()}`
  if (input.address || input.city) {
    return `address:${(input.address || '').trim().toLowerCase()}|${(input.city || '').trim().toLowerCase()}`
  }
  if (typeof input.lat === 'number' && typeof input.lng === 'number') {
    return `coords:${input.lat.toFixed(5)},${input.lng.toFixed(5)}`
  }
  return 'empty'
}

function resolveQueryUrl() {
  const value = process.env.GEOCATASTRO_ARCGIS_QUERY_URL
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return DEFAULT_QUERY_URL
}

function buildBaseParams() {
  const params = new URLSearchParams()
  params.set('f', 'json')
  params.set('outFields', '*')
  params.set('resultRecordCount', '1')
  params.set('returnGeometry', 'true')
  params.set('outSR', '4326')
  return params
}

function buildEscapedWhere(field: string, rawValue: string) {
  const escaped = rawValue.replace(/'/g, "''")
  return `${field}='${escaped}'`
}

function getPadronWhereCandidates(padron: string) {
  const fields = ['PADRON', 'padron', 'PADRON_NRO', 'PADRON_N', 'NUM_PADRON']
  return fields.map((field) => buildEscapedWhere(field, padron))
}

function getAddressWhereCandidates(address: string) {
  const fields = ['DIRECCION', 'direccion', 'CALLE', 'NOMBRE_VIA', 'DOMICILIO']
  return fields.map((field) => `${field} LIKE '%${address.replace(/'/g, "''")}%'`)
}

async function fetchArcGis(params: URLSearchParams): Promise<ArcGisResponse | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const queryUrl = resolveQueryUrl()
    const url = `${queryUrl}?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) return null
    return (await response.json()) as ArcGisResponse
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeFeature(feature: ArcGisFeature, source: 'geocatastro' | 'cache'): CadastreLookupDto | null {
  const attributes = feature.attributes || {}
  const geometry = feature.geometry || null

  const padron =
    asText(attributes.PADRON) ||
    asText(attributes.padron) ||
    asText(attributes.PADRON_NRO) ||
    asText(attributes.NUM_PADRON) ||
    null
  const localidad =
    asText(attributes.LOCALIDAD) ||
    asText(attributes.localidad) ||
    asText(attributes.BARRIO) ||
    asText(attributes.ZONA) ||
    null
  const areaM2 =
    asFiniteNumber(attributes.AREA_M2) ||
    asFiniteNumber(attributes.area_m2) ||
    asFiniteNumber(attributes.SUPERFICIE) ||
    asFiniteNumber(attributes.superficie) ||
    null

  const x = asFiniteNumber(geometry?.x)
  const y = asFiniteNumber(geometry?.y)
  const geometryCentroid =
    x !== null && y !== null
      ? {
          lat: Number(y.toFixed(6)),
          lng: Number(x.toFixed(6)),
        }
      : null

  if (!padron && !localidad && areaM2 === null && geometryCentroid === null) {
    return null
  }

  return {
    padron,
    localidad,
    area_m2: areaM2 !== null ? Number(areaM2.toFixed(2)) : null,
    geometry_centroid: geometryCentroid,
    source,
    fetched_at: new Date().toISOString(),
  }
}

function readCache(key: string) {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value
}

function writeCache(key: string, value: CadastreLookupDto | null) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

async function queryByWhere(whereClauses: string[]) {
  let providerFailed = false
  for (const where of whereClauses) {
    const params = buildBaseParams()
    params.set('where', where)
    const payload = await fetchArcGis(params)
    if (!payload) {
      providerFailed = true
      continue
    }
    if (payload.error) continue
    const first = Array.isArray(payload.features) ? payload.features[0] : null
    if (first) {
      return { feature: first, providerFailed }
    }
  }
  return { feature: null, providerFailed }
}

async function queryByGeometry(lat: number, lng: number) {
  const params = buildBaseParams()
  params.set('where', '1=1')
  params.set('geometry', `${lng},${lat}`)
  params.set('geometryType', 'esriGeometryPoint')
  params.set('inSR', '4326')
  params.set('spatialRel', 'esriSpatialRelIntersects')
  params.set('distance', '100')
  params.set('units', 'esriSRUnit_Meter')
  const payload = await fetchArcGis(params)
  if (!payload) return { feature: null, providerFailed: true }
  if (payload.error) return { feature: null, providerFailed: false }
  return {
    feature: Array.isArray(payload.features) ? payload.features[0] || null : null,
    providerFailed: false,
  }
}

export async function lookupCadastre(input: QueryInput): Promise<CadastreLookupResult> {
  const startedAt = performance.now()
  const key = toCacheKey(input)
  const fromCache = readCache(key)
  if (fromCache !== null) {
    const cachedData = fromCache
      ? {
          ...fromCache,
          source: 'cache' as const,
        }
      : null

    return {
      data: cachedData,
      providerStatus: cachedData ? 'ok' : 'not_found',
      providerLatencyMs: Math.round(performance.now() - startedAt),
      cacheHit: true,
    }
  }

  let feature: ArcGisFeature | null = null
  let providerFailed = false

  const padron = asText(input.padron)
  const address = asText(input.address)
  const lat = asFiniteNumber(input.lat)
  const lng = asFiniteNumber(input.lng)

  if (padron) {
    const result = await queryByWhere(getPadronWhereCandidates(padron))
    feature = result.feature
    providerFailed = result.providerFailed
  } else if (address) {
    const result = await queryByWhere(getAddressWhereCandidates(address))
    feature = result.feature
    providerFailed = result.providerFailed
  } else if (lat !== null && lng !== null) {
    const result = await queryByGeometry(lat, lng)
    feature = result.feature
    providerFailed = result.providerFailed
  }

  const normalized = feature ? normalizeFeature(feature, 'geocatastro') : null
  writeCache(key, normalized)

  return {
    data: normalized,
    providerStatus: normalized ? 'ok' : providerFailed ? 'provider_error' : 'not_found',
    providerLatencyMs: Math.round(performance.now() - startedAt),
    cacheHit: false,
  }
}

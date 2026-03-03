import { NextResponse } from 'next/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { checkRateLimit, getRequestIp } from '@/lib/api/rate-limit'
import { lookupCadastre } from '@/lib/geocatastro/client'

function asText(value: string | null) {
  if (!value) return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function asFiniteNumber(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureGeocatastroLookup) {
      return NextResponse.json({ error: 'Geocatastro lookup feature is disabled' }, { status: 503 })
    }

    const ip = getRequestIp(request)
    const rateLimited = checkRateLimit(`geo-cadastre:${ip}`, 40, 60_000)
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const url = new URL(request.url)
    const padron = asText(url.searchParams.get('padron'))
    const address = asText(url.searchParams.get('address'))
    const city = asText(url.searchParams.get('city'))
    const lat = asFiniteNumber(url.searchParams.get('lat'))
    const lng = asFiniteNumber(url.searchParams.get('lng'))

    if (!padron && !address && (lat === null || lng === null)) {
      return NextResponse.json(
        {
          error: 'Provide padron, address/city, or lat/lng',
        },
        { status: 400 }
      )
    }

    const lookup = await lookupCadastre({
      padron,
      address,
      city,
      lat,
      lng,
    })

    if (lookup.providerStatus === 'provider_error') {
      return NextResponse.json(
        {
          data: null,
          telemetry: {
            provider_status: lookup.providerStatus,
            provider_latency_ms: lookup.providerLatencyMs,
            cache_hit: lookup.cacheHit,
          },
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      data: lookup.data,
      telemetry: {
        provider_status: lookup.providerStatus,
        provider_latency_ms: lookup.providerLatencyMs,
        cache_hit: lookup.cacheHit,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

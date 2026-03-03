import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { createAdminClient } from '@/utils/supabase/admin'

type VibeRow = {
  zone_name: string | null
  noise_score: number | null
  safety_score: number | null
  wind_score: number | null
}

type FunnelRow = {
  event_name: string
  metadata?: Record<string, unknown> | null
}

type ZoneInsight = {
  zone: string
  vibe: {
    noise: number
    safety: number
    wind: number
  }
  funnel: {
    property_viewed: number
    whatsapp_clicked: number
    lead_form_submitted: number
    view_to_whatsapp: number
    view_to_lead: number
  }
}

function normalizeZone(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(2))
}

export async function GET(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureZoneInsights) {
      return NextResponse.json({ error: 'Zone insights feature is disabled' }, { status: 503 })
    }

    const url = new URL(request.url)
    const days = Math.min(Math.max(Number(url.searchParams.get('days') || 30), 1), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    let database: ReturnType<typeof createAdminClient>
    try {
      database = createAdminClient()
    } catch (error: unknown) {
      return NextResponse.json({ error: getErrorMessage(error, 'Admin client is not configured') }, { status: 503 })
    }

    const vibeMap = new Map<string, { noise: number[]; safety: number[]; wind: number[] }>()
    const funnelMap = new Map<string, { viewed: number; whatsapp: number; lead: number }>()

    const { data: vibeRows, error: vibeError } = await database
      .from('vibe_scores')
      .select('zone_name, noise_score, safety_score, wind_score')
      .limit(10_000)

    if (vibeError) {
      return NextResponse.json({ error: vibeError.message || 'Failed to load vibe scores' }, { status: 400 })
    }

    for (const row of (vibeRows as VibeRow[] | null) || []) {
      const zone = normalizeZone(row.zone_name)
      if (!zone) continue

      const current = vibeMap.get(zone) || { noise: [], safety: [], wind: [] }
      if (typeof row.noise_score === 'number') current.noise.push(row.noise_score)
      if (typeof row.safety_score === 'number') current.safety.push(row.safety_score)
      if (typeof row.wind_score === 'number') current.wind.push(row.wind_score)
      vibeMap.set(zone, current)
    }

    const { data: funnelRows, error: funnelError } = await database
      .from('user_funnel_events')
      .select('event_name, metadata')
      .gte('created_at', since)
      .in('event_name', ['property_viewed', 'whatsapp_clicked', 'lead_form_submitted'])
      .limit(20_000)

    if (funnelError) {
      return NextResponse.json({ error: funnelError.message || 'Failed to load funnel events' }, { status: 400 })
    }

    for (const row of (funnelRows as FunnelRow[] | null) || []) {
      const zone = normalizeZone(row.metadata?.zone)
      if (!zone) continue

      const current = funnelMap.get(zone) || { viewed: 0, whatsapp: 0, lead: 0 }
      if (row.event_name === 'property_viewed') current.viewed += 1
      if (row.event_name === 'whatsapp_clicked') current.whatsapp += 1
      if (row.event_name === 'lead_form_submitted') current.lead += 1
      funnelMap.set(zone, current)
    }

    const zones = new Set([...vibeMap.keys(), ...funnelMap.keys()])
    const insights: ZoneInsight[] = [...zones].map((zone) => {
      const vibe = vibeMap.get(zone) || { noise: [], safety: [], wind: [] }
      const funnel = funnelMap.get(zone) || { viewed: 0, whatsapp: 0, lead: 0 }
      const avg = (values: number[]) => {
        if (values.length === 0) return 0
        return Number((values.reduce((acc, item) => acc + item, 0) / values.length).toFixed(2))
      }

      return {
        zone,
        vibe: {
          noise: avg(vibe.noise),
          safety: avg(vibe.safety),
          wind: avg(vibe.wind),
        },
        funnel: {
          property_viewed: funnel.viewed,
          whatsapp_clicked: funnel.whatsapp,
          lead_form_submitted: funnel.lead,
          view_to_whatsapp: toPercent(funnel.whatsapp, funnel.viewed),
          view_to_lead: toPercent(funnel.lead, funnel.viewed),
        },
      }
    })

    insights.sort((a, b) => b.funnel.property_viewed - a.funnel.property_viewed)

    return NextResponse.json({
      data: insights.slice(0, 8),
      period_days: days,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

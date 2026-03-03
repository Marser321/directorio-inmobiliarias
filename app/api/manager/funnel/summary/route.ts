import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

type ProfileRow = {
  role?: string
  is_admin?: boolean
}

type MembershipRow = {
  agency_id?: number
}

type FunnelEventRow = {
  id: string
  created_at: string
  event_name: string
  agency_id: number | null
  metadata?: Record<string, unknown> | null
}

const FUNNEL_EVENT_NAMES = [
  'hero_search_submitted',
  'search_results_loaded',
  'search_result_clicked',
  'property_viewed',
  'whatsapp_clicked',
  'lead_form_submitted',
] as const

const SOURCE_BREAKDOWN_EVENT_NAMES = [
  'property_viewed',
  'whatsapp_clicked',
  'lead_form_submitted',
] as const
const COORDINATE_SOURCES = ['manual', 'geocoded', 'centroid', 'none', 'unknown'] as const

type FunnelCounter = Record<(typeof FUNNEL_EVENT_NAMES)[number], number>
type SourceBreakdownEventName = (typeof SOURCE_BREAKDOWN_EVENT_NAMES)[number]
type CoordinateSourceKey = (typeof COORDINATE_SOURCES)[number]

type CoordinateSourceCounter = Record<SourceBreakdownEventName, number> & {
  total_events: number
}

function emptyCounter(): FunnelCounter {
  return {
    hero_search_submitted: 0,
    search_results_loaded: 0,
    search_result_clicked: 0,
    property_viewed: 0,
    whatsapp_clicked: 0,
    lead_form_submitted: 0,
  }
}

function emptyCoordinateSourceCounter(): CoordinateSourceCounter {
  return {
    property_viewed: 0,
    whatsapp_clicked: 0,
    lead_form_submitted: 0,
    total_events: 0,
  }
}

function emptyConversion() {
  return {
    search_to_click: 0,
    click_to_view: 0,
    view_to_whatsapp: 0,
    view_to_lead: 0,
  }
}

function normalizeCoordinateSource(value: unknown): CoordinateSourceKey {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'manual') return 'manual'
  if (normalized === 'geocoded') return 'geocoded'
  if (normalized === 'centroid') return 'centroid'
  if (normalized === 'none') return 'none'
  return 'unknown'
}

export async function GET(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureFunnelEvents) {
      return NextResponse.json({ data: null, disabled: true })
    }

    const url = new URL(request.url)
    const days = Math.min(Math.max(Number(url.searchParams.get('days') || 7), 1), 30)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await database
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>()

    const isAdmin = profile?.is_admin === true || profile?.role === 'platform_admin'

    const { data: membership } = await database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', user.id)
      .maybeSingle<MembershipRow>()

    let query = database
      .from('user_funnel_events')
      .select('id, created_at, event_name, agency_id, metadata')
      .gte('created_at', since)
      .in('event_name', [...FUNNEL_EVENT_NAMES])
      .order('created_at', { ascending: true })
      .limit(10_000)

    if (!isAdmin && membership?.agency_id) {
      query = query.eq('agency_id', membership.agency_id)
    } else if (!isAdmin && !membership?.agency_id) {
      return NextResponse.json({
        data: {
          totals: emptyCounter(),
          conversion: emptyConversion(),
          byDay: [],
          topZones: [],
          topPriceBands: [],
          byCoordinateSource: [],
          periodDays: days,
        },
      })
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to fetch funnel summary' }, { status: 400 })
    }

    const events = (data || []) as FunnelEventRow[]
    const totals = emptyCounter()
    const byDayMap = new Map<string, FunnelCounter>()
    const byZone = new Map<string, number>()
    const byPriceBand = new Map<string, number>()
    const byCoordinateSourceMap = new Map<CoordinateSourceKey, CoordinateSourceCounter>()

    for (const event of events) {
      if (!FUNNEL_EVENT_NAMES.includes(event.event_name as (typeof FUNNEL_EVENT_NAMES)[number])) continue

      const eventName = event.event_name as (typeof FUNNEL_EVENT_NAMES)[number]
      totals[eventName] += 1

      const day = new Date(event.created_at).toISOString().slice(0, 10)
      const dayCounter = byDayMap.get(day) || emptyCounter()
      dayCounter[eventName] += 1
      byDayMap.set(day, dayCounter)

      const zone = typeof event.metadata?.zone === 'string' ? event.metadata.zone : null
      if (zone) byZone.set(zone, (byZone.get(zone) || 0) + 1)

      const priceBand = typeof event.metadata?.price_band === 'string' ? event.metadata.price_band : null
      if (priceBand) byPriceBand.set(priceBand, (byPriceBand.get(priceBand) || 0) + 1)
    }

    for (const event of events) {
      if (!SOURCE_BREAKDOWN_EVENT_NAMES.includes(event.event_name as SourceBreakdownEventName)) continue

      const sourceKey = normalizeCoordinateSource(event.metadata?.coordinate_source)
      const sourceCounter = byCoordinateSourceMap.get(sourceKey) || emptyCoordinateSourceCounter()
      const sourceEventName = event.event_name as SourceBreakdownEventName
      sourceCounter[sourceEventName] += 1
      sourceCounter.total_events += 1
      byCoordinateSourceMap.set(sourceKey, sourceCounter)
    }

    const safeDiv = (numerator: number, denominator: number) =>
      denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0

    const conversion = {
      search_to_click: safeDiv(totals.search_result_clicked, totals.search_results_loaded),
      click_to_view: safeDiv(totals.property_viewed, totals.search_result_clicked),
      view_to_whatsapp: safeDiv(totals.whatsapp_clicked, totals.property_viewed),
      view_to_lead: safeDiv(totals.lead_form_submitted, totals.property_viewed),
    }

    const byDay = [...byDayMap.entries()].map(([day, counts]) => ({ day, ...counts }))
    const topZones = [...byZone.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([zone, total]) => ({ zone, total }))
    const topPriceBands = [...byPriceBand.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([price_band, total]) => ({ price_band, total }))
    const byCoordinateSource = COORDINATE_SOURCES.map((source) => {
      const counts = byCoordinateSourceMap.get(source) || emptyCoordinateSourceCounter()
      return {
        source,
        ...counts,
        view_to_whatsapp: safeDiv(counts.whatsapp_clicked, counts.property_viewed),
        view_to_lead: safeDiv(counts.lead_form_submitted, counts.property_viewed),
      }
    }).filter((entry) => entry.total_events > 0)

    return NextResponse.json({
      data: {
        totals,
        conversion,
        byDay,
        topZones,
        topPriceBands,
        byCoordinateSource,
        periodDays: days,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

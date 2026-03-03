import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getErrorMessage } from '@/lib/insforge/compat'
import { checkRateLimit, getRequestIp } from '@/lib/api/rate-limit'
import { normalizePhoneE164, resolveAlertsScope } from '../_shared'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 40

const createSavedSearchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  filters: z.record(z.string(), z.unknown()).default({}),
  phone_e164: z.string().trim().min(8).max(20),
  consent_at: z.string().datetime(),
})

const patchSavedSearchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  phone_e164: z.string().trim().min(8).max(20).optional(),
  is_active: z.boolean().optional(),
})

const deleteSavedSearchSchema = z.object({
  id: z.string().uuid(),
})

type SavedSearchRow = {
  id: string
  name: string
  filters: Record<string, unknown>
  channel: 'whatsapp'
  phone_e164: string
  consent_at: string
  is_active: boolean
  last_run_at: string | null
  created_at: string
}

export async function GET(request: Request) {
  try {
    const ip = getRequestIp(request)
    if (checkRateLimit(`saved-search:get:${ip}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const scope = await resolveAlertsScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Alerts scope is unavailable' }, { status: 500 })
    }

    const { data, error } = await scope.database
      .from('saved_searches')
      .select('id, name, filters, channel, phone_e164, consent_at, is_active, last_run_at, created_at')
      .eq('user_id', scope.userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load saved searches' }, { status: 400 })
    }

    return NextResponse.json({ data: (data as SavedSearchRow[] | null) || [] })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request)
    if (checkRateLimit(`saved-search:write:${ip}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const scope = await resolveAlertsScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Alerts scope is unavailable' }, { status: 500 })
    }

    const payload = await request.json()
    const parsed = createSavedSearchSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid saved search payload', issues: parsed.error.issues }, { status: 400 })
    }

    const normalizedPhone = normalizePhoneE164(parsed.data.phone_e164)
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'phone_e164 must be a valid E.164 number' }, { status: 400 })
    }

    const { data, error } = await scope.database
      .from('saved_searches')
      .insert([
        {
          user_id: scope.userId,
          name: parsed.data.name,
          filters: parsed.data.filters,
          channel: 'whatsapp',
          phone_e164: normalizedPhone,
          consent_at: parsed.data.consent_at,
          is_active: true,
        },
      ])
      .select('id, name, filters, channel, phone_e164, consent_at, is_active, last_run_at, created_at')
      .maybeSingle<SavedSearchRow>()

    if (error || !data?.id) {
      return NextResponse.json({ error: error?.message || 'Failed to create saved search' }, { status: 400 })
    }

    await scope.database.from('user_funnel_events').insert([
      {
        session_id: `saved-search-${data.id}`,
        event_name: 'saved_search_created',
        page_path: '/search',
        property_id: null,
        agency_id: null,
        metadata: {
          channel: 'whatsapp',
          has_filters: Object.keys(parsed.data.filters || {}).length > 0,
        },
      },
    ])

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ip = getRequestIp(request)
    if (checkRateLimit(`saved-search:write:${ip}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const scope = await resolveAlertsScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Alerts scope is unavailable' }, { status: 500 })
    }

    const payload = await request.json()
    const parsed = patchSavedSearchSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid saved search update payload', issues: parsed.error.issues }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
    if (parsed.data.filters !== undefined) updatePayload.filters = parsed.data.filters
    if (parsed.data.is_active !== undefined) updatePayload.is_active = parsed.data.is_active
    if (parsed.data.phone_e164 !== undefined) {
      const normalizedPhone = normalizePhoneE164(parsed.data.phone_e164)
      if (!normalizedPhone) {
        return NextResponse.json({ error: 'phone_e164 must be a valid E.164 number' }, { status: 400 })
      }
      updatePayload.phone_e164 = normalizedPhone
    }

    const { data, error } = await scope.database
      .from('saved_searches')
      .update(updatePayload)
      .eq('id', parsed.data.id)
      .eq('user_id', scope.userId)
      .select('id, name, filters, channel, phone_e164, consent_at, is_active, last_run_at, created_at')
      .maybeSingle<SavedSearchRow>()

    if (error || !data?.id) {
      return NextResponse.json({ error: error?.message || 'Failed to update saved search' }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ip = getRequestIp(request)
    if (checkRateLimit(`saved-search:write:${ip}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const scope = await resolveAlertsScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Alerts scope is unavailable' }, { status: 500 })
    }

    const payload = await request.json()
    const parsed = deleteSavedSearchSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid delete payload', issues: parsed.error.issues }, { status: 400 })
    }

    const { error } = await scope.database
      .from('saved_searches')
      .delete()
      .eq('id', parsed.data.id)
      .eq('user_id', scope.userId)

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to delete saved search' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

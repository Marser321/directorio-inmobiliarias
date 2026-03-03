import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import type { LuxeStudioRequestType } from '@/types/domain'

interface AgencyMembershipRow {
  agency_id: number
}

interface MarketingRequestBody {
  type?: string
  details?: Record<string, unknown>
}

const ALLOWED_SERVICE_TYPES: LuxeStudioRequestType[] = ['property_photos', 'video_tour', 'copywriting', 'social_media']

function normalizeRequestType(value: string | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) return null
  return ALLOWED_SERVICE_TYPES.includes(normalized as LuxeStudioRequestType)
    ? (normalized as LuxeStudioRequestType)
    : null
}

function parsePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed)
  }
  return null
}

function sanitizeDetails(details: unknown) {
  const source = details && typeof details === 'object' ? (details as Record<string, unknown>) : {}
  const sanitized: Record<string, unknown> = {}

  const propertyId = parsePositiveInt(source.property_id)
  if (propertyId !== null) {
    sanitized.property_id = propertyId
  }

  if (typeof source.property_url === 'string') {
    const url = source.property_url.trim()
    if (url.length > 0 && url.length <= 500) {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          sanitized.property_url = parsed.toString()
        }
      } catch {
        // Ignore invalid URLs; do not persist unsanitized value.
      }
    }
  }

  if (typeof source.source === 'string') {
    const sourceValue = source.source.trim().slice(0, 120)
    if (sourceValue.length > 0) {
      sanitized.source = sourceValue
    }
  }

  if (typeof source.instructions === 'string') {
    const instructions = source.instructions.trim().slice(0, 2000)
    if (instructions.length > 0) {
      sanitized.instructions = instructions
    }
  }

  return sanitized
}

export async function GET() {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeMarketing) {
      return NextResponse.json({ data: [], disabled: true })
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', user.id)
      .maybeSingle<AgencyMembershipRow>()

    if (!membership?.agency_id) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await database
      .from('service_requests')
      .select('*')
      .eq('agency_id', membership.agency_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeMarketing) {
      return NextResponse.json({ error: 'Marketing feature is disabled' }, { status: 503 })
    }

    const body = (await request.json()) as MarketingRequestBody
    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', user.id)
      .maybeSingle<AgencyMembershipRow>()

    if (!membership?.agency_id) {
      return NextResponse.json({ error: 'Forbidden: user has no agency membership' }, { status: 403 })
    }

    const requestType = normalizeRequestType(body.type)
    if (!requestType) {
      return NextResponse.json(
        {
          error: `Invalid type. Allowed values: ${ALLOWED_SERVICE_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const details = sanitizeDetails(body.details)

    const { data, error } = await database
      .from('service_requests')
      .insert([
        {
          user_id: user.id,
          agency_id: membership.agency_id,
          type: requestType,
          details,
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[api/marketing/requests] Failed to create request', {
        userId: user.id,
        agencyId: membership.agency_id,
        requestType,
        error: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('[api/marketing/requests] Unhandled POST error', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

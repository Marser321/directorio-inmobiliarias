import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createInsforgeClient } from '@/lib/insforge/client'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 120
const rateLimitBucket = new Map<string, { count: number; startedAt: number }>()

const eventNameSchema = z.enum([
  'hero_search_submitted',
  'search_results_loaded',
  'search_result_clicked',
  'property_viewed',
  'whatsapp_clicked',
  'lead_form_submitted',
  'partner_draft_created',
  'partner_property_published',
  'compare_opened',
  'compare_property_added',
  'compare_property_removed',
  'saved_search_created',
  'whatsapp_alert_sent',
])

const funnelEventSchema = z.object({
  event_name: eventNameSchema,
  session_id: z.string().trim().min(6).max(120),
  page_path: z.string().trim().min(1).max(300),
  property_id: z.number().int().positive().optional(),
  agency_id: z.number().int().positive().optional(),
  referrer: z.string().trim().max(600).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded && forwarded.trim().length > 0) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(key: string) {
  const now = Date.now()
  const current = rateLimitBucket.get(key)

  if (!current || now - current.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBucket.set(key, { count: 1, startedAt: now })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  current.count += 1
  rateLimitBucket.set(key, current)
  return false
}

function stringLooksLikePii(value: string) {
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  const phonePattern = /\+?\d[\d\s().-]{6,}\d/
  return emailPattern.test(value) || phonePattern.test(value)
}

function containsPii(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return stringLooksLikePii(value)
  if (typeof value === 'number' || typeof value === 'boolean') return false
  if (Array.isArray(value)) return value.some((entry) => containsPii(entry))
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) => containsPii(entry))
  }
  return false
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {}

  const entries = Object.entries(metadata).slice(0, 25)
  const safeObject: Record<string, unknown> = {}

  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      safeObject[key] = value.slice(0, 240)
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      safeObject[key] = value
      continue
    }

    if (Array.isArray(value)) {
      safeObject[key] = value.slice(0, 20).map((entry) => (typeof entry === 'string' ? entry.slice(0, 120) : entry))
      continue
    }

    safeObject[key] = value
  }

  return safeObject
}

function isMissingTableError(error: { message?: string; code?: string } | null, table: string) {
  const code = error?.code?.toLowerCase() || ''
  const message = error?.message?.toLowerCase() || ''
  const normalized = table.toLowerCase()
  return (
    code === '42p01' ||
    message.includes(`relation "${normalized}" does not exist`) ||
    message.includes(`relation '${normalized}' does not exist`) ||
    message.includes(`relation ${normalized} does not exist`) ||
    message.includes(normalized)
  )
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureFunnelEvents) {
      return NextResponse.json({ accepted: false, disabled: true }, { status: 202 })
    }

    const payload = await request.json()
    const parsed = funnelEventSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid funnel event payload' }, { status: 400 })
    }

    if (containsPii(parsed.data.metadata)) {
      return NextResponse.json({ error: 'PII detected in metadata' }, { status: 400 })
    }

    const clientIp = getClientIp(request)
    const rateLimitKey = `${clientIp}:${parsed.data.session_id}`
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const client = createInsforgeClient()
    const database = asCompatDatabase(client.database)

    const { error } = await database.from('user_funnel_events').insert([
      {
        session_id: parsed.data.session_id,
        event_name: parsed.data.event_name,
        page_path: parsed.data.page_path,
        property_id: parsed.data.property_id ?? null,
        agency_id: parsed.data.agency_id ?? null,
        referrer: parsed.data.referrer ?? null,
        metadata: sanitizeMetadata(parsed.data.metadata),
      },
    ])

    if (error) {
      if (isMissingTableError(error, 'user_funnel_events')) {
        return NextResponse.json({ accepted: true, degraded: true, reason: 'missing_user_funnel_events' }, { status: 202 })
      }
      return NextResponse.json(
        {
          accepted: true,
          degraded: true,
          reason: 'event_storage_unavailable',
        },
        { status: 202 }
      )
    }

    return NextResponse.json({ accepted: true }, { status: 202 })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

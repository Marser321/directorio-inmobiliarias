import type { FunnelEventName, FunnelEventPayload } from '@/types/domain'

const SESSION_STORAGE_KEY = 'funnel_session_id'
const MAX_METADATA_KEYS = 20
const MAX_STRING_LENGTH = 240

function truncate(value: string) {
  return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    return truncate(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeValue(entry))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_METADATA_KEYS)
    return Object.fromEntries(entries.map(([key, entry]) => [key, sanitizeValue(entry)]))
  }

  return String(value)
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {}

  const trimmedEntries = Object.entries(metadata).slice(0, MAX_METADATA_KEYS)
  return Object.fromEntries(trimmedEntries.map(([key, value]) => [key, sanitizeValue(value)]))
}

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function getOrCreateFunnelSessionId() {
  if (typeof window === 'undefined') {
    return 'server-session'
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing && existing.length > 0) return existing

  const created = generateSessionId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, created)
  return created
}

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  options: Omit<Partial<FunnelEventPayload>, 'event_name' | 'session_id'> = {}
) {
  if (typeof window === 'undefined') return

  const payload: FunnelEventPayload = {
    event_name: eventName,
    session_id: getOrCreateFunnelSessionId(),
    page_path: options.page_path || window.location.pathname,
    property_id: options.property_id,
    agency_id: options.agency_id,
    referrer: options.referrer || document.referrer || undefined,
    metadata: sanitizeMetadata(options.metadata),
  }

  try {
    await fetch('/api/events/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Silent fail: analytics should never break UX.
  }
}

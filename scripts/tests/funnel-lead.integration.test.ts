import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

type HealthResponse = {
  flags?: {
    funnelEvents?: boolean
    leadFormFallback?: boolean
  }
}

type SearchResponse = {
  data: Array<{ id: number }>
}

let serverReady: boolean | null = null
let healthFlags: HealthResponse['flags'] | null = null

async function ensureServer(t: TestContext) {
  if (serverReady === true) return
  if (serverReady === false) {
    t.skip(`No hay servidor disponible en ${BASE_URL}`)
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/health/config`, { cache: 'no-store' })
    if (!response.ok) {
      serverReady = false
      t.skip(`No hay servidor disponible en ${BASE_URL}`)
      return
    }

    const payload = (await response.json()) as HealthResponse
    healthFlags = payload.flags || null
    serverReady = true
  } catch {
    serverReady = false
    t.skip(`No hay servidor disponible en ${BASE_URL}`)
    return
  }
}

function sessionId() {
  return `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function getAnyPropertyId(): Promise<number | null> {
  const response = await fetch(`${BASE_URL}/api/search/properties?limit=1`, { cache: 'no-store' })
  if (!response.ok) return null
  const payload = (await response.json()) as SearchResponse
  return payload.data?.[0]?.id ?? null
}

test('funnel endpoint accepts valid public events', async (t) => {
  await ensureServer(t)
  if (!healthFlags?.funnelEvents) {
    t.skip('FEATURE_FUNNEL_EVENTS está desactivado')
    return
  }

  const response = await fetch(`${BASE_URL}/api/events/funnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: 'hero_search_submitted',
      session_id: sessionId(),
      page_path: '/search',
      metadata: {
        source: 'integration-test',
      },
    }),
  })

  assert.equal(response.status, 202)
  const payload = (await response.json()) as { accepted?: boolean }
  assert.equal(payload.accepted, true)
})

test('funnel endpoint rejects metadata with PII', async (t) => {
  await ensureServer(t)
  if (!healthFlags?.funnelEvents) {
    t.skip('FEATURE_FUNNEL_EVENTS está desactivado')
    return
  }

  const response = await fetch(`${BASE_URL}/api/events/funnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: 'search_result_clicked',
      session_id: sessionId(),
      page_path: '/search',
      metadata: {
        email: 'persona@example.com',
      },
    }),
  })

  assert.equal(response.status, 400)
})

test('funnel sequence Search -> Ficha -> WhatsApp is accepted', async (t) => {
  await ensureServer(t)
  if (!healthFlags?.funnelEvents) {
    t.skip('FEATURE_FUNNEL_EVENTS está desactivado')
    return
  }

  const propId = await getAnyPropertyId()
  if (!propId) {
    t.skip('No hay propiedades para testear funnel')
    return
  }

  const sid = sessionId()
  const steps = [
    'hero_search_submitted',
    'search_results_loaded',
    'search_result_clicked',
    'property_viewed',
    'whatsapp_clicked',
  ] as const

  for (const eventName of steps) {
    const response = await fetch(`${BASE_URL}/api/events/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        session_id: sid,
        page_path: eventName === 'property_viewed' || eventName === 'whatsapp_clicked' ? `/property/${propId}` : '/search',
        property_id: propId,
        metadata: {
          source: 'integration-test',
          step: eventName,
        },
      }),
    })

    assert.equal(response.status, 202, `event ${eventName} should return 202`)
  }
})

test('lead fallback endpoint creates pending lead', async (t) => {
  await ensureServer(t)
  if (!healthFlags?.leadFormFallback) {
    t.skip('FEATURE_LEAD_FORM_FALLBACK está desactivado')
    return
  }

  const propId = await getAnyPropertyId()
  if (!propId) {
    t.skip('No hay propiedades para testear leads')
    return
  }

  const response = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      property_id: propId,
      name: 'Lead Integration Test',
      phone: '+59899111222',
      message: 'Quiero más información',
      source: 'property_detail',
      session_id: sessionId(),
      page_path: `/property/${propId}`,
    }),
  })

  assert.equal(response.status, 201)
  const payload = (await response.json()) as { id?: string; status?: string }
  assert.ok(typeof payload.id === 'string' && payload.id.length > 0)
  assert.equal(payload.status, 'pending')
})

test('lead fallback validation rejects malformed payload', async (t) => {
  await ensureServer(t)
  if (!healthFlags?.leadFormFallback) {
    t.skip('FEATURE_LEAD_FORM_FALLBACK está desactivado')
    return
  }

  const response = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      property_id: 0,
      name: '',
      source: 'property_detail',
    }),
  })

  assert.equal(response.status, 400)
})

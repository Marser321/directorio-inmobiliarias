import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

type HealthResponse = {
  flags?: {
    compare?: boolean
    savedSearch?: boolean
    zoneInsights?: boolean
  }
}

let serverReady: boolean | null = null
let flags: HealthResponse['flags'] | null = null

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
    flags = payload.flags || null
    serverReady = true
  } catch {
    serverReady = false
    t.skip(`No hay servidor disponible en ${BASE_URL}`)
  }
}

test('compare endpoint contract by feature flag', async (t) => {
  await ensureServer(t)

  const response = await fetch(`${BASE_URL}/api/compare?ids=1,2`, { cache: 'no-store' })
  if (!flags?.compare) {
    assert.equal(response.status, 503)
    return
  }

  assert.ok([200, 400].includes(response.status))
})

test('saved search endpoint contract by feature flag', async (t) => {
  await ensureServer(t)

  const response = await fetch(`${BASE_URL}/api/alerts/saved-search`, { cache: 'no-store' })
  if (!flags?.savedSearch) {
    assert.equal(response.status, 503)
    return
  }

  assert.equal(response.status, 401)
})

test('zone insights endpoint contract by feature flag', async (t) => {
  await ensureServer(t)

  const response = await fetch(`${BASE_URL}/api/insights/zones`, { cache: 'no-store' })
  if (!flags?.zoneInsights) {
    assert.equal(response.status, 503)
    return
  }

  assert.equal(response.status, 200)
})

import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

type SearchItem = {
  id: number
  price: number
  status: string
  bedrooms: number | null
  bathrooms: number | null
  lat: number | null
  lng: number | null
}

type SearchResponse = {
  data: SearchItem[]
  next_cursor: string | null
  total_estimate: number
  query_ms: number
  ranking_version: string
}

let serverReady: boolean | null = null

async function ensureServer(t: TestContext) {
  if (serverReady === true) return
  if (serverReady === false) {
    t.skip(`No hay servidor disponible en ${BASE_URL}`)
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/health/config`, { cache: 'no-store' })
    serverReady = response.ok
  } catch {
    serverReady = false
  }

  if (!serverReady) {
    t.skip(`No hay servidor disponible en ${BASE_URL}`)
    return
  }
}

async function search(query = ''): Promise<SearchResponse> {
  const url = `${BASE_URL}/api/search/properties${query ? `?${query}` : ''}`
  const response = await fetch(url, { cache: 'no-store' })
  assert.equal(response.status, 200, `Expected 200 for ${url} but got ${response.status}`)
  return (await response.json()) as SearchResponse
}

test('search API returns contract fields', async (t) => {
  await ensureServer(t)

  const payload = await search('limit=5')
  assert.ok(Array.isArray(payload.data))
  assert.equal(typeof payload.total_estimate, 'number')
  assert.equal(typeof payload.query_ms, 'number')
  assert.equal(typeof payload.ranking_version, 'string')
  assert.ok(payload.query_ms >= 0)
})

test('combined filters enforce constraints', async (t) => {
  await ensureServer(t)

  const payload = await search('status=for_sale&price_min=100000&price_max=20000000&bedrooms=1&bathrooms=1&limit=20')
  for (const item of payload.data) {
    assert.equal(item.status, 'for_sale')
    assert.ok(item.price >= 100000)
    assert.ok(item.price <= 20000000)
    assert.ok((item.bedrooms ?? 0) >= 1)
    assert.ok((item.bathrooms ?? 0) >= 1)
  }
})

test('price sorting modes are respected', async (t) => {
  await ensureServer(t)

  const asc = await search('sort=price_asc&limit=20')
  if (asc.data.length < 2) {
    t.skip('No hay suficientes datos para validar sort asc')
    return
  }

  for (let i = 1; i < asc.data.length; i += 1) {
    assert.ok(asc.data[i - 1].price <= asc.data[i].price, 'sort=price_asc fuera de orden')
  }

  const desc = await search('sort=price_desc&limit=20')
  if (desc.data.length < 2) {
    t.skip('No hay suficientes datos para validar sort desc')
    return
  }

  for (let i = 1; i < desc.data.length; i += 1) {
    assert.ok(desc.data[i - 1].price >= desc.data[i].price, 'sort=price_desc fuera de orden')
  }
})

test('cursor pagination returns next page without duplicates', async (t) => {
  await ensureServer(t)

  const first = await search('sort=newest&limit=2')
  if (!first.next_cursor) {
    t.skip('No hay suficientes resultados para validar paginación cursor')
    return
  }

  const second = await search(`sort=newest&limit=2&cursor=${encodeURIComponent(first.next_cursor || '')}`)
  assert.ok(Array.isArray(second.data))

  const firstIds = new Set(first.data.map((item) => item.id))
  const overlap = second.data.some((item) => firstIds.has(item.id))
  assert.equal(overlap, false, 'La segunda página repite resultados de la primera')
})

test('search_as_move filters by real map bounds', async (t) => {
  await ensureServer(t)

  const seed = await search('limit=40')
  const candidate = seed.data.find((item) => typeof item.lat === 'number' && typeof item.lng === 'number')
  if (!candidate || candidate.lat === null || candidate.lng === null) {
    t.skip('No hay propiedades con coordenadas para validar bounds')
    return
  }

  const north = candidate.lat + 0.01
  const south = candidate.lat - 0.01
  const east = candidate.lng + 0.01
  const west = candidate.lng - 0.01

  const payload = await search(
    `search_as_move=true&north=${north}&south=${south}&east=${east}&west=${west}&limit=50`
  )

  for (const item of payload.data) {
    if (item.lat === null || item.lng === null) {
      assert.fail(`La propiedad ${item.id} salió en bounds sin coordenadas`)
    }
    assert.ok(item.lat <= north && item.lat >= south)
    assert.ok(item.lng <= east && item.lng >= west)
  }
})

test('empty results return valid response shape', async (t) => {
  await ensureServer(t)

  const payload = await search(`q=no-result-${Date.now()}-zzz&limit=12`)
  assert.ok(Array.isArray(payload.data))
  assert.equal(payload.data.length, 0)
  assert.equal(payload.next_cursor, null)
  assert.equal(typeof payload.total_estimate, 'number')
})

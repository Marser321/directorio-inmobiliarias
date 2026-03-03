import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePropertyCoordinates } from '../../app/api/partners/properties/_shared'
import type { CompatDatabase } from '../../lib/insforge/compat'

type LocationRow = {
  id?: number
  name?: string | null
  center_lat?: number | null
  center_lng?: number | null
}

function createMockDatabase(locationRow: LocationRow | null): CompatDatabase {
  return {
    from(table: string) {
      assert.equal(table, 'locations')
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async <T = unknown>() => ({
          data: (locationRow || null) as T,
          error: null,
        }),
      }
      return query as never
    },
  }
}

async function withMockedFetch<T>(fetchImpl: typeof fetch, run: () => Promise<T>) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = fetchImpl
  try {
    return await run()
  } finally {
    globalThis.fetch = originalFetch
  }
}

async function withEnv<T>(key: string, value: string | undefined, run: () => Promise<T>) {
  const previous = process.env[key]
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }

  try {
    return await run()
  } finally {
    if (previous === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = previous
    }
  }
}

test('resolvePropertyCoordinates uses manual coordinates first', async () => {
  const calls: string[] = []

  const result = await withMockedFetch(
    (async (input: string | URL | Request) => {
      calls.push(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch,
    async () =>
      resolvePropertyCoordinates(createMockDatabase({ id: 1, name: 'Punta del Este', center_lat: -34.9, center_lng: -54.95 }), {
        locationId: 1,
        address: 'Rambla 123',
        latitude: -34.123456789,
        longitude: -54.987654321,
      })
  )

  assert.deepEqual(result, {
    latitude: -34.1234568,
    longitude: -54.9876543,
    source: 'manual',
  })
  assert.equal(calls.length, 0)
})

test('resolvePropertyCoordinates uses geocoded point before centroid', async () => {
  const calls: string[] = []

  const result = await withEnv('FEATURE_ADDRESS_GEOCODING', 'true', async () =>
    withMockedFetch(
      (async (input: string | URL | Request) => {
        calls.push(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
        return new Response(JSON.stringify([{ lat: '-34.9022', lon: '-54.9505' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }) as typeof fetch,
      async () =>
        resolvePropertyCoordinates(
          createMockDatabase({ id: 2, name: 'La Barra', center_lat: -34.872, center_lng: -54.815 }),
          {
            locationId: 2,
            address: 'Camino del Golf 458',
            latitude: null,
            longitude: null,
          }
        )
    )
  )

  assert.deepEqual(result, {
    latitude: -34.9022,
    longitude: -54.9505,
    source: 'geocoded',
  })
  assert.equal(calls.length, 1)
  const queryValue = calls[0] ? new URL(calls[0]).searchParams.get('q') || '' : ''
  assert.match(queryValue, /Camino del Golf 458/i)
  assert.match(queryValue, /Uruguay/i)
})

test('resolvePropertyCoordinates falls back to centroid when geocoding flag is disabled', async () => {
  const calls: string[] = []

  const result = await withEnv('FEATURE_ADDRESS_GEOCODING', 'false', async () =>
    withMockedFetch(
      (async (input: string | URL | Request) => {
        calls.push(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
        return new Response(JSON.stringify([{ lat: '-34.5', lon: '-54.1' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }) as typeof fetch,
      async () =>
        resolvePropertyCoordinates(
          createMockDatabase({ id: 3, name: 'José Ignacio', center_lat: -34.85, center_lng: -54.68 }),
          {
            locationId: 3,
            address: 'Ruta 10 km 180',
            latitude: null,
            longitude: null,
          }
        )
    )
  )

  assert.deepEqual(result, {
    latitude: -34.85,
    longitude: -54.68,
    source: 'centroid',
  })
  assert.equal(calls.length, 0)
})

test('resolvePropertyCoordinates returns none when no source is available', async () => {
  const result = await resolvePropertyCoordinates(createMockDatabase(null), {
    locationId: null,
    address: null,
    latitude: null,
    longitude: null,
  })

  assert.deepEqual(result, {
    latitude: null,
    longitude: null,
    source: 'none',
  })
})

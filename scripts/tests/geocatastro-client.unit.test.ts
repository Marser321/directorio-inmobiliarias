import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupCadastre } from '../../lib/geocatastro/client'

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('lookupCadastre normalizes ArcGIS feature response', async () => {
  process.env.GEOCATASTRO_ARCGIS_QUERY_URL = 'https://example.test/query'

  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        features: [
          {
            attributes: {
              PADRON: '12345',
              LOCALIDAD: 'Punta del Este',
              AREA_M2: 920.5,
            },
            geometry: {
              x: -54.95,
              y: -34.95,
            },
          },
        ],
      }),
    }) as Response) as typeof fetch

  const result = await lookupCadastre({ padron: '12345' })
  assert.equal(result.providerStatus, 'ok')
  assert.equal(result.cacheHit, false)
  assert.ok(result.data)
  assert.equal(result.data?.padron, '12345')
  assert.equal(result.data?.localidad, 'Punta del Este')
  assert.equal(result.data?.geometry_centroid?.lat, -34.95)
  assert.equal(result.data?.geometry_centroid?.lng, -54.95)
})

test('lookupCadastre returns cache hit for repeated query', async () => {
  process.env.GEOCATASTRO_ARCGIS_QUERY_URL = 'https://example.test/query'
  let calls = 0

  globalThis.fetch = (async () => {
    calls += 1
    return ({
      ok: true,
      json: async () => ({
        features: [
          {
            attributes: {
              PADRON: '6789',
              LOCALIDAD: 'Maldonado',
            },
            geometry: { x: -54.9, y: -34.91 },
          },
        ],
      }),
    }) as Response
  }) as typeof fetch

  const first = await lookupCadastre({ padron: '6789' })
  const second = await lookupCadastre({ padron: '6789' })

  assert.equal(first.providerStatus, 'ok')
  assert.equal(second.providerStatus, 'ok')
  assert.equal(second.cacheHit, true)
  assert.equal(calls, 1)
})

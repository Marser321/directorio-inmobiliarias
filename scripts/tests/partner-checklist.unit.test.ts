import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePropertyQualityChecklist } from '../../app/api/partners/properties/_shared'

function mediaImages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    media_type: 'image' as const,
    url: `https://example.com/image-${index + 1}.jpg`,
    key: null,
    display_order: index,
    is_primary: index === 0,
    metadata: {},
  }))
}

const VALID_DESCRIPTION =
  'Propiedad premium con excelente ubicación, amenities de alto nivel, distribución funcional y terminaciones de lujo para venta inmediata.'

test('checklist passes with complete publish requirements', () => {
  const checklist = evaluatePropertyQualityChecklist(
    {
      title: 'Casa Premium en zona exclusiva',
      price: 850000,
      currency: 'USD',
      status: 'for_sale',
      location_id: 10,
      address: 'Av. Costanera 1234',
      latitude: -34.9033,
      longitude: -54.95,
      description: VALID_DESCRIPTION,
    } as never,
    mediaImages(5)
  )

  assert.equal(checklist.minImages, true)
  assert.equal(checklist.descriptionLength, true)
  assert.equal(checklist.hasLocation, true)
  assert.equal(checklist.hasPriceAndCurrency, true)
  assert.equal(checklist.isComplete, true)
})

test('checklist fails when media count is below minimum', () => {
  const checklist = evaluatePropertyQualityChecklist(
    {
      title: 'Apartamento',
      price: 220000,
      currency: 'USD',
      status: 'for_sale',
      location_id: 4,
      address: 'Calle 10',
      description: VALID_DESCRIPTION,
    } as never,
    mediaImages(2)
  )

  assert.equal(checklist.minImages, false)
  assert.equal(checklist.isComplete, false)
})

test('checklist fails when description or location is incomplete', () => {
  const checklist = evaluatePropertyQualityChecklist(
    {
      title: 'Casa',
      price: 400000,
      currency: 'USD',
      status: 'for_sale',
      location_id: 0,
      address: '',
      description: 'Corta',
    } as never,
    mediaImages(5)
  )

  assert.equal(checklist.descriptionLength, false)
  assert.equal(checklist.hasLocation, false)
  assert.equal(checklist.isComplete, false)
})

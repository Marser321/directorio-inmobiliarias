import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAgencyValueScore } from '../../lib/scoring/agency-value'

function baseAgency() {
  return {
    agency_id: 10,
    is_verified: true,
    avg_response_time: 4,
    tagline: 'Boutique real estate',
    description: 'Especialistas en residencial premium.',
    website: 'https://example.com',
    contact_phone: '+59800000000',
    whatsapp: '+59800000000',
    logo_url: 'https://example.com/logo.png',
    cover_image_url: 'https://example.com/cover.png',
    social_links: {
      instagram: 'https://instagram.com/example',
      facebook: 'https://facebook.com/example',
    },
  }
}

test('buildAgencyValueScore returns weighted score and breakdown', () => {
  const score = buildAgencyValueScore({
    agency: baseAgency(),
    commissionProfile: {
      operation_type: 'sale',
      commission_model: 'percent',
      commission_percent: 3,
      commission_fixed_amount: null,
      currency: 'USD',
      verification_status: 'verified',
      is_public: true,
    },
    propertyId: 100,
    propertyPrice: 350000,
  })

  assert.equal(score.agency_id, 10)
  assert.equal(score.property_id, 100)
  assert.ok(score.value_score >= 0 && score.value_score <= 100)
  assert.ok(score.cost_score >= 0 && score.cost_score <= 100)
  assert.ok(score.transparency_score >= 0 && score.transparency_score <= 100)
  assert.ok(score.operational_score >= 0 && score.operational_score <= 100)
  assert.equal(score.commission_snapshot.verification_status, 'verified')
})

test('cost score is lower with higher commission', () => {
  const lowCommission = buildAgencyValueScore({
    agency: baseAgency(),
    commissionProfile: {
      operation_type: 'sale',
      commission_model: 'percent',
      commission_percent: 2,
      commission_fixed_amount: null,
      currency: 'USD',
      verification_status: 'verified',
      is_public: true,
    },
    propertyPrice: 300000,
  })

  const highCommission = buildAgencyValueScore({
    agency: baseAgency(),
    commissionProfile: {
      operation_type: 'sale',
      commission_model: 'percent',
      commission_percent: 8,
      commission_fixed_amount: null,
      currency: 'USD',
      verification_status: 'verified',
      is_public: true,
    },
    propertyPrice: 300000,
  })

  assert.ok(lowCommission.cost_score > highCommission.cost_score)
  assert.ok(lowCommission.value_score > highCommission.value_score)
})

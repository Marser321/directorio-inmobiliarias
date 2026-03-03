import type {
  AgencyValueScoreDto,
  CommissionModel,
  CommissionOperationType,
  CommissionVerificationStatus,
} from '@/types/domain'

export const AGENCY_VALUE_METHODOLOGY_VERSION = 'value-v1.0'

type AgencySignals = {
  agency_id: number
  is_verified: boolean
  avg_response_time: number | null
  name?: string | null
  tagline?: string | null
  description?: string | null
  website?: string | null
  contact_phone?: string | null
  whatsapp?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
  social_links?: Record<string, unknown> | null
}

type CommissionSignals = {
  operation_type: CommissionOperationType
  commission_model: CommissionModel
  commission_percent: number | null
  commission_fixed_amount: number | null
  currency: string
  verification_status: CommissionVerificationStatus
  is_public: boolean
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function calculateEstimatedPercent(
  commission: CommissionSignals | null,
  propertyPrice: number | null
) {
  if (!commission) return null

  if (commission.commission_model === 'percent' || commission.commission_model === 'mixed') {
    if (typeof commission.commission_percent === 'number' && commission.commission_percent >= 0) {
      return clamp(commission.commission_percent, 0, 100)
    }
  }

  if ((commission.commission_model === 'fixed' || commission.commission_model === 'mixed') && propertyPrice) {
    const fixed = asFiniteNumber(commission.commission_fixed_amount)
    if (fixed !== null && fixed >= 0 && propertyPrice > 0) {
      return clamp((fixed / propertyPrice) * 100, 0, 100)
    }
  }

  return null
}

function calculateCostScore(estimatedPercent: number | null) {
  if (estimatedPercent === null) return 55
  if (estimatedPercent <= 2) return 100
  if (estimatedPercent >= 8) return 35
  const score = 100 - ((estimatedPercent - 2) / (8 - 2)) * 65
  return clamp(score)
}

function calculateTransparencyScore(commission: CommissionSignals | null) {
  if (!commission) return 35

  let score = 45
  if (commission.commission_model) score += 10
  if (commission.commission_percent !== null || commission.commission_fixed_amount !== null) score += 15
  if (commission.is_public) score += 10

  if (commission.verification_status === 'verified') score += 20
  if (commission.verification_status === 'pending') score += 10
  if (commission.verification_status === 'rejected') score -= 15

  return clamp(score)
}

function calculateOperationalScore(agency: AgencySignals) {
  let score = 0

  if (agency.is_verified) score += 30

  const response = asFiniteNumber(agency.avg_response_time)
  if (response !== null) {
    if (response <= 2) score += 35
    else if (response <= 6) score += 25
    else if (response <= 24) score += 15
    else score += 8
  } else {
    score += 12
  }

  const completenessFields = [
    agency.tagline,
    agency.description,
    agency.website,
    agency.contact_phone,
    agency.whatsapp,
    agency.logo_url,
    agency.cover_image_url,
  ]
  const filled = completenessFields.filter(
    (value) => typeof value === 'string' && value.trim().length > 0
  ).length
  const baseCompleteness = completenessFields.length > 0 ? filled / completenessFields.length : 0

  let socialCount = 0
  if (agency.social_links && typeof agency.social_links === 'object') {
    for (const value of Object.values(agency.social_links)) {
      if (typeof value === 'string' && value.trim().length > 0) socialCount += 1
    }
  }
  const socialBoost = Math.min(1, socialCount / 3)
  score += (baseCompleteness * 30) + (socialBoost * 5)

  return clamp(score)
}

export function buildAgencyValueScore(input: {
  agency: AgencySignals
  commissionProfile: CommissionSignals | null
  propertyId?: number | null
  propertyPrice?: number | null
}): AgencyValueScoreDto {
  const estimatedPercent = calculateEstimatedPercent(input.commissionProfile, input.propertyPrice || null)
  const costScore = calculateCostScore(estimatedPercent)
  const transparencyScore = calculateTransparencyScore(input.commissionProfile)
  const operationalScore = calculateOperationalScore(input.agency)

  const valueScore = clamp((costScore * 0.5) + (transparencyScore * 0.3) + (operationalScore * 0.2))

  return {
    agency_id: input.agency.agency_id,
    property_id: input.propertyId || null,
    value_score: Number(valueScore.toFixed(2)),
    cost_score: Number(costScore.toFixed(2)),
    transparency_score: Number(transparencyScore.toFixed(2)),
    operational_score: Number(operationalScore.toFixed(2)),
    commission_snapshot: {
      operation_type: input.commissionProfile?.operation_type || null,
      commission_model: input.commissionProfile?.commission_model || null,
      commission_percent: input.commissionProfile?.commission_percent || null,
      commission_fixed_amount: input.commissionProfile?.commission_fixed_amount || null,
      currency: input.commissionProfile?.currency || null,
      verification_status: input.commissionProfile?.verification_status || null,
      is_public: input.commissionProfile?.is_public === true,
    },
    methodology_version: AGENCY_VALUE_METHODOLOGY_VERSION,
    calculated_at: new Date().toISOString(),
  }
}

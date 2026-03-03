export interface RankablePropertyRow {
  id: number
  is_featured: boolean
  boost_level: number | null
  quality_score: number | null
  lifestyle_tags: string[] | null
  price: number
  created_at: string
}

export interface RankingWeights {
  featured: number
  boost: number
  freshness: number
  quality: number
  lifestyle: number
  priceBand: number
}

function readWeight(envName: string, fallback: number) {
  const raw = process.env[envName]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveWeights(overrides?: Partial<RankingWeights>): RankingWeights {
  return {
    featured: overrides?.featured ?? readWeight('SEARCH_WEIGHT_FEATURED', 2.8),
    boost: overrides?.boost ?? readWeight('SEARCH_WEIGHT_BOOST', 2.2),
    freshness: overrides?.freshness ?? readWeight('SEARCH_WEIGHT_FRESHNESS', 1.4),
    quality: overrides?.quality ?? readWeight('SEARCH_WEIGHT_QUALITY', 1.0),
    lifestyle: overrides?.lifestyle ?? readWeight('SEARCH_WEIGHT_LIFESTYLE', 1.8),
    priceBand: overrides?.priceBand ?? readWeight('SEARCH_WEIGHT_PRICE_BAND', 0.8),
  }
}

export function rankRows<T extends RankablePropertyRow>(
  rows: T[],
  lifestyles: string[],
  minPrice?: number | null,
  maxPrice?: number | null,
  overrides?: Partial<RankingWeights>
) {
  const weights = resolveWeights(overrides)
  const hasPriceBand = typeof minPrice === 'number' || typeof maxPrice === 'number'
  const safeMin = typeof minPrice === 'number' ? minPrice : 0
  const safeMax = typeof maxPrice === 'number' ? maxPrice : safeMin > 0 ? safeMin * 2 : 0
  const priceCenter = safeMax > safeMin ? safeMin + (safeMax - safeMin) / 2 : safeMin
  const priceSpan = safeMax > safeMin ? safeMax - safeMin : 1

  return rows
    .map((row) => {
      const createdAtMs = new Date(row.created_at).getTime()
      const ageDays = Number.isFinite(createdAtMs)
        ? Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60 * 24))
        : 365

      const freshnessScore = Math.max(0, 1 - ageDays / 120)
      const qualityScore = Math.max(0, Math.min(1, (row.quality_score ?? 0) / 100))
      const boostScore = Math.max(0, Math.min(1, (row.boost_level ?? 0) / 3))

      let lifestyleScore = 0
      if (lifestyles.length > 0) {
        const currentTags = Array.isArray(row.lifestyle_tags) ? row.lifestyle_tags : []
        const matches = lifestyles.filter((entry) => currentTags.includes(entry)).length
        lifestyleScore = matches / lifestyles.length
      }

      let priceBandScore = 0
      if (hasPriceBand && priceCenter > 0 && Number.isFinite(row.price)) {
        const distance = Math.abs(row.price - priceCenter)
        priceBandScore = Math.max(0, 1 - distance / Math.max(priceSpan, 1))
      }

      const score =
        (row.is_featured ? 1 : 0) * weights.featured +
        boostScore * weights.boost +
        freshnessScore * weights.freshness +
        qualityScore * weights.quality +
        lifestyleScore * weights.lifestyle +
        priceBandScore * weights.priceBand

      return { row, score }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.row.id - a.row.id
    })
}

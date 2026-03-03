import assert from 'node:assert/strict'
import test from 'node:test'
import { rankRows, type RankablePropertyRow } from '../../lib/search/ranking'

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function baseProperty(overrides: Partial<RankablePropertyRow> = {}): RankablePropertyRow {
  return {
    id: 1,
    is_featured: false,
    boost_level: 0,
    quality_score: 70,
    lifestyle_tags: [],
    price: 500000,
    created_at: daysAgo(7),
    ...overrides,
  }
}

const WEIGHTS = {
  featured: 3,
  boost: 2,
  freshness: 1,
  quality: 1,
  lifestyle: 2,
  priceBand: 1,
}

test('featured outranks non-featured when other factors are equal', () => {
  const featured = baseProperty({ id: 1, is_featured: true })
  const regular = baseProperty({ id: 2, is_featured: false })

  const ranked = rankRows([regular, featured], [], null, null, WEIGHTS)

  assert.equal(ranked[0].row.id, 1)
  assert.ok(ranked[0].score > ranked[1].score)
})

test('tie score is stable and resolves by id descending', () => {
  const a = baseProperty({ id: 100 })
  const b = baseProperty({ id: 200 })

  const ranked = rankRows([a, b], [], null, null, WEIGHTS)
  assert.equal(ranked[0].row.id, 200)
  assert.equal(ranked[1].row.id, 100)
})

test('lifestyle match boosts score when filters are present', () => {
  const noMatch = baseProperty({ id: 1, lifestyle_tags: ['urban'] })
  const match = baseProperty({ id: 2, lifestyle_tags: ['golf', 'urban'] })

  const ranked = rankRows([noMatch, match], ['golf'], null, null, WEIGHTS)
  assert.equal(ranked[0].row.id, 2)
  assert.ok(ranked[0].score > ranked[1].score)
})

test('price band match influences ranking inside a target range', () => {
  const nearCenter = baseProperty({ id: 1, price: 480000 })
  const farFromCenter = baseProperty({ id: 2, price: 1100000 })

  const ranked = rankRows([farFromCenter, nearCenter], [], 400000, 600000, WEIGHTS)
  assert.equal(ranked[0].row.id, 1)
  assert.ok(ranked[0].score > ranked[1].score)
})

test('ranking is deterministic for repeated executions', () => {
  const rows = [
    baseProperty({ id: 1, is_featured: true, quality_score: 80, lifestyle_tags: ['golf'] }),
    baseProperty({ id: 2, boost_level: 3, quality_score: 90, lifestyle_tags: ['beachfront'] }),
    baseProperty({ id: 3, boost_level: 1, quality_score: 60, lifestyle_tags: ['golf', 'beachfront'] }),
  ]

  const first = rankRows(rows, ['golf'], 300000, 900000, WEIGHTS)
  const second = rankRows(rows, ['golf'], 300000, 900000, WEIGHTS)

  assert.deepEqual(
    first.map((entry) => ({ id: entry.row.id, score: Number(entry.score.toFixed(6)) })),
    second.map((entry) => ({ id: entry.row.id, score: Number(entry.score.toFixed(6)) }))
  )
})

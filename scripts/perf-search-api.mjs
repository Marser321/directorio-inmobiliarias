#!/usr/bin/env node

const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:3000'
const REQUESTS = Number(process.env.PERF_REQUESTS || '80')
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY || '8')
const P95_THRESHOLD_MS = Number(process.env.PERF_THRESHOLD_P95_MS || '350')
const MAX_ERROR_RATE = Number(process.env.PERF_MAX_ERROR_RATE || '0.01')
const QUERY = process.env.PERF_QUERY || 'status=for_sale&limit=24&sort=relevance'

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0
  const index = Math.ceil((p / 100) * sortedValues.length) - 1
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))]
}

async function checkHealth() {
  const response = await fetch(`${BASE_URL}/api/health/config`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }
}

async function runLoad() {
  const durations = []
  let failed = 0
  let cursor = 0

  async function worker() {
    for (;;) {
      const current = cursor
      cursor += 1
      if (current >= REQUESTS) return

      const startedAt = performance.now()
      try {
        const response = await fetch(`${BASE_URL}/api/search/properties?${QUERY}`, {
          cache: 'no-store',
        })
        const endedAt = performance.now()
        durations.push(endedAt - startedAt)
        if (!response.ok) failed += 1
      } catch {
        const endedAt = performance.now()
        durations.push(endedAt - startedAt)
        failed += 1
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker())
  await Promise.all(workers)
  return { durations, failed }
}

async function main() {
  await checkHealth()

  // Warmup
  for (let i = 0; i < 5; i += 1) {
    await fetch(`${BASE_URL}/api/search/properties?${QUERY}`, { cache: 'no-store' })
  }

  const started = performance.now()
  const { durations, failed } = await runLoad()
  const elapsed = performance.now() - started
  const sorted = durations.slice().sort((a, b) => a - b)

  const summary = {
    baseUrl: BASE_URL,
    requests: REQUESTS,
    concurrency: CONCURRENCY,
    elapsed_ms: Number(elapsed.toFixed(2)),
    rps: Number((REQUESTS / Math.max(elapsed / 1000, 0.001)).toFixed(2)),
    latency_ms: {
      min: Number((sorted[0] || 0).toFixed(2)),
      p50: Number(percentile(sorted, 50).toFixed(2)),
      p95: Number(percentile(sorted, 95).toFixed(2)),
      p99: Number(percentile(sorted, 99).toFixed(2)),
      max: Number((sorted[sorted.length - 1] || 0).toFixed(2)),
    },
    failed_requests: failed,
    error_rate: Number((failed / Math.max(REQUESTS, 1)).toFixed(4)),
    thresholds: {
      p95_ms: P95_THRESHOLD_MS,
      max_error_rate: MAX_ERROR_RATE,
    },
  }

  console.log(JSON.stringify(summary, null, 2))

  if (summary.latency_ms.p95 > P95_THRESHOLD_MS || summary.error_rate > MAX_ERROR_RATE) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Performance test failed:', error.message)
  process.exit(1)
})

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BASE_URL = 'https://directorio-inmobiliarias-deploy-177.vercel.app'
const DEFAULT_INTERVAL_SECONDS = 300
const DEFAULT_ITERATIONS = 576 // 48h at 5-minute interval

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  return process.argv[idx + 1] ?? fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function nowIso() {
  return new Date().toISOString()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function trimBody(value, max = 600) {
  if (typeof value !== 'string') return ''
  return value.length > max ? `${value.slice(0, max)}...` : value
}

function createChecks() {
  return [
    {
      id: 'health_config',
      method: 'GET',
      path: '/api/health/config',
      expectedStatuses: [200],
      severity: 'critical',
      validateBody: (bodyText) => {
        let parsed
        try {
          parsed = JSON.parse(bodyText)
        } catch {
          return { ok: false, reason: 'health_config_invalid_json' }
        }

        const malformedCount = Number(parsed?.envDiagnostics?.malformedCount ?? 0)
        const authEnabled = parsed?.flags?.auth === true
        const appUrl = String(parsed?.runtime?.appUrl ?? '')

        if (!authEnabled) return { ok: false, reason: 'health_auth_flag_false' }
        if (malformedCount !== 0) return { ok: false, reason: `health_malformed_env_${malformedCount}` }
        if (appUrl.includes('\n') || appUrl.includes('\r')) {
          return { ok: false, reason: 'health_app_url_contains_newline' }
        }

        return { ok: true, reason: 'ok' }
      },
    },
    {
      id: 'auth_signup_empty',
      method: 'POST',
      path: '/api/auth/signup',
      body: {},
      expectedStatuses: [400],
      severity: 'critical',
      validateBody: (bodyText) => {
        if (bodyText.includes('Auth feature is disabled')) {
          return { ok: false, reason: 'auth_feature_disabled' }
        }
        return { ok: true, reason: 'ok' }
      },
    },
    {
      id: 'auth_signin_empty',
      method: 'POST',
      path: '/api/auth/signin',
      body: {},
      expectedStatuses: [400],
      severity: 'critical',
    },
    {
      id: 'partners_onboarding_unauth',
      method: 'POST',
      path: '/api/partners/onboarding',
      body: {},
      expectedStatuses: [401, 400],
      severity: 'critical',
    },
    {
      id: 'compare_contract',
      method: 'GET',
      path: '/api/compare',
      expectedStatuses: [400, 200],
      severity: 'critical',
      validateBody: (bodyText) => {
        if (bodyText.includes('Compare feature is disabled')) {
          return { ok: false, reason: 'compare_feature_disabled' }
        }
        return { ok: true, reason: 'ok' }
      },
    },
    {
      id: 'insights_contract',
      method: 'GET',
      path: '/api/insights/zones',
      expectedStatuses: [200],
      severity: 'critical',
      validateBody: (bodyText) => {
        if (bodyText.includes('Zone insights feature is disabled')) {
          return { ok: false, reason: 'zone_insights_feature_disabled' }
        }
        return { ok: true, reason: 'ok' }
      },
    },
    {
      id: 'geo_cadastre_lookup',
      method: 'GET',
      path: '/api/geo/cadastre/lookup?city=Maldonado&address=Gorlero%201313',
      expectedStatuses: [200],
      degradedStatuses: [503],
      severity: 'warning',
      validateBody: (bodyText, status) => {
        if (status === 503) {
          if (bodyText.includes('provider_error')) {
            return { ok: true, reason: 'provider_error_degraded' }
          }
          return { ok: false, reason: 'geo_503_without_provider_error' }
        }
        if (bodyText.includes('Geocatastro lookup feature is disabled')) {
          return { ok: false, reason: 'geocatastro_feature_disabled' }
        }
        return { ok: true, reason: 'ok' }
      },
    },
  ]
}

async function runCheck(baseUrl, check) {
  const url = `${baseUrl}${check.path}`
  const startedAt = Date.now()

  const init = {
    method: check.method,
    headers: {},
    cache: 'no-store',
  }

  if (check.body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(check.body)
  }

  try {
    const response = await fetch(url, init)
    const latencyMs = Date.now() - startedAt
    const bodyText = await response.text()

    const expected = check.expectedStatuses.includes(response.status)
    const degraded = Array.isArray(check.degradedStatuses)
      ? check.degradedStatuses.includes(response.status)
      : false

    let bodyValidation = { ok: true, reason: 'ok' }
    if (typeof check.validateBody === 'function') {
      bodyValidation = check.validateBody(bodyText, response.status)
    }

    const ok = (expected || degraded) && bodyValidation.ok

    return {
      id: check.id,
      method: check.method,
      path: check.path,
      url,
      status: response.status,
      latencyMs,
      severity: check.severity,
      ok,
      degraded,
      reason: ok ? bodyValidation.reason : bodyValidation.reason || 'unexpected_status',
      responseBody: trimBody(bodyText),
    }
  } catch (error) {
    return {
      id: check.id,
      method: check.method,
      path: check.path,
      url,
      status: 'ERR',
      latencyMs: Date.now() - startedAt,
      severity: check.severity,
      ok: false,
      degraded: false,
      reason: `request_error:${error instanceof Error ? error.message : String(error)}`,
      responseBody: '',
    }
  }
}

function buildSummary(baseUrl, intervalSeconds, iterations, runs) {
  const byCheck = {}
  let criticalFailures = 0
  let warnings = 0

  for (const run of runs) {
    for (const result of run.results) {
      const key = result.id
      if (!byCheck[key]) {
        byCheck[key] = {
          total: 0,
          ok: 0,
          failed: 0,
          degraded: 0,
          statuses: {},
          p95LatencyMs: 0,
          latencies: [],
          reasons: {},
          severity: result.severity,
        }
      }

      const bucket = byCheck[key]
      bucket.total += 1
      if (result.ok) bucket.ok += 1
      else bucket.failed += 1
      if (result.degraded) bucket.degraded += 1

      const statusKey = String(result.status)
      bucket.statuses[statusKey] = (bucket.statuses[statusKey] || 0) + 1
      if (typeof result.latencyMs === 'number') bucket.latencies.push(result.latencyMs)
      if (result.reason) bucket.reasons[result.reason] = (bucket.reasons[result.reason] || 0) + 1

      if (!result.ok && result.severity === 'critical') criticalFailures += 1
      if (!result.ok && result.severity === 'warning') warnings += 1
    }
  }

  for (const value of Object.values(byCheck)) {
    const sorted = value.latencies.slice().sort((a, b) => a - b)
    if (sorted.length > 0) {
      const p95Index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1))
      value.p95LatencyMs = sorted[p95Index]
    }
    delete value.latencies
  }

  return {
    startedAtUtc: runs[0]?.timestampUtc || nowIso(),
    endedAtUtc: runs[runs.length - 1]?.timestampUtc || nowIso(),
    baseUrl,
    intervalSeconds,
    iterations,
    totalChecks: runs.reduce((acc, run) => acc + run.results.length, 0),
    criticalFailures,
    warnings,
    ok: criticalFailures === 0,
    byCheck,
  }
}

function toMarkdown(summary, reportFilePath) {
  const lines = []
  lines.push('# Soak Critical Endpoints Report')
  lines.push('')
  lines.push(`- started_at_utc: \`${summary.startedAtUtc}\``)
  lines.push(`- ended_at_utc: \`${summary.endedAtUtc}\``)
  lines.push(`- base_url: \`${summary.baseUrl}\``)
  lines.push(`- interval_seconds: \`${summary.intervalSeconds}\``)
  lines.push(`- iterations: \`${summary.iterations}\``)
  lines.push(`- total_checks: \`${summary.totalChecks}\``)
  lines.push(`- critical_failures: \`${summary.criticalFailures}\``)
  lines.push(`- warnings: \`${summary.warnings}\``)
  lines.push(`- status: \`${summary.ok ? 'ok' : 'fail'}\``)
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  lines.push('| check_id | severity | ok | failed | degraded | p95_latency_ms | statuses | top_reasons |')
  lines.push('|---|---:|---:|---:|---:|---:|---|---|')

  for (const [checkId, stats] of Object.entries(summary.byCheck)) {
    const statusLabel = Object.entries(stats.statuses)
      .map(([status, count]) => `${status}:${count}`)
      .join(', ')

    const topReasons = Object.entries(stats.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => `${reason}:${count}`)
      .join(', ')

    lines.push(
      `| ${checkId} | ${stats.severity} | ${stats.ok} | ${stats.failed} | ${stats.degraded} | ${stats.p95LatencyMs} | ${statusLabel || '-'} | ${topReasons || '-'} |`
    )
  }

  lines.push('')
  lines.push(`- report_json: \`${reportFilePath}\``)

  return `${lines.join('\n')}\n`
}

async function main() {
  const baseUrl = String(getArg('--base-url', process.env.SOAK_BASE_URL || DEFAULT_BASE_URL)).replace(/\/$/, '')
  const intervalSeconds = toInt(getArg('--interval-seconds', process.env.SOAK_INTERVAL_SECONDS), DEFAULT_INTERVAL_SECONDS)
  const iterations = toInt(getArg('--iterations', process.env.SOAK_ITERATIONS), DEFAULT_ITERATIONS)
  const outputDir = path.resolve(getArg('--output-dir', '.migration-evidence'))
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace(/-/g, '')
  const reportFile = path.resolve(getArg('--report', path.join(outputDir, `soak_critical_endpoints_${timestamp}.json`)))
  const markdownFile = path.resolve(getArg('--markdown', path.join(outputDir, `soak_critical_endpoints_${timestamp}.md`)))
  const failOnWarning = hasArg('--fail-on-warning')

  fs.mkdirSync(path.dirname(reportFile), { recursive: true })
  fs.mkdirSync(path.dirname(markdownFile), { recursive: true })

  const checks = createChecks()
  const runs = []

  console.log(`[soak] base_url=${baseUrl}`)
  console.log(`[soak] interval_seconds=${intervalSeconds}`)
  console.log(`[soak] iterations=${iterations}`)

  for (let i = 0; i < iterations; i += 1) {
    const iterationNumber = i + 1
    const timestampUtc = nowIso()

    console.log(`[soak] iteration ${iterationNumber}/${iterations} at ${timestampUtc}`)

    const results = []
    for (const check of checks) {
      const result = await runCheck(baseUrl, check)
      results.push(result)

      const state = result.ok ? 'OK' : result.degraded ? 'DEGRADED' : 'FAIL'
      console.log(
        `[soak] ${state} ${result.id} status=${result.status} latency_ms=${result.latencyMs} reason=${result.reason}`
      )
    }

    runs.push({ iteration: iterationNumber, timestampUtc, results })

    if (iterationNumber < iterations) {
      await sleep(intervalSeconds * 1000)
    }
  }

  const summary = buildSummary(baseUrl, intervalSeconds, iterations, runs)
  const report = {
    summary,
    runs,
  }

  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`)
  fs.writeFileSync(markdownFile, toMarkdown(summary, reportFile))

  console.log(`[soak] report_json=${reportFile}`)
  console.log(`[soak] report_md=${markdownFile}`)
  console.log(`[soak] critical_failures=${summary.criticalFailures} warnings=${summary.warnings} ok=${summary.ok}`)

  if (!summary.ok) {
    process.exit(1)
  }

  if (failOnWarning && summary.warnings > 0) {
    process.exit(2)
  }
}

main().catch((error) => {
  console.error(`[soak] unhandled_error=${error instanceof Error ? error.stack || error.message : String(error)}`)
  process.exit(1)
})

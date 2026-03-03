#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { parse as parseDotenv } from 'dotenv'

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

const IGNORED_KEY_PREFIXES = ['VERCEL_', 'TURBO_', 'NX_', 'CI', 'NODE_ENV']

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  return process.argv[idx + 1] ?? fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

function inspectValue(raw) {
  if (typeof raw !== 'string') {
    return { normalized: undefined, issues: ['missing'] }
  }

  const issues = []
  let value = raw

  if (value !== value.trim()) {
    issues.push('outer_whitespace')
    value = value.trim()
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    issues.push('wrapped_quotes')
    value = value.slice(1, -1)
  }

  if (/\\r\\n|\\n|\\r/.test(value)) {
    issues.push('escaped_newline')
    value = value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\r')
  }

  if (/[\r\n]/.test(value)) {
    issues.push('control_newline')
    value = value.replace(/[\r\n]/g, '').trim()
  }

  if (!value) {
    issues.push('empty_after_normalize')
    return { normalized: undefined, issues }
  }

  return { normalized: value, issues }
}

function isValidBoolean(raw) {
  const lowered = String(raw).toLowerCase()
  return TRUE_VALUES.has(lowered) || FALSE_VALUES.has(lowered)
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function shouldIgnoreKey(key) {
  return IGNORED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function runVercel(args, cwd) {
  return spawnSync('npx', ['vercel', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: process.env,
  })
}

function printUsageAndExit() {
  console.error(
    [
      'Usage: node scripts/vercel/sync-env.mjs --source <env-file> [--cwd <project-dir>] [--target production|preview|development] [--git-branch <branch>] [--dry-run] [--report <path>] [--only key1,key2] [--include-ignored]',
      '',
      'Examples:',
      '  node scripts/vercel/sync-env.mjs --source env/profiles/staging.env.runtime --cwd . --target production',
      '  node scripts/vercel/sync-env.mjs --source .migration-evidence/env_snapshots/prod_raw_pull.env --dry-run --include-ignored',
    ].join('\n')
  )
  process.exit(1)
}

function main() {
  const source = getArg('--source')
  const projectCwd = path.resolve(getArg('--cwd', process.cwd()))
  const target = getArg('--target', 'production')
  const gitBranch = getArg('--git-branch')
  const onlyRaw = getArg('--only')
  const reportPathArg = getArg('--report')
  const dryRun = hasArg('--dry-run')
  const includeIgnored = hasArg('--include-ignored')

  if (!source) {
    printUsageAndExit()
  }

  if (!['production', 'preview', 'development'].includes(target)) {
    throw new Error(`Invalid --target value: ${target}`)
  }

  const sourcePath = path.resolve(source)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Env source file not found: ${sourcePath}`)
  }

  if (!fs.existsSync(projectCwd)) {
    throw new Error(`Project cwd not found: ${projectCwd}`)
  }

  const parsed = parseDotenv(fs.readFileSync(sourcePath, 'utf8'))
  const onlySet = new Set(
    String(onlyRaw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )

  const normalizedEntries = []
  const skipped = []
  const validationErrors = []

  for (const [key, raw] of Object.entries(parsed)) {
    if (onlySet.size > 0 && !onlySet.has(key)) {
      skipped.push({ key, reason: 'not_in_only_filter' })
      continue
    }

    if (!includeIgnored && shouldIgnoreKey(key)) {
      skipped.push({ key, reason: 'ignored_prefix' })
      continue
    }

    const inspection = inspectValue(raw)
    if (!inspection.normalized) {
      validationErrors.push({ key, issues: inspection.issues })
      continue
    }

    if (key.startsWith('FEATURE_') && !isValidBoolean(inspection.normalized)) {
      validationErrors.push({ key, issues: inspection.issues.concat('invalid_boolean') })
      continue
    }

    normalizedEntries.push({
      key,
      value: inspection.normalized,
      issues: inspection.issues,
      valueHash: hashValue(inspection.normalized),
      valueLength: inspection.normalized.length,
    })
  }

  if (normalizedEntries.length === 0) {
    throw new Error('No environment variables selected for sync')
  }

  if (validationErrors.length > 0) {
    const report = {
      ok: false,
      sourcePath,
      projectCwd,
      target,
      gitBranch,
      dryRun,
      totalInputKeys: Object.keys(parsed).length,
      selectedKeys: normalizedEntries.length,
      skipped,
      validationErrors,
      synced: [],
      timestampUtc: new Date().toISOString(),
    }

    if (reportPathArg) {
      const reportPath = path.resolve(reportPathArg)
      fs.mkdirSync(path.dirname(reportPath), { recursive: true })
      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
      console.error(`Report written to ${reportPath}`)
    }

    console.error(JSON.stringify(report, null, 2))
    process.exit(1)
  }

  const whoami = runVercel(['whoami', '--cwd', projectCwd], projectCwd)
  if (whoami.status !== 0) {
    throw new Error(`Vercel auth check failed: ${whoami.stderr || whoami.stdout}`)
  }

  const synced = []

  for (const entry of normalizedEntries) {
    const args = ['env', 'add', entry.key, target]
    if (target === 'preview' && gitBranch) {
      args.push(gitBranch)
    }
    args.push('--value', entry.value, '--force', '--yes', '--cwd', projectCwd)

    if (dryRun) {
      synced.push({
        key: entry.key,
        status: 'dry_run',
        issues: entry.issues,
        valueHash: entry.valueHash,
        valueLength: entry.valueLength,
      })
      continue
    }

    const result = runVercel(args, projectCwd)
    const ok = result.status === 0

    synced.push({
      key: entry.key,
      status: ok ? 'synced' : 'failed',
      exitCode: result.status,
      issues: entry.issues,
      valueHash: entry.valueHash,
      valueLength: entry.valueLength,
      stderr: ok ? undefined : (result.stderr || '').slice(0, 5000),
      stdout: ok ? undefined : (result.stdout || '').slice(0, 5000),
    })

    if (!ok) {
      const report = {
        ok: false,
        sourcePath,
        projectCwd,
        target,
        gitBranch,
        dryRun,
        totalInputKeys: Object.keys(parsed).length,
        selectedKeys: normalizedEntries.length,
        skipped,
        validationErrors: [],
        synced,
        timestampUtc: new Date().toISOString(),
      }

      if (reportPathArg) {
        const reportPath = path.resolve(reportPathArg)
        fs.mkdirSync(path.dirname(reportPath), { recursive: true })
        fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
      }

      console.error(JSON.stringify(report, null, 2))
      process.exit(1)
    }
  }

  const report = {
    ok: true,
    sourcePath,
    projectCwd,
    target,
    gitBranch,
    dryRun,
    totalInputKeys: Object.keys(parsed).length,
    selectedKeys: normalizedEntries.length,
    skipped,
    validationErrors: [],
    synced,
    timestampUtc: new Date().toISOString(),
  }

  if (reportPathArg) {
    const reportPath = path.resolve(reportPathArg)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }

  console.log(JSON.stringify(report, null, 2))
}

main()

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { parse as parseDotenv } from 'dotenv'

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  return process.argv[idx + 1] ?? fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

const IGNORED_KEY_PREFIXES = ['VERCEL_', 'TURBO_', 'NX_', 'CI', 'NODE_ENV']

function shouldIgnoreKey(key) {
  return IGNORED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function inspectValue(raw) {
  if (typeof raw !== 'string') return { normalized: undefined, issues: [] }

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

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

function validateBoolean(raw) {
  const inspected = inspectValue(raw)
  if (!inspected.normalized) return { valid: false, issues: inspected.issues }

  const lowered = inspected.normalized.toLowerCase()
  if (TRUE_VALUES.has(lowered) || FALSE_VALUES.has(lowered)) {
    return { valid: true, issues: inspected.issues }
  }

  return {
    valid: false,
    issues: inspected.issues.concat('invalid_boolean'),
  }
}

function main() {
  const file = getArg('--file')
  const failOnIssue = hasArg('--fail-on-issue')
  const includeIgnored = hasArg('--include-ignored')

  if (!file) {
    throw new Error('Usage: node scripts/vercel/validate-env-file.mjs --file <path> [--fail-on-issue]')
  }

  const filePath = path.resolve(file)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`)
  }

  const parsed = parseDotenv(fs.readFileSync(filePath, 'utf8'))
  const issues = []

  for (const [key, value] of Object.entries(parsed)) {
    if (!includeIgnored && shouldIgnoreKey(key)) {
      continue
    }

    const inspected = inspectValue(value)
    if (inspected.issues.length > 0) {
      issues.push({ key, issues: inspected.issues })
    }

    if (key.startsWith('FEATURE_')) {
      const boolResult = validateBoolean(value)
      if (!boolResult.valid) {
        issues.push({ key, issues: boolResult.issues })
      }
    }
  }

  const output = {
    file: filePath,
    checkedKeys: Object.keys(parsed).length,
    issuesCount: issues.length,
    issues,
    ok: issues.length === 0,
  }

  console.log(JSON.stringify(output, null, 2))

  if (failOnIssue && issues.length > 0) {
    process.exit(1)
  }
}

main()

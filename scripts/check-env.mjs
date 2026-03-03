#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const args = new Set(process.argv.slice(2))
const contextIndex = process.argv.indexOf('--context')
const context =
  contextIndex >= 0 && process.argv[contextIndex + 1]
    ? process.argv[contextIndex + 1]
    : 'default'

const requirePublic = args.has('--require-public')
const warnServer = args.has('--warn-server')
const requireServer = args.has('--require-server')

const root = process.cwd()
const envCandidates = ['.env.local', '.env']

for (const file of envCandidates) {
  const filePath = path.join(root, file)
  if (fs.existsSync(filePath)) {
    loadEnv({ path: filePath, override: false })
  }
}

const requiredPublicVars = ['NEXT_PUBLIC_INSFORGE_BASE_URL', 'NEXT_PUBLIC_INSFORGE_ANON_KEY']
const serverRoleCandidates = [
  'INSFORGE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INSFORGE_ADMIN_API_KEY',
]
const privilegedOptionalVars = ['STRIPE_WEBHOOK_SECRET']
const whatsappAlertRequiredVars = [
  'ALERTS_CRON_SECRET',
  'META_WA_TOKEN',
  'META_WA_PHONE_NUMBER_ID',
]

const auditedFormattingVars = [
  'FEATURE_INSFORGE_AUTH',
  'FEATURE_INSFORGE_PROPERTIES',
  'FEATURE_INSFORGE_SCRAPER',
  'FEATURE_INSFORGE_MARKETING',
  'FEATURE_INSFORGE_MANAGER',
  'FEATURE_ADMIN_IMPERSONATION',
  'FEATURE_SKIP_EMAIL_VERIFICATION',
  'FEATURE_COMPARE',
  'FEATURE_FAVORITES_SYNC',
  'FEATURE_SAVED_SEARCH',
  'FEATURE_WHATSAPP_ALERTS',
  'FEATURE_ZONE_INSIGHTS',
  'FEATURE_THEME_LAB_EDITORIAL',
  'FEATURE_GEOCATASTRO_LOOKUP',
  'FEATURE_LEGAL_COMMISSION_GUIDE',
  'FEATURE_AGENCY_VALUE_SCORE',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_INSFORGE_BASE_URL',
  'NEXT_PUBLIC_INSFORGE_ANON_KEY',
]

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

function inspectEnvValue(raw) {
  if (typeof raw !== 'string') {
    return { normalized: undefined, issues: [] }
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

function normalizeEnv(raw) {
  return inspectEnvValue(raw).normalized
}

function missingVars(keys) {
  return keys.filter((key) => !normalizeEnv(process.env[key]))
}

function hasAny(keys) {
  return keys.some((key) => Boolean(normalizeEnv(process.env[key])))
}

function parseBool(raw, fallback = false) {
  const normalized = normalizeEnv(raw)
  if (!normalized) return fallback
  const lowered = normalized.toLowerCase()
  if (TRUE_VALUES.has(lowered)) return true
  if (FALSE_VALUES.has(lowered)) return false
  return fallback
}

function print(title, values) {
  if (values.length === 0) return
  console.log(`${title}:`)
  for (const value of values) {
    console.log(`- ${value}`)
  }
}

let failed = false
const warnings = []

if (requirePublic) {
  const missingPublic = missingVars(requiredPublicVars)
  if (missingPublic.length > 0) {
    failed = true
    console.error(`[check-env] Missing required public variables for context "${context}"`)
    print('Required', missingPublic)
  }
}

if (!hasAny(serverRoleCandidates)) {
  const message =
    'No privileged DB key found (INSFORGE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY / INSFORGE_ADMIN_API_KEY).'
  if (requireServer) {
    failed = true
    console.error(`[check-env] ${message}`)
  } else if (warnServer) {
    warnings.push(message)
  }
}

const missingPrivilegedOptional = missingVars(privilegedOptionalVars)
if (missingPrivilegedOptional.length > 0 && warnServer) {
  warnings.push(`Missing optional privileged variables: ${missingPrivilegedOptional.join(', ')}`)
}

const malformedVars = []
for (const key of auditedFormattingVars) {
  const inspection = inspectEnvValue(process.env[key])
  if (inspection.issues.length > 0) {
    malformedVars.push(`${key} (${inspection.issues.join(', ')})`)
  }
}
if (malformedVars.length > 0) {
  warnings.push(`Detected malformed env values: ${malformedVars.join('; ')}`)
}

const invalidBoolVars = []
for (const key of auditedFormattingVars.filter((item) => item.startsWith('FEATURE_'))) {
  const normalized = normalizeEnv(process.env[key])
  if (!normalized) continue
  const lowered = normalized.toLowerCase()
  if (!TRUE_VALUES.has(lowered) && !FALSE_VALUES.has(lowered)) {
    invalidBoolVars.push(`${key}=${normalized}`)
  }
}
if (invalidBoolVars.length > 0) {
  warnings.push(`Invalid boolean env values (fallback will apply): ${invalidBoolVars.join(', ')}`)
}

const whatsappAlertsEnabled = parseBool(process.env.FEATURE_WHATSAPP_ALERTS, false)
if (whatsappAlertsEnabled) {
  const missingWhatsappVars = missingVars(whatsappAlertRequiredVars)
  if (missingWhatsappVars.length > 0) {
    const message = `FEATURE_WHATSAPP_ALERTS=true requires: ${missingWhatsappVars.join(', ')}`
    if (requireServer) {
      failed = true
      console.error(`[check-env] ${message}`)
    } else if (warnServer) {
      warnings.push(message)
    }
  }
}

if (warnings.length > 0) {
  console.warn(`[check-env] Warnings for context "${context}"`)
  print('Warnings', warnings)
}

if (!failed) {
  console.log(`[check-env] OK (${context})`)
}

process.exit(failed ? 1 : 0)

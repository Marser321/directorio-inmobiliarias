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

function missingVars(keys) {
  return keys.filter((key) => !process.env[key] || process.env[key].trim().length === 0)
}

function hasAny(keys) {
  return keys.some((key) => process.env[key] && process.env[key].trim().length > 0)
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

const whatsappAlertsEnabled = (process.env.FEATURE_WHATSAPP_ALERTS || '').toLowerCase() === 'true'
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

import { NextResponse } from 'next/server'
import { normalizeEnvValue, parseBooleanEnv, inspectEnvValue, type EnvIssueCode } from '@/lib/env/normalize'

type ConfigFlags = {
  auth: boolean
  properties: boolean
  scraper: boolean
  marketing: boolean
  manager: boolean
  adminImpersonation: boolean
  skipEmailVerification: boolean
  searchApiV2: boolean
  funnelEvents: boolean
  partnerDraftFlow: boolean
  leadFormFallback: boolean
  addressGeocoding: boolean
  compare: boolean
  favoritesSync: boolean
  savedSearch: boolean
  whatsappAlerts: boolean
  zoneInsights: boolean
  themeLabEditorial: boolean
  geocatastroLookup: boolean
  legalCommissionGuide: boolean
  agencyValueScore: boolean
}

type EnvDiagnosticItem = {
  key: string
  issues: EnvIssueCode[]
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && normalizeEnvValue(value) !== undefined
}

function getMissingPublicEnv() {
  const missing: string[] = []

  if (!hasText(process.env.NEXT_PUBLIC_INSFORGE_BASE_URL)) {
    missing.push('NEXT_PUBLIC_INSFORGE_BASE_URL')
  }
  if (!hasText(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY)) {
    missing.push('NEXT_PUBLIC_INSFORGE_ANON_KEY')
  }

  return missing
}

function getEnvDiagnostics() {
  const auditedKeys = [
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

  const malformed: EnvDiagnosticItem[] = []
  for (const key of auditedKeys) {
    const inspection = inspectEnvValue(process.env[key])
    if (inspection.issues.length > 0) {
      malformed.push({ key, issues: inspection.issues })
    }
  }

  return {
    malformed,
    malformedCount: malformed.length,
  }
}

function getFlags(): ConfigFlags {
  return {
    auth: parseBooleanEnv(process.env.FEATURE_INSFORGE_AUTH, true).value,
    properties: parseBooleanEnv(process.env.FEATURE_INSFORGE_PROPERTIES).value,
    scraper: parseBooleanEnv(process.env.FEATURE_INSFORGE_SCRAPER).value,
    marketing: parseBooleanEnv(process.env.FEATURE_INSFORGE_MARKETING).value,
    manager: parseBooleanEnv(process.env.FEATURE_INSFORGE_MANAGER).value,
    adminImpersonation: parseBooleanEnv(process.env.FEATURE_ADMIN_IMPERSONATION).value,
    skipEmailVerification: parseBooleanEnv(process.env.FEATURE_SKIP_EMAIL_VERIFICATION).value,
    searchApiV2: parseBooleanEnv(process.env.FEATURE_SEARCH_API_V2, true).value,
    funnelEvents: parseBooleanEnv(process.env.FEATURE_FUNNEL_EVENTS, true).value,
    partnerDraftFlow: parseBooleanEnv(process.env.FEATURE_PARTNER_DRAFT_FLOW, true).value,
    leadFormFallback: parseBooleanEnv(process.env.FEATURE_LEAD_FORM_FALLBACK, true).value,
    addressGeocoding: parseBooleanEnv(process.env.FEATURE_ADDRESS_GEOCODING, true).value,
    compare: parseBooleanEnv(process.env.FEATURE_COMPARE).value,
    favoritesSync: parseBooleanEnv(process.env.FEATURE_FAVORITES_SYNC).value,
    savedSearch: parseBooleanEnv(process.env.FEATURE_SAVED_SEARCH).value,
    whatsappAlerts: parseBooleanEnv(process.env.FEATURE_WHATSAPP_ALERTS).value,
    zoneInsights: parseBooleanEnv(process.env.FEATURE_ZONE_INSIGHTS).value,
    themeLabEditorial: parseBooleanEnv(process.env.FEATURE_THEME_LAB_EDITORIAL).value,
    geocatastroLookup: parseBooleanEnv(process.env.FEATURE_GEOCATASTRO_LOOKUP).value,
    legalCommissionGuide: parseBooleanEnv(process.env.FEATURE_LEGAL_COMMISSION_GUIDE).value,
    agencyValueScore: parseBooleanEnv(process.env.FEATURE_AGENCY_VALUE_SCORE).value,
  }
}

export async function GET() {
  const missing = getMissingPublicEnv()
  const envDiagnostics = getEnvDiagnostics()

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    flags: getFlags(),
    envDiagnostics,
    runtime: {
      nodeEnv: process.env.NODE_ENV || 'development',
      appUrl: normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000',
    },
  })
}

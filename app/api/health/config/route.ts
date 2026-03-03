import { NextResponse } from 'next/server'

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

function asBool(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
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

function getFlags(): ConfigFlags {
  return {
    auth: asBool(process.env.FEATURE_INSFORGE_AUTH, true),
    properties: asBool(process.env.FEATURE_INSFORGE_PROPERTIES),
    scraper: asBool(process.env.FEATURE_INSFORGE_SCRAPER),
    marketing: asBool(process.env.FEATURE_INSFORGE_MARKETING),
    manager: asBool(process.env.FEATURE_INSFORGE_MANAGER),
    adminImpersonation: asBool(process.env.FEATURE_ADMIN_IMPERSONATION),
    skipEmailVerification: asBool(process.env.FEATURE_SKIP_EMAIL_VERIFICATION),
    searchApiV2: asBool(process.env.FEATURE_SEARCH_API_V2, true),
    funnelEvents: asBool(process.env.FEATURE_FUNNEL_EVENTS, true),
    partnerDraftFlow: asBool(process.env.FEATURE_PARTNER_DRAFT_FLOW, true),
    leadFormFallback: asBool(process.env.FEATURE_LEAD_FORM_FALLBACK, true),
    addressGeocoding: asBool(process.env.FEATURE_ADDRESS_GEOCODING, true),
    compare: asBool(process.env.FEATURE_COMPARE),
    favoritesSync: asBool(process.env.FEATURE_FAVORITES_SYNC),
    savedSearch: asBool(process.env.FEATURE_SAVED_SEARCH),
    whatsappAlerts: asBool(process.env.FEATURE_WHATSAPP_ALERTS),
    zoneInsights: asBool(process.env.FEATURE_ZONE_INSIGHTS),
    themeLabEditorial: asBool(process.env.FEATURE_THEME_LAB_EDITORIAL),
    geocatastroLookup: asBool(process.env.FEATURE_GEOCATASTRO_LOOKUP),
    legalCommissionGuide: asBool(process.env.FEATURE_LEGAL_COMMISSION_GUIDE),
    agencyValueScore: asBool(process.env.FEATURE_AGENCY_VALUE_SCORE),
  }
}

export async function GET() {
  const missing = getMissingPublicEnv()

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    flags: getFlags(),
    runtime: {
      nodeEnv: process.env.NODE_ENV || 'development',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  })
}

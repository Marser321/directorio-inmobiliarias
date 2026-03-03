export interface InsforgeEnv {
  baseUrl: string
  anonKey: string
  appUrl: string
  n8nScraperWebhookUrl: string
  n8nSharedSecret: string
  alertsCronSecret: string
  metaWaToken: string
  metaWaPhoneNumberId: string
  metaWaApiVersion: string
  metaWaTemplateName: string
  featureInsforgeAuth: boolean
  featureInsforgeProperties: boolean
  featureInsforgeScraper: boolean
  featureInsforgeMarketing: boolean
  featureInsforgeManager: boolean
  featureAdminImpersonation: boolean
  featureSearchApiV2: boolean
  featureFunnelEvents: boolean
  featurePartnerDraftFlow: boolean
  featureLeadFormFallback: boolean
  featureAddressGeocoding: boolean
  featureCompare: boolean
  featureFavoritesSync: boolean
  featureSavedSearch: boolean
  featureWhatsappAlerts: boolean
  featureZoneInsights: boolean
  featureThemeLabEditorial: boolean
  featureGeocatastroLookup: boolean
  featureLegalCommissionGuide: boolean
  featureAgencyValueScore: boolean
}

function asBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getInsforgeEnv(): InsforgeEnv {
  return {
    baseUrl: requireEnv('NEXT_PUBLIC_INSFORGE_BASE_URL'),
    anonKey: requireEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    n8nScraperWebhookUrl: process.env.N8N_SCRAPER_WEBHOOK_URL || '',
    n8nSharedSecret: process.env.N8N_WEBHOOK_SHARED_SECRET || '',
    alertsCronSecret: process.env.ALERTS_CRON_SECRET || '',
    metaWaToken: process.env.META_WA_TOKEN || '',
    metaWaPhoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
    metaWaApiVersion: process.env.META_WA_API_VERSION || 'v21.0',
    metaWaTemplateName: process.env.META_WA_TEMPLATE_NAME || 'property_alert_v1',
    featureInsforgeAuth: asBool(process.env.FEATURE_INSFORGE_AUTH, true),
    featureInsforgeProperties: asBool(process.env.FEATURE_INSFORGE_PROPERTIES, false),
    featureInsforgeScraper: asBool(process.env.FEATURE_INSFORGE_SCRAPER, false),
    featureInsforgeMarketing: asBool(process.env.FEATURE_INSFORGE_MARKETING, false),
    featureInsforgeManager: asBool(process.env.FEATURE_INSFORGE_MANAGER, false),
    featureAdminImpersonation: asBool(process.env.FEATURE_ADMIN_IMPERSONATION, false),
    featureSearchApiV2: asBool(process.env.FEATURE_SEARCH_API_V2, true),
    featureFunnelEvents: asBool(process.env.FEATURE_FUNNEL_EVENTS, true),
    featurePartnerDraftFlow: asBool(process.env.FEATURE_PARTNER_DRAFT_FLOW, true),
    featureLeadFormFallback: asBool(process.env.FEATURE_LEAD_FORM_FALLBACK, true),
    featureAddressGeocoding: asBool(process.env.FEATURE_ADDRESS_GEOCODING, true),
    featureCompare: asBool(process.env.FEATURE_COMPARE, false),
    featureFavoritesSync: asBool(process.env.FEATURE_FAVORITES_SYNC, false),
    featureSavedSearch: asBool(process.env.FEATURE_SAVED_SEARCH, false),
    featureWhatsappAlerts: asBool(process.env.FEATURE_WHATSAPP_ALERTS, false),
    featureZoneInsights: asBool(process.env.FEATURE_ZONE_INSIGHTS, false),
    featureThemeLabEditorial: asBool(process.env.FEATURE_THEME_LAB_EDITORIAL, false),
    featureGeocatastroLookup: asBool(process.env.FEATURE_GEOCATASTRO_LOOKUP, false),
    featureLegalCommissionGuide: asBool(process.env.FEATURE_LEGAL_COMMISSION_GUIDE, false),
    featureAgencyValueScore: asBool(process.env.FEATURE_AGENCY_VALUE_SCORE, false),
  }
}

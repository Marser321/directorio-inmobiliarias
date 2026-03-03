import { parseBooleanEnv, readRequiredEnv, normalizeEnvValue } from '@/lib/env/normalize'

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

export function getInsforgeEnv(): InsforgeEnv {
  return {
    baseUrl: readRequiredEnv('NEXT_PUBLIC_INSFORGE_BASE_URL'),
    anonKey: readRequiredEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY'),
    appUrl: normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000',
    n8nScraperWebhookUrl: normalizeEnvValue(process.env.N8N_SCRAPER_WEBHOOK_URL) || '',
    n8nSharedSecret: normalizeEnvValue(process.env.N8N_WEBHOOK_SHARED_SECRET) || '',
    alertsCronSecret: normalizeEnvValue(process.env.ALERTS_CRON_SECRET) || '',
    metaWaToken: normalizeEnvValue(process.env.META_WA_TOKEN) || '',
    metaWaPhoneNumberId: normalizeEnvValue(process.env.META_WA_PHONE_NUMBER_ID) || '',
    metaWaApiVersion: normalizeEnvValue(process.env.META_WA_API_VERSION) || 'v21.0',
    metaWaTemplateName: normalizeEnvValue(process.env.META_WA_TEMPLATE_NAME) || 'property_alert_v1',
    featureInsforgeAuth: parseBooleanEnv(process.env.FEATURE_INSFORGE_AUTH, true).value,
    featureInsforgeProperties: parseBooleanEnv(process.env.FEATURE_INSFORGE_PROPERTIES, false).value,
    featureInsforgeScraper: parseBooleanEnv(process.env.FEATURE_INSFORGE_SCRAPER, false).value,
    featureInsforgeMarketing: parseBooleanEnv(process.env.FEATURE_INSFORGE_MARKETING, false).value,
    featureInsforgeManager: parseBooleanEnv(process.env.FEATURE_INSFORGE_MANAGER, false).value,
    featureAdminImpersonation: parseBooleanEnv(process.env.FEATURE_ADMIN_IMPERSONATION, false).value,
    featureSearchApiV2: parseBooleanEnv(process.env.FEATURE_SEARCH_API_V2, true).value,
    featureFunnelEvents: parseBooleanEnv(process.env.FEATURE_FUNNEL_EVENTS, true).value,
    featurePartnerDraftFlow: parseBooleanEnv(process.env.FEATURE_PARTNER_DRAFT_FLOW, true).value,
    featureLeadFormFallback: parseBooleanEnv(process.env.FEATURE_LEAD_FORM_FALLBACK, true).value,
    featureAddressGeocoding: parseBooleanEnv(process.env.FEATURE_ADDRESS_GEOCODING, true).value,
    featureCompare: parseBooleanEnv(process.env.FEATURE_COMPARE, false).value,
    featureFavoritesSync: parseBooleanEnv(process.env.FEATURE_FAVORITES_SYNC, false).value,
    featureSavedSearch: parseBooleanEnv(process.env.FEATURE_SAVED_SEARCH, false).value,
    featureWhatsappAlerts: parseBooleanEnv(process.env.FEATURE_WHATSAPP_ALERTS, false).value,
    featureZoneInsights: parseBooleanEnv(process.env.FEATURE_ZONE_INSIGHTS, false).value,
    featureThemeLabEditorial: parseBooleanEnv(process.env.FEATURE_THEME_LAB_EDITORIAL, false).value,
    featureGeocatastroLookup: parseBooleanEnv(process.env.FEATURE_GEOCATASTRO_LOOKUP, false).value,
    featureLegalCommissionGuide: parseBooleanEnv(process.env.FEATURE_LEGAL_COMMISSION_GUIDE, false).value,
    featureAgencyValueScore: parseBooleanEnv(process.env.FEATURE_AGENCY_VALUE_SCORE, false).value,
  }
}

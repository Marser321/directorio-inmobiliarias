import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatDatabase } from '@/lib/insforge/compat'
import { parseBooleanEnv } from '@/lib/env/normalize'

type ProfileRow = Record<string, unknown>

interface AgencyMembershipRow extends Record<string, unknown> {
  agency_id?: number
  role?: string
}

type AgencyRow = Record<string, unknown>
type IntegrityWarningCode =
  | 'MISSING_PROFILE'
  | 'MISSING_AGENCY_MEMBERSHIP'
  | 'MEMBERSHIP_AGENCY_NOT_FOUND'

type IntegrityWarning = {
  code: IntegrityWarningCode
  message: string
}

type FeatureFlagsPayload = {
  properties: boolean
  scraper: boolean
  marketing: boolean
  manager: boolean
  adminImpersonation: boolean
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

type AgencyContextPayload = {
  agencyId: number | null
  membershipRole: string | null
  permissions: {
    canManageProperties: boolean
    canManageMarketing: boolean
    canManageScraper: boolean
    canManageTeam: boolean
    canAccessManager: boolean
    canEditAgencyProfile: boolean
    isAdmin: boolean
  }
}

function mapFeatureFlags(): FeatureFlagsPayload {
  return {
    properties: parseBooleanEnv(process.env.FEATURE_INSFORGE_PROPERTIES, false).value,
    scraper: parseBooleanEnv(process.env.FEATURE_INSFORGE_SCRAPER, false).value,
    marketing: parseBooleanEnv(process.env.FEATURE_INSFORGE_MARKETING, false).value,
    manager: parseBooleanEnv(process.env.FEATURE_INSFORGE_MANAGER, false).value,
    adminImpersonation: parseBooleanEnv(process.env.FEATURE_ADMIN_IMPERSONATION, false).value,
    searchApiV2: parseBooleanEnv(process.env.FEATURE_SEARCH_API_V2, true).value,
    funnelEvents: parseBooleanEnv(process.env.FEATURE_FUNNEL_EVENTS, true).value,
    partnerDraftFlow: parseBooleanEnv(process.env.FEATURE_PARTNER_DRAFT_FLOW, true).value,
    leadFormFallback: parseBooleanEnv(process.env.FEATURE_LEAD_FORM_FALLBACK, true).value,
    addressGeocoding: parseBooleanEnv(process.env.FEATURE_ADDRESS_GEOCODING, true).value,
    compare: parseBooleanEnv(process.env.FEATURE_COMPARE, false).value,
    favoritesSync: parseBooleanEnv(process.env.FEATURE_FAVORITES_SYNC, false).value,
    savedSearch: parseBooleanEnv(process.env.FEATURE_SAVED_SEARCH, false).value,
    whatsappAlerts: parseBooleanEnv(process.env.FEATURE_WHATSAPP_ALERTS, false).value,
    zoneInsights: parseBooleanEnv(process.env.FEATURE_ZONE_INSIGHTS, false).value,
    themeLabEditorial: parseBooleanEnv(process.env.FEATURE_THEME_LAB_EDITORIAL, false).value,
    geocatastroLookup: parseBooleanEnv(process.env.FEATURE_GEOCATASTRO_LOOKUP, false).value,
    legalCommissionGuide: parseBooleanEnv(process.env.FEATURE_LEGAL_COMMISSION_GUIDE, false).value,
    agencyValueScore: parseBooleanEnv(process.env.FEATURE_AGENCY_VALUE_SCORE, false).value,
  }
}

function emptyAuthPayload(featureFlags: FeatureFlagsPayload) {
  return {
    user: null,
    profile: null,
    agencyMembership: null,
    integrityWarnings: [] as IntegrityWarning[],
    agencyContext: null,
    agency: null,
    featureFlags,
  }
}

export async function GET() {
  const featureFlags = mapFeatureFlags()

  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeAuth) {
      return NextResponse.json(emptyAuthPayload(featureFlags))
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    const userId = typeof user?.id === 'string' ? user.id : null
    if (!userId) {
      return NextResponse.json(emptyAuthPayload(featureFlags))
    }

    const { data: profile } = await database
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<ProfileRow>()

    const { data: membership } = await database
      .from('agency_memberships')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<AgencyMembershipRow>()

    let agency = null
    if (membership?.agency_id) {
      const { data } = await database
        .from('agencies')
        .select('id, name, slug, logo_url, tier_subscription, total_properties, total_views')
        .eq('id', membership.agency_id)
        .maybeSingle<AgencyRow>()
      agency = data || null
    }

    const integrityWarnings: IntegrityWarning[] = []
    if (!profile) {
      integrityWarnings.push({
        code: 'MISSING_PROFILE',
        message: 'Authenticated user has no profile row in public.profiles.',
      })
    }
    if (!membership) {
      integrityWarnings.push({
        code: 'MISSING_AGENCY_MEMBERSHIP',
        message: 'Authenticated user has no agency membership in public.agency_memberships.',
      })
    }
    if (membership?.agency_id && !agency) {
      integrityWarnings.push({
        code: 'MEMBERSHIP_AGENCY_NOT_FOUND',
        message: 'User membership points to an agency that could not be loaded.',
      })
    }

    const isAdmin = Boolean(
      profile &&
        typeof profile === 'object' &&
        (((profile as { is_admin?: unknown }).is_admin === true) ||
          (profile as { role?: unknown }).role === 'platform_admin')
    )
    const membershipRole = typeof membership?.role === 'string' ? membership.role : null
    const agencyContext: AgencyContextPayload = {
      agencyId: membership?.agency_id ?? null,
      membershipRole,
      permissions: {
        canManageProperties: Boolean(isAdmin || membership?.agency_id),
        canManageMarketing: Boolean(isAdmin || membership?.agency_id),
        canManageScraper: Boolean(isAdmin || membership?.agency_id),
        canManageTeam: Boolean(isAdmin || membershipRole === 'owner' || membershipRole === 'admin'),
        canAccessManager: Boolean(isAdmin || membership?.agency_id),
        canEditAgencyProfile: Boolean(isAdmin || membershipRole === 'owner' || membershipRole === 'admin'),
        isAdmin,
      },
    }

    return NextResponse.json({
      user,
      profile: profile || null,
      agencyMembership: membership || null,
      integrityWarnings,
      agencyContext,
      agency,
      featureFlags,
    })
  } catch {
    return NextResponse.json(emptyAuthPayload(featureFlags))
  }
}

'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getInsforgeBrowserClient } from '@/lib/insforge/client'
import { clearClientAccessToken } from '@/lib/insforge/client-token'
import { asCompatAuth } from '@/lib/insforge/compat'
import type { UserRole } from '@/types/domain'

interface AuthUser {
  id: string
  email: string
  emailVerified?: boolean
  profile?: {
    full_name?: string | null
    role?: UserRole | null
    is_admin?: boolean | null
    agency_id?: number | null
  } | null
}

interface AgencySummary {
  id: number
  name: string
  slug: string
  logo_url: string | null
  tier_subscription: string
  total_properties: number
  total_views: number
}

export interface AuthFeatureFlags {
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

export interface AuthAgencyContext {
  agencyId: number | null
  membershipRole: 'owner' | 'admin' | 'member' | null
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

export interface AuthIntegrityWarning {
  code: string
  message: string
}

interface AuthContextValue {
  loading: boolean
  user: AuthUser | null
  role: UserRole | null
  isAdmin: boolean
  agency: AgencySummary | null
  agencyContext: AuthAgencyContext | null
  integrityWarnings: AuthIntegrityWarning[]
  featureFlags: AuthFeatureFlags
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const DEFAULT_FEATURE_FLAGS: AuthFeatureFlags = {
  properties: false,
  scraper: false,
  marketing: false,
  manager: false,
  adminImpersonation: false,
  searchApiV2: true,
  funnelEvents: true,
  partnerDraftFlow: true,
  leadFormFallback: true,
  addressGeocoding: true,
  compare: false,
  favoritesSync: false,
  savedSearch: false,
  whatsappAlerts: false,
  zoneInsights: false,
  themeLabEditorial: false,
  geocatastroLookup: false,
  legalCommissionGuide: false,
  agencyValueScore: false,
}

async function fetchAuthPayload() {
  const response = await fetch('/api/auth/me', { cache: 'no-store' })
  if (!response.ok) {
    return {
      user: null,
      profile: null,
      agencyMembership: null,
      integrityWarnings: [],
      agencyContext: null,
      agency: null,
      featureFlags: DEFAULT_FEATURE_FLAGS,
    }
  }

  return response.json()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [agency, setAgency] = useState<AgencySummary | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [agencyContext, setAgencyContext] = useState<AuthAgencyContext | null>(null)
  const [integrityWarnings, setIntegrityWarnings] = useState<AuthIntegrityWarning[]>([])
  const [featureFlags, setFeatureFlags] = useState<AuthFeatureFlags>(DEFAULT_FEATURE_FLAGS)

  const refresh = useCallback(async () => {
    setLoading(true)

    try {
      const payload = await fetchAuthPayload()
      const nextUser = payload.user
        ? {
            id: payload.user.id,
            email: payload.user.email,
            emailVerified: payload.user.emailVerified,
            profile: payload.profile,
          }
        : null

      setUser(nextUser)
      setAgency(payload.agency || null)
      setRole((payload.profile?.role as UserRole | null) ?? null)
      setIsAdmin(Boolean(payload.profile?.is_admin || payload.profile?.role === 'platform_admin'))
      setAgencyContext(payload.agencyContext || null)
      setIntegrityWarnings(
        Array.isArray(payload.integrityWarnings)
          ? payload.integrityWarnings
              .filter(
                (warning: unknown): warning is { code?: unknown; message?: unknown } =>
                  warning !== null && typeof warning === 'object'
              )
              .map((warning: { code?: unknown; message?: unknown }) => ({
                code: typeof warning.code === 'string' ? warning.code : 'UNKNOWN',
                message:
                  typeof warning.message === 'string'
                    ? warning.message
                    : 'Integrity warning without message.',
              }))
          : []
      )
      setFeatureFlags({
        properties: payload.featureFlags?.properties === true,
        scraper: payload.featureFlags?.scraper === true,
        marketing: payload.featureFlags?.marketing === true,
        manager: payload.featureFlags?.manager === true,
        adminImpersonation: payload.featureFlags?.adminImpersonation === true,
        searchApiV2: payload.featureFlags?.searchApiV2 !== false,
        funnelEvents: payload.featureFlags?.funnelEvents !== false,
        partnerDraftFlow: payload.featureFlags?.partnerDraftFlow !== false,
        leadFormFallback: payload.featureFlags?.leadFormFallback !== false,
        addressGeocoding: payload.featureFlags?.addressGeocoding !== false,
        compare: payload.featureFlags?.compare === true,
        favoritesSync: payload.featureFlags?.favoritesSync === true,
        savedSearch: payload.featureFlags?.savedSearch === true,
        whatsappAlerts: payload.featureFlags?.whatsappAlerts === true,
        zoneInsights: payload.featureFlags?.zoneInsights === true,
        themeLabEditorial: payload.featureFlags?.themeLabEditorial === true,
        geocatastroLookup: payload.featureFlags?.geocatastroLookup === true,
        legalCommissionGuide: payload.featureFlags?.legalCommissionGuide === true,
        agencyValueScore: payload.featureFlags?.agencyValueScore === true,
      })
    } catch (error) {
      console.error('AuthProvider refresh failed:', error)
      setUser(null)
      setAgency(null)
      setRole(null)
      setIsAdmin(false)
      setAgencyContext(null)
      setIntegrityWarnings([])
      setFeatureFlags(DEFAULT_FEATURE_FLAGS)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Continue local cleanup even if network/API fails.
    }

    setUser(null)
    setAgency(null)
    setRole(null)
    setIsAdmin(false)
    setAgencyContext(null)
    setIntegrityWarnings([])
    setFeatureFlags(DEFAULT_FEATURE_FLAGS)
    clearClientAccessToken()

    try {
      const client = getInsforgeBrowserClient()
      const auth = asCompatAuth(client.auth)
      if (auth.signOut) {
        await auth.signOut()
      }
    } catch {
      // Ignore SDK signOut failures because server cookie is source of truth.
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof document === 'undefined' || loading) return
    document.body.classList.toggle('theme-lab-editorial', featureFlags.themeLabEditorial)
  }, [featureFlags.themeLabEditorial, loading])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      role,
      isAdmin,
      agency,
      agencyContext,
      integrityWarnings,
      featureFlags,
      refresh,
      signOut,
    }),
    [loading, user, role, isAdmin, agency, agencyContext, integrityWarnings, featureFlags, refresh, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used inside AuthProvider')
  }
  return context
}

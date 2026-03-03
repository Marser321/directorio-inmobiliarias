'use client'

import { useAuthContext } from '@/contexts/auth-context'
import type { UserRole } from '@/types/domain'

type AuthContextState = ReturnType<typeof useAuthContext>

interface AuthState {
  user: AuthContextState['user']
  session: { user: NonNullable<AuthContextState['user']> } | null
  loading: boolean
  isAdmin: boolean
  role: UserRole | null
  agencyContext: AuthContextState['agencyContext']
  integrityWarnings: AuthContextState['integrityWarnings']
  featureFlags: AuthContextState['featureFlags']
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const { user, loading, isAdmin, role, agencyContext, integrityWarnings, featureFlags, refresh, signOut } =
    useAuthContext()

  return {
    user,
    session: user ? { user } : null,
    loading,
    isAdmin,
    role,
    agencyContext,
    integrityWarnings,
    featureFlags,
    refresh,
    signOut,
  }
}

export function useUserAgency() {
  const { agency, loading } = useAuthContext()

  return {
    agency,
    loading,
  }
}

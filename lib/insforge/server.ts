import { createInsforgeClient } from '@/lib/insforge/client'
import { getInsforgeAccessToken } from '@/lib/insforge/cookies'
import { asCompatAuth } from '@/lib/insforge/compat'
import { claimsToUser, decodeJwtClaims, normalizeUser, type JwtClaims } from '@/lib/insforge/jwt'
import { validateInsforgeAccessToken } from '@/lib/insforge/token-validation'

export async function createInsforgeServerClient() {
  const accessToken = await getInsforgeAccessToken()
  return createInsforgeClient({ accessToken: accessToken || undefined })
}

export async function getServerAccessToken() {
  return getInsforgeAccessToken()
}

export async function getServerTokenClaims(): Promise<JwtClaims | null> {
  const accessToken = await getServerAccessToken()
  return decodeJwtClaims(accessToken)
}

export async function getServerSession() {
  const accessToken = await getServerAccessToken()
  if (!accessToken) {
    return {
      session: null,
      error: null,
    }
  }

  const claims = decodeJwtClaims(accessToken)
  const claimsUser = claimsToUser(claims)
  const validatedUser = await validateInsforgeAccessToken(accessToken)
  const normalizedValidatedUser = validatedUser
    ? normalizeUser((validatedUser as Record<string, unknown>) ?? null, claims)
    : null

  if (normalizedValidatedUser?.id || claimsUser?.id) {
    return {
      session: {
        accessToken,
        user: normalizedValidatedUser || claimsUser,
      },
      error: null,
    }
  }

  const client = await createInsforgeServerClient()
  const auth = asCompatAuth(client.auth)
  const { data, error } = auth.getCurrentSession ? await auth.getCurrentSession() : { data: { session: null }, error: null }

  const rawSession = data?.session ?? null
  const rawSessionToken =
    rawSession && typeof rawSession === 'object'
      ? ((rawSession as Record<string, unknown>).accessToken as string | undefined) ||
        ((rawSession as Record<string, unknown>).access_token as string | undefined)
      : undefined
  const sessionToken = rawSessionToken || null
  const normalizedUser = normalizeUser(
    (rawSession?.user as Record<string, unknown> | null | undefined) ?? null,
    claims
  )

  if (!sessionToken || !normalizedUser?.id) {
    return {
      session: claimsUser?.id
        ? {
            accessToken,
            user: claimsUser,
          }
        : null,
      error: claimsUser?.id ? null : error,
    }
  }

  return {
    session: {
      ...rawSession,
      accessToken: sessionToken,
      user: normalizedUser,
    },
    error,
  }
}

export async function getServerUser() {
  const accessToken = await getServerAccessToken()
  if (!accessToken) {
    return { user: null, error: null }
  }

  const claims = decodeJwtClaims(accessToken)
  const claimsUser = claimsToUser(claims)
  const validatedUser = await validateInsforgeAccessToken(accessToken)
  const normalizedValidatedUser = validatedUser
    ? normalizeUser((validatedUser as Record<string, unknown>) ?? null, claims)
    : null

  if (normalizedValidatedUser?.id) {
    return { user: normalizedValidatedUser, error: null }
  }

  if (claimsUser?.id) {
    return { user: claimsUser, error: null }
  }

  const client = await createInsforgeServerClient()
  const auth = asCompatAuth(client.auth)

  if (typeof auth.getCurrentUser === 'function') {
    const { data, error } = await auth.getCurrentUser()
    const normalizedUser = normalizeUser(
      (data?.user as Record<string, unknown> | null | undefined) ?? null,
      claims
    )
    return { user: normalizedUser, error }
  }

  const { data, error } = auth.getCurrentSession ? await auth.getCurrentSession() : { data: { session: null }, error: null }
  const normalizedUser = normalizeUser(
    (data?.session?.user as Record<string, unknown> | null | undefined) ?? null,
    claims
  )
  return { user: normalizedUser, error }
}

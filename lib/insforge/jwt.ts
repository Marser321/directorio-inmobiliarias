type UnknownRecord = Record<string, unknown>

export interface JwtClaims extends UnknownRecord {
  sub?: string
  user_id?: string
  id?: string
  uid?: string
  email?: string
  user_email?: string
  role?: string
  app_role?: string
  user_role?: string
  name?: string
  full_name?: string
  email_verified?: boolean
  emailVerified?: boolean
  user_metadata?: UnknownRecord
}

export interface JwtUser extends UnknownRecord {
  id: string
  email?: string
  emailVerified?: boolean
  profile?: {
    name?: string
  }
}

function decodeBase64Url(value: string): string | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const base64 = normalized + padding

  try {
    if (typeof atob === 'function') {
      return atob(base64)
    }
  } catch {
    // Ignore and try Buffer fallback below.
  }

  try {
    const bufferLike = (globalThis as unknown as { Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer
    if (bufferLike) {
      return bufferLike.from(base64, 'base64').toString('utf-8')
    }
  } catch {
    return null
  }

  return null
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') return value
  }
  return undefined
}

function getMetadataName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const source = metadata as UnknownRecord
  return pickString(source.name, source.full_name)
}

function isAnonymousLikeRole(role: string | null) {
  if (!role) return false
  const normalizedRole = role.toLowerCase()
  return (
    normalizedRole === 'anon' ||
    normalizedRole === 'anonymous' ||
    normalizedRole === 'public' ||
    normalizedRole === 'service_role'
  )
}

function isAnonymousLikeEmail(email: string | null) {
  if (!email) return false
  const normalizedEmail = email.toLowerCase()
  return (
    normalizedEmail === 'anon@insforge.com' ||
    normalizedEmail === 'anonymous@insforge.com' ||
    normalizedEmail === 'anon@example.com'
  )
}

export function decodeJwtClaims(token: string | null | undefined): JwtClaims | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  const payload = decodeBase64Url(parts[1])
  if (!payload) return null

  try {
    return JSON.parse(payload) as JwtClaims
  } catch {
    return null
  }
}

export function claimsToUser(claims: JwtClaims | null | undefined): JwtUser | null {
  if (!claims) return null

  const id = pickString(claims.sub, claims.user_id, claims.id, claims.uid)
  if (!id) return null

  const email = pickString(claims.email, claims.user_email)
  const role = pickString(claims.role, claims.app_role, claims.user_role)

  if (isAnonymousLikeRole(role) || isAnonymousLikeEmail(email)) {
    return null
  }

  const fullName = pickString(claims.name, claims.full_name, getMetadataName(claims.user_metadata))
  const emailVerified = pickBoolean(claims.email_verified, claims.emailVerified)

  return {
    ...claims,
    id,
    ...(email ? { email } : {}),
    ...(emailVerified !== undefined ? { emailVerified } : {}),
    ...(fullName ? { profile: { name: fullName } } : {}),
  }
}

export function normalizeUser(
  sourceUser: UnknownRecord | null | undefined,
  claims: JwtClaims | null | undefined
): JwtUser | null {
  const fallback = claimsToUser(claims)
  if (!sourceUser && !fallback) return null

  const profileSource =
    sourceUser && typeof sourceUser.profile === 'object'
      ? (sourceUser.profile as UnknownRecord)
      : (fallback?.profile as UnknownRecord | undefined)

  const id = pickString(sourceUser?.id, sourceUser?.sub, sourceUser?.user_id, sourceUser?.uid, fallback?.id)
  if (!id) return fallback

  const email = pickString(sourceUser?.email, sourceUser?.user_email, fallback?.email)
  const role = pickString(
    sourceUser?.role,
    sourceUser?.app_role,
    sourceUser?.user_role,
    (fallback as UnknownRecord | undefined)?.role,
    (fallback as UnknownRecord | undefined)?.app_role,
    (fallback as UnknownRecord | undefined)?.user_role
  )

  if (isAnonymousLikeRole(role) || isAnonymousLikeEmail(email)) {
    return null
  }

  const profileName = pickString(
    profileSource?.name,
    profileSource?.full_name,
    getMetadataName(sourceUser?.user_metadata),
    fallback?.profile?.name
  )

  const emailVerified = pickBoolean(
    sourceUser?.emailVerified,
    sourceUser?.email_verified,
    fallback?.emailVerified
  )

  return {
    ...(fallback || {}),
    ...(sourceUser || {}),
    id,
    ...(email ? { email } : {}),
    ...(emailVerified !== undefined ? { emailVerified } : {}),
    ...(profileName ? { profile: { ...(profileSource || {}), name: profileName } } : {}),
  }
}

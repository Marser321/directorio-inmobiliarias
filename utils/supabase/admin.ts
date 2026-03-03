import { createClient } from '@/lib/insforge/compat-supabase'

const ADMIN_KEY_ENV_CANDIDATES = [
  'INSFORGE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INSFORGE_ADMIN_API_KEY',
] as const

function resolveAdminKey() {
  for (const name of ADMIN_KEY_ENV_CANDIDATES) {
    const value = process.env[name]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return null
}

function resolveBaseUrl() {
  const value = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function createAdminClient() {
  const baseUrl = resolveBaseUrl()
  const adminKey = resolveAdminKey()

  if (!baseUrl) {
    throw new Error('Missing InsForge base URL for admin client')
  }

  if (!adminKey) {
    throw new Error(
      `Missing admin key. Set one of: ${ADMIN_KEY_ENV_CANDIDATES.join(', ')}`
    )
  }

  return createClient(
    baseUrl,
    adminKey
  )
}

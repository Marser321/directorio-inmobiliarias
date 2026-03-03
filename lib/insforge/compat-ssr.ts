import { createClient } from '@/lib/insforge/compat-supabase'

type CookieRecord = {
  name: string
  value: string
  options?: Record<string, unknown>
}

type CookieAdapter = {
  getAll?: () => CookieRecord[]
  setAll?: (cookiesToSet: CookieRecord[]) => void
}

type SsrClientOptions = {
  cookies?: CookieAdapter
}

function resolvePublicClientConfig(url?: string, key?: string) {
  return {
    url: url || process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    key: key || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  }
}

function getBrowserToken() {
  if (typeof window === 'undefined') return undefined
  return window.localStorage.getItem('insforge_client_access_token') || undefined
}

export function createBrowserClient(url?: string, key?: string) {
  const resolved = resolvePublicClientConfig(url, key)
  const token = getBrowserToken()
  const options = token
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    : undefined
  return createClient(resolved.url, resolved.key, options)
}

function getServerToken(options?: SsrClientOptions) {
  try {
    const cookies = options?.cookies?.getAll?.() || []
    const hit = cookies.find((cookie) => cookie.name === 'insforge_access_token')
    return hit?.value
  } catch {
    return undefined
  }
}

export function createServerClient(url?: string, key?: string, options?: SsrClientOptions) {
  const resolved = resolvePublicClientConfig(url, key)
  const token = getServerToken(options)
  const clientOptions = token
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    : undefined
  return createClient(resolved.url, resolved.key, clientOptions)
}

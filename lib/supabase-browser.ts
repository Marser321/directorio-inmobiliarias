'use client'

import { createBrowserClient } from '@/lib/insforge/compat-ssr'
import { getInsforgeClientEnvDiagnostics, type EnvDiagnostics } from '@/lib/insforge/compat-supabase'

function getPublicClientConfig() {
  return {
    url: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    key: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  }
}

export function getSupabaseBrowserEnvDiagnostics(): EnvDiagnostics {
  const { url, key } = getPublicClientConfig()
  return getInsforgeClientEnvDiagnostics(url, key)
}

export function createSupabaseBrowserClient() {
  const { url, key } = getPublicClientConfig()
  const diagnostics = getInsforgeClientEnvDiagnostics(url, key)

  if (!diagnostics.ok) {
    console.warn(
      `[InsForge] Missing config (${diagnostics.mode}): ${diagnostics.missing.join(', ')}. ` +
        'Check .env.local and restart the dev server.'
    )
  }

  return createBrowserClient(url, key)
}

let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient()
  }
  return browserClient
}

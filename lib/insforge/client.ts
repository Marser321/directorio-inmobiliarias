import { createClient } from '@insforge/sdk'
import { getInsforgeEnv } from '@/lib/insforge/env'

interface ClientOptions {
  accessToken?: string
  baseUrl?: string
  anonKey?: string
}

export type InsforgeClient = ReturnType<typeof createInsforgeClient>

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function createInsforgeClient(options: ClientOptions = {}) {
  let baseUrl = hasText(options.baseUrl) ? options.baseUrl : undefined
  let anonKey = hasText(options.anonKey) ? options.anonKey : undefined

  if (!baseUrl && hasText(process.env.NEXT_PUBLIC_INSFORGE_BASE_URL)) {
    baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
  }
  if (!anonKey && hasText(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY)) {
    anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  }

  if ((!baseUrl || !anonKey) && typeof window === 'undefined') {
    const env = getInsforgeEnv()
    if (!baseUrl) baseUrl = env.baseUrl
    if (!anonKey) anonKey = env.anonKey
  }

  if (!baseUrl || !anonKey) {
    const missing = []
    if (!baseUrl) missing.push('NEXT_PUBLIC_INSFORGE_BASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_INSFORGE_ANON_KEY')
    throw new Error(`Missing required environment variable: ${missing.join(', ')}`)
  }

  const config = {
    baseUrl,
    anonKey,
    edgeFunctionToken: options.accessToken,
  } as unknown as Parameters<typeof createClient>[0]

  return createClient(config)
}

let browserClient: ReturnType<typeof createInsforgeClient> | null = null

export function createInsforgeBrowserClient() {
  return createInsforgeClient()
}

export function getInsforgeBrowserClient() {
  if (!browserClient) browserClient = createInsforgeBrowserClient()
  return browserClient
}

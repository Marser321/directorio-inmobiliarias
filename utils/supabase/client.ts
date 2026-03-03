import { createBrowserClient } from '@/lib/insforge/compat-ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
  )
}

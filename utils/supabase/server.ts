import { createServerClient } from '@/lib/insforge/compat-ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Can be ignored from Server Components
          }
        },
      },
    }
  )
}

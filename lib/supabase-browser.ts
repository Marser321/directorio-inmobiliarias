'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

/**
 * Creates a Supabase client for use in browser/client components.
 * Uses cookie-based authentication for session persistence.
 */
export function createSupabaseBrowserClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Supabase Browser Client Init:', {
        url,
        keyLength: key?.length,
        hasKey: !!key
    })

    if (!url || !key) {
        console.error('Supabase Browser Client: Missing URL or Key!')
    }

    return createBrowserClient<Database>(url!, key!) as any
}

// Singleton instance for use across the app
let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseBrowserClient() {
    if (!browserClient) {
        browserClient = createSupabaseBrowserClient()
    }
    return browserClient
}

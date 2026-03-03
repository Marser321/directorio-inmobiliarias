import { createClient } from '@/lib/insforge/compat-supabase'

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!baseUrl || !anonKey) {
  console.warn('Missing InsForge environment variables. Check .env.local')
}

export const supabase = createClient(baseUrl || '', anonKey || '')

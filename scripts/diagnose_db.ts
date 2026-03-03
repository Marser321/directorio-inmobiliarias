import { createClient } from '@/lib/insforge/compat-supabase'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!BASE_URL || !ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY')
  process.exit(1)
}

const client = createClient(BASE_URL, ANON_KEY)

async function diagnose() {
  console.log('--- Diagnosing InsForge Database ---')

  try {
    const { count, error } = await (client as any)
      .from('properties')
      .select('*', { count: 'exact', head: true })

    console.log('Properties count:', error ? `Error: ${error.message}` : count)

    const { data: properties, error: sampleError } = await (client as any)
      .from('properties')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.log('Sample query error:', sampleError.message)
    } else if (properties?.length) {
      console.log('Sample property keys:', Object.keys(properties[0]))
    } else {
      console.log('No properties found')
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

diagnose()

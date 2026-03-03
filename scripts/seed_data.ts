import { createClient } from '@/lib/insforge/compat-supabase'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!BASE_URL || !ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY')
  process.exit(1)
}

const client = createClient(BASE_URL, ANON_KEY)

async function seedData() {
  const payload = [
    {
      name: `Seed Agency ${Date.now()}`,
      slug: `seed-agency-${Date.now()}`,
      city: 'Punta del Este',
      tier_subscription: 'basic',
    },
  ]

  const { data, error } = await (client as any)
    .from('agencies')
    .insert(payload)
    .select()

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Seed completed:', data)
}

seedData()

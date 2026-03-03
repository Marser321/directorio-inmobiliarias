import { createClient } from '@/lib/insforge/compat-supabase'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!BASE_URL || !ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY')
  process.exit(1)
}

const client = createClient(BASE_URL, ANON_KEY)

async function fixBrokenImage() {
  const { data: properties, error } = await (client as any)
    .from('properties')
    .select('id, title, images')
    .limit(100)

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  let fixed = 0

  for (const property of properties || []) {
    const images = Array.isArray(property.images) ? property.images.filter(Boolean) : []
    const deduped = Array.from(new Set(images))

    if (JSON.stringify(images) !== JSON.stringify(deduped)) {
      const { error: updateError } = await (client as any)
        .from('properties')
        .update({ images: deduped })
        .eq('id', property.id)

      if (!updateError) {
        fixed += 1
      }
    }
  }

  console.log(`Done. Fixed ${fixed} properties.`)
}

fixBrokenImage()

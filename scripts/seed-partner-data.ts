import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/utils/supabase/admin'

async function main() {
  const supabase = createAdminClient()

  const targetUserId =
    process.env.TARGET_USER_ID?.trim() || 'e46488db-4ba1-4d86-9c86-88928cf606e9'
  console.log(`Seeding partner data for user ${targetUserId}...`)

  const { data: membership, error: membershipError } = await supabase
    .from('agency_memberships')
    .select('agency_id, role')
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (membershipError || !membership?.agency_id) {
    throw new Error(`User has no agency_memberships row: ${membershipError?.message || 'missing membership'}`)
  }

  const agencyId = membership.agency_id
  console.log(`Agency ID: ${agencyId}`)

  const { error: agencyUpdateError } = await supabase
    .from('agencies')
    .update({
      name: 'Luxe Estate Partners',
      logo_url:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
      description: 'Agencia líder en propiedades de lujo en Punta del Este.',
      website: 'https://luxe-estate.com',
      contact_phone: '+598 99 123 456',
      address: 'Calle 20 y 24, Punta del Este',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agencyId)

  if (agencyUpdateError) {
    throw new Error(`Failed to update agency: ${agencyUpdateError.message}`)
  }

  console.log('Agency profile updated.')

  const dummyProperty = {
    agency_id: agencyId,
    owner_id: targetUserId,
    title: 'Mansión Vista al Mar',
    slug: `mansion-vista-mar-${Date.now()}`,
    description:
      'Increíble propiedad con vistas panorámicas al océano, 6 suites de primer nivel y piscina infinita.',
    price: 3500000,
    currency: 'USD',
    status: 'for_sale',
    bedrooms: 6,
    bathrooms: 8,
    built_area: 750,
    location_id: 1,
    is_featured: true,
    view_count: 156,
  }

  const { data: propertyRows, error: propertyError } = await supabase
    .from('properties')
    .insert(dummyProperty)
    .select('id, title')

  if (propertyError || !propertyRows?.length) {
    throw new Error(`Failed to create property: ${propertyError?.message || 'empty insert result'}`)
  }

  const propertyId = propertyRows[0].id
  console.log(`Property created: ${propertyRows[0].title} (ID: ${propertyId})`)

  const images = [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2670&auto=format&fit=crop',
  ]

  const imageInserts = images.map((url, index) => ({
    property_id: propertyId,
    url,
    display_order: index,
  }))

  const { error: imageError } = await supabase.from('property_images').insert(imageInserts)

  if (imageError) {
    throw new Error(`Failed to insert property images: ${imageError.message}`)
  }

  console.log('Property images inserted.')
  console.log('Partner seed completed.')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

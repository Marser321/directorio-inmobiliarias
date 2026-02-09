import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function main() {
    const targetUserId = 'e46488db-4ba1-4d86-9c86-88928cf606e9'
    console.log(`Seeding data for user ${targetUserId}...`)

    // 1. Get Agency
    const { data: agencyUser, error: auError } = await supabase
        .from('agency_users')
        .select('agency_id')
        .eq('user_id', targetUserId)
        .single()

    if (auError || !agencyUser) {
        console.error('User has no agency link!', auError)
        return
    }

    const agencyId = agencyUser.agency_id
    console.log(`Agency ID: ${agencyId}`)

    // 2. Update Agency Profile
    const { error: agencyUpdateError } = await supabase
        .from('agencies')
        .update({
            name: 'Luxe Estate Partners',
            logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
            description: 'Agencia líder en propiedades de lujo en Punta del Este.',
            website: 'https://luxe-estate.com',
            phone: '+598 99 123 456',
            address: 'Calle 20 y 24, Punta del Este'
        })
        .eq('id', agencyId)

    if (agencyUpdateError) console.error('Failed to update agency:', agencyUpdateError)
    else console.log('✅ Agency Profile Updated')

    // 3. Create Dummy Property
    const dummyProperty = {
        agency_id: agencyId,
        title: 'Mansión Vista al Mar',
        slug: `mansion-vista-mar-${Date.now()}`,
        description: 'Increíble propiedad con vistas panorámicas al océano, 6 suites de primer nivel y piscina infinita.',
        price: 3500000,
        currency: 'USD',
        status: 'for_sale',
        bedrooms: 6,
        bathrooms: 8,
        built_area: 750,
        location_id: 1, // Punta del Este
        is_featured: true,
        view_count: 156
    }

    const { data: prop, error: propError } = await supabase
        .from('properties')
        .insert(dummyProperty)
        .select()

    if (propError) {
        console.error('Failed to create property:', propError)
        return
    }

    const propertyId = prop[0].id
    console.log(`✅ Property Created: ${prop[0].title} (ID: ${propertyId})`)

    // 4. Insert Images
    const images = [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2670&auto=format&fit=crop'
    ]

    const imageInserts = images.map((url, idx) => ({
        property_id: propertyId,
        url: url,
        display_order: idx
    }))

    const { error: imgError } = await supabase
        .from('property_images')
        .insert(imageInserts)

    if (imgError) console.error('Failed to insert images:', imgError)
    else console.log('✅ Property Images Inserted')

    console.log('\n🚀 Dashboard Seeded Successfully!')
}

main()

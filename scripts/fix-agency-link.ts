
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import readline from 'readline'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

async function fixAgencyLink() {
    console.log('🔧 Starting Agency Link Fix...')

    // 1. Get the most recent user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
    })

    if (usersError || !users.users.length) {
        console.error('❌ Error fetching user:', usersError)
        process.exit(1)
    }

    const user = users.users[0]
    console.log(`\nFound User: ${user.email} (ID: ${user.id})`)
    console.log(`Created: ${user.created_at}`)

    // 2. Check if they already have a link
    const { data: existingLink } = await supabase
        .from('agency_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (existingLink) {
        console.log('⚠️  User already linked to agency:', existingLink.agency_id)
        console.log('Skipping fix.')
        process.exit(0)
    }

    console.log('❌ User has NO agency link.')

    // 3. Find most recent agency (presumably theirs)
    const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (agenciesError) {
        console.error('❌ Error fetching agencies:', agenciesError)
        process.exit(1)
    }

    console.log('\nRecent Agencies:')
    agencies.forEach((a, i) => {
        console.log(`${i + 1}. [${a.id}] ${a.name} (Slug: ${a.slug}) - Created: ${a.created_at}`)
    })

    console.log('\nAttempting to link User to the most recent agency (Option 1)...')

    const targetAgency = agencies[0]

    if (!targetAgency) {
        console.log("No agencies found.")
        process.exit(1)
    }

    // 4. Create the link
    const { error: insertError } = await supabase
        .from('agency_users')
        .insert({
            user_id: user.id,
            agency_id: targetAgency.id,
            role: 'owner'
        })

    if (insertError) {
        console.error('❌ Failed to link:', insertError)
    } else {
        console.log(`✅ SUCCESS! Linked user ${user.email} to agency "${targetAgency.name}" (ID: ${targetAgency.id})`)

        // Also ensure Profile has correct agency_id (redundancy)
        await supabase.from('profiles').update({ agency_id: targetAgency.id }).eq('id', user.id)
        console.log('✅ Updated Profile agency_id as well.')
    }

    process.exit(0)
}

fixAgencyLink()

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
    console.log(`Linking user ${targetUserId}...`)

    // 1. Find an agency
    const { data: agencies, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

    if (agencyError || !agencies || agencies.length === 0) {
        console.error('No agencies found!', agencyError)
        // Create one if needed?
        return
    }

    const agency = agencies[0]
    console.log(`Found Agency: ${agency.name} (ID: ${agency.id})`)

    // 2. Link User
    const { error: insertError } = await supabase
        .from('agency_users')
        .insert({
            user_id: targetUserId,
            agency_id: agency.id,
            role: 'owner'
        })

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
            console.log('User already linked!')
        } else {
            console.error('Failed to link:', insertError)
        }
    } else {
        console.log('✅ User linked successfully!')
    }

    // 3. Update Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ agency_id: agency.id, role: 'agency' }) // Keep admin false for partner
        .eq('id', targetUserId)

    if (profileError) {
        console.error('Failed to update profile:', profileError)
    } else {
        console.log('✅ Profile updated!')
    }
}

main()

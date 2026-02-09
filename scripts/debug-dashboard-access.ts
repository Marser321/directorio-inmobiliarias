
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugDashboardAccess() {
    console.log('🔍 Starting Dashboard Access Debug...')

    // 1. Get recent users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 5
    })

    if (usersError) {
        console.error('❌ Error fetching users:', usersError)
        return
    }

    console.log(`Found ${users.users.length} recent users.`)

    for (const user of users.users) {
        console.log(`\n------------------------------------------------`)
        console.log(`User: ${user.email} (ID: ${user.id})`)
        console.log(`Created At: ${user.created_at}`)
        console.log(`Confirmed At: ${user.email_confirmed_at}`)
        console.log(`Metadata:`, user.user_metadata)

        // 2. Check Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.log(`❌ Profile Error: ${profileError.message} (Code: ${profileError.code})`)
        } else {
            console.log(`✅ Profile Found: Role=${profile.role}, AgencyID=${profile.agency_id}`)
        }

        // 3. Check Agency Users Link
        const { data: agencyUser, error: auError } = await supabase
            .from('agency_users')
            .select('*, agencies(name, slug)')
            .eq('user_id', user.id)
            .single() // Expecting one agency per user for now

        if (auError) {
            console.log(`❌ Agency Link Error: ${auError.message} (Code: ${auError.code})`)
            if (auError.code === 'PGRST116') {
                console.log(`   -> This user has NO rows in agency_users table. THIS IS THE ISSUE if they should have one.`)
            }
        } else {
            console.log(`✅ Agency Link Found!`)
            console.log(`   -> Agency: ${agencyUser.agencies?.name} (Slug: ${agencyUser.agencies?.slug})`)
            console.log(`   -> Role in Agency: ${agencyUser.role}`)
        }
    }
}

debugDashboardAccess()

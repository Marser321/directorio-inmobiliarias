import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/utils/supabase/admin'

async function debugDashboardAccess() {
  const supabase = createAdminClient()
  console.log('Starting dashboard access debug (v2)...')

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 5,
  })

  if (usersError || !users?.users) {
    throw new Error(`Failed to fetch users: ${usersError?.message || 'empty result'}`)
  }

  console.log(`Found ${users.users.length} recent users.`)

  for (const user of users.users) {
    console.log('\n------------------------------------------------')
    console.log(`User: ${user.email} (${user.id})`)
    console.log(`Created At: ${user.created_at}`)
    console.log(`Email Confirmed: ${user.email_confirmed_at}`)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, is_admin, agency_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.log(`Profile error: ${profileError.message} (Code: ${profileError.code})`)
    } else if (!profile) {
      console.log('Profile missing: no row in public.profiles')
    } else {
      console.log(`Profile: role=${profile.role}, is_admin=${profile.is_admin}, agency_id=${profile.agency_id}`)
    }

    const { data: membership, error: membershipError } = await supabase
      .from('agency_memberships')
      .select('agency_id, role, agencies(name, slug)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.log(`Membership error: ${membershipError.message} (Code: ${membershipError.code})`)
    } else if (!membership) {
      console.log('Membership missing: no row in public.agency_memberships')
    } else {
      const agency = Array.isArray(membership.agencies)
        ? membership.agencies[0]
        : membership.agencies
      console.log(`Membership: agency_id=${membership.agency_id}, role=${membership.role}`)
      console.log(`Agency: ${agency?.name || 'unknown'} (${agency?.slug || 'n/a'})`)
    }
  }
}

void debugDashboardAccess().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

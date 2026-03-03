import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/utils/supabase/admin'

async function fixAgencyLink() {
  const supabase = createAdminClient()
  console.log('Starting agency membership fix (v2)...')

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  })

  if (usersError || !users?.users?.length) {
    throw new Error(`Failed to fetch latest user: ${usersError?.message || 'No users returned'}`)
  }

  const user = users.users[0]
  console.log(`Target user: ${user.email} (${user.id})`)

  const { data: existingMembership, error: membershipReadError } = await supabase
    .from('agency_memberships')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipReadError) {
    throw new Error(`Failed to read agency_memberships: ${membershipReadError.message}`)
  }

  if (existingMembership) {
    console.log(`User already linked to agency ${existingMembership.agency_id} (${existingMembership.role}).`)
    return
  }

  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (agenciesError || !agencies?.length) {
    throw new Error(`Failed to fetch agencies: ${agenciesError?.message || 'No agencies found'}`)
  }

  console.log('Recent agencies:')
  for (const [index, agency] of agencies.entries()) {
    console.log(`${index + 1}. [${agency.id}] ${agency.name} (${agency.slug})`)
  }

  const targetAgency = agencies[0]

  const { error: upsertError } = await supabase
    .from('agency_memberships')
    .upsert(
      {
        user_id: user.id,
        agency_id: targetAgency.id,
        role: 'owner',
      },
      { onConflict: 'user_id' }
    )

  if (upsertError) {
    throw new Error(`Failed to upsert membership: ${upsertError.message}`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ agency_id: targetAgency.id, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) {
    throw new Error(`Failed to update profile agency_id: ${profileError.message}`)
  }

  console.log(`Linked ${user.email} to agency "${targetAgency.name}" (${targetAgency.id}) as owner.`)
}

void fixAgencyLink().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

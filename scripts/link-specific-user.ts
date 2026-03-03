import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/utils/supabase/admin'

async function main() {
  const supabase = createAdminClient()

  const targetUserId =
    process.env.TARGET_USER_ID?.trim() || 'e46488db-4ba1-4d86-9c86-88928cf606e9'
  const targetAgencySlug = process.env.TARGET_AGENCY_SLUG?.trim() || null

  console.log(`Linking user ${targetUserId} using agency_memberships (v2)...`)

  let agencyQuery = supabase.from('agencies').select('id, name, slug')
  if (targetAgencySlug) {
    agencyQuery = agencyQuery.eq('slug', targetAgencySlug)
  }

  const { data: agencies, error: agencyError } = await agencyQuery
    .order('created_at', { ascending: false })
    .limit(1)

  if (agencyError || !agencies?.length) {
    throw new Error(`No target agency found: ${agencyError?.message || 'empty result'}`)
  }

  const agency = agencies[0]
  console.log(`Agency selected: ${agency.name} (${agency.id})`)

  const { error: membershipError } = await supabase
    .from('agency_memberships')
    .upsert(
      {
        user_id: targetUserId,
        agency_id: agency.id,
        role: 'owner',
      },
      { onConflict: 'user_id' }
    )

  if (membershipError) {
    throw new Error(`Failed to upsert membership: ${membershipError.message}`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ agency_id: agency.id, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`)
  }

  console.log('User linked successfully in agency_memberships and profiles.')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

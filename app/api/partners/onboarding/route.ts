import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import type { PartnerOnboardingDto } from '@/types/domain'

interface AgencyMembershipRow {
  agency_id: number
  role?: string
}

interface AgencyRow {
  id: number
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeAuth) {
      return NextResponse.json({ error: 'Auth feature is disabled' }, { status: 503 })
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = typeof user.email === 'string' ? user.email : null
    const profileName =
      user.profile && typeof user.profile === 'object' && typeof (user.profile as { name?: unknown }).name === 'string'
        ? ((user.profile as { name?: string }).name ?? null)
        : null

    const body = (await request.json()) as PartnerOnboardingDto
    if (!body.agencyName || !body.agencySlug || !body.city) {
      return NextResponse.json({ error: 'agencyName, agencySlug and city are required' }, { status: 400 })
    }

    // Idempotency: if user is already linked, return current agency.
    const { data: existingMembership } = await database
      .from('agency_memberships')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<AgencyMembershipRow>()

    if (existingMembership?.agency_id) {
      return NextResponse.json({
        agencyId: existingMembership.agency_id,
        membershipRole: existingMembership.role,
      })
    }

    const { data: agency, error: agencyError } = await database
      .from('agencies')
      .insert([
        {
          name: body.agencyName,
          slug: body.agencySlug,
          city: body.city,
          description: body.description || null,
          logo_url: body.logoKey || null,
          tier_subscription: 'basic',
        },
      ])
      .select()
      .single<AgencyRow>()

    if (agencyError || !agency?.id) {
      return NextResponse.json({ error: agencyError?.message || 'Failed to create agency' }, { status: 400 })
    }

    const membershipPayload = {
      agency_id: agency.id,
      user_id: user.id,
      role: 'owner',
    }

    const { error: membershipError } = await database
      .from('agency_memberships')
      .insert([membershipPayload])

    if (membershipError) {
      await database.from('agencies').delete().eq('id', agency.id)
      return NextResponse.json({ error: membershipError.message }, { status: 400 })
    }

    const { error: profileError } = await database
      .from('profiles')
      .upsert([
        {
          id: user.id,
          email: userEmail,
          full_name: profileName || userEmail,
          role: 'owner',
          agency_id: agency.id,
          is_admin: false,
        },
      ])

    if (profileError) {
      await database.from('agency_memberships').delete().eq('user_id', user.id).eq('agency_id', agency.id)
      await database.from('agencies').delete().eq('id', agency.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      agencyId: agency.id,
      membershipRole: 'owner',
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

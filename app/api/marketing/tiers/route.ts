import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'

interface AgencyMembershipRow {
  agency_id: number
}

interface SubscriptionRow extends Record<string, unknown> {
  tier_id?: number
}

type TierRow = Record<string, unknown>

export async function GET() {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeMarketing) {
      return NextResponse.json({ tiers: [], currentSubscription: null, disabled: true })
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    const { data: tiers } = await database
      .from('service_tiers')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (!user?.id) {
      return NextResponse.json({ tiers: tiers || [], currentSubscription: null })
    }

    const { data: membership } = await database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', user.id)
      .maybeSingle<AgencyMembershipRow>()

    if (!membership?.agency_id) {
      return NextResponse.json({ tiers: tiers || [], currentSubscription: null })
    }

    const { data: subscription } = await database
      .from('subscriptions')
      .select('*')
      .eq('agency_id', membership.agency_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle<SubscriptionRow>()

    let tier: TierRow | null = null
    if (subscription?.tier_id) {
      const tierResult = await database
        .from('service_tiers')
        .select('*')
        .eq('id', subscription.tier_id)
        .maybeSingle<TierRow>()
      tier = tierResult.data || null
    }

    return NextResponse.json({
      tiers: tiers || [],
      currentSubscription: subscription ? { ...subscription, tier } : null,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

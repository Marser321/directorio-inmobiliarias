import { NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

interface SubscriptionCheckoutBody {
  tierId?: string
  tier_id?: string
}

interface AgencyMembershipRow {
  agency_id: number
}

interface ExistingSubscriptionRow {
  id: string
  tier_id?: string
  status?: string
}

interface TierRow extends Record<string, unknown> {
  id: string
  name?: string
  price?: number
  currency?: string
  stripe_price_id?: string | null
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeMarketing) {
      return NextResponse.json({ error: 'Marketing feature is disabled' }, { status: 503 })
    }

    const { user } = await getServerUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as SubscriptionCheckoutBody
    const tierId = body.tierId || body.tier_id

    if (!tierId) {
      return NextResponse.json({ error: 'tierId is required' }, { status: 400 })
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)

    const { data: membership } = await database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', user.id)
      .maybeSingle<AgencyMembershipRow>()

    if (!membership?.agency_id) {
      return NextResponse.json({ error: 'User has no agency membership' }, { status: 400 })
    }

    const { data: tier, error: tierError } = await database
      .from('service_tiers')
      .select('*')
      .eq('id', tierId)
      .maybeSingle<TierRow>()

    if (tierError || !tier?.id) {
      return NextResponse.json({ error: tierError?.message || 'Tier not found' }, { status: 404 })
    }

    if (!isStripeConfigured() || !stripe) {
      const { data: existingActive } = await database
        .from('subscriptions')
        .select('id, tier_id, status')
        .eq('agency_id', membership.agency_id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .maybeSingle<ExistingSubscriptionRow>()

      if (existingActive?.id && existingActive.tier_id === tier.id) {
        return NextResponse.json({
          mode: 'simulation',
          success: true,
          existing: true,
          message: 'La agencia ya tiene una suscripción activa en este plan.',
          subscription: existingActive,
        })
      }

      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() + 30)

      const { data: subscription, error } = await database
        .from('subscriptions')
        .insert([
          {
            user_id: user.id,
            tier_id: tier.id,
            status: 'active',
            current_period_end: periodEnd.toISOString(),
            agency_id: membership.agency_id,
          },
        ])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message || 'Failed to create subscription' }, { status: 400 })
      }

      return NextResponse.json({
        mode: 'simulation',
        success: true,
        subscription,
        message: 'Suscripción activada en modo simulación',
      })
    }

    if (!tier.stripe_price_id) {
      return NextResponse.json(
        { error: 'Tier is missing stripe_price_id. Configure service_tiers before live checkout.' },
        { status: 400 }
      )
    }

    const baseUrl = env.appUrl

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      client_reference_id: `subscription:${membership.agency_id}:${tier.id}:${user.id}`,
      line_items: [
        {
          price: tier.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/partners/dashboard/marketing?subscription=success`,
      cancel_url: `${baseUrl}/partners/dashboard/marketing?subscription=cancelled`,
      metadata: {
        checkout_kind: 'subscription',
        agency_id: membership.agency_id.toString(),
        tier_id: tier.id,
        user_id: user.id,
      },
    })

    return NextResponse.json({ mode: 'live', url: session.url })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

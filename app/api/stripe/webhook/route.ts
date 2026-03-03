import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, isStripeConfigured, FEATURED_PRODUCT } from '@/lib/stripe'
import { createAdminClient } from '@/utils/supabase/admin'

type CompatDbClient = ReturnType<typeof createAdminClient>

type ServiceTierRow = {
  id: string
  name?: string | null
}

type ServiceRequestRow = {
  id: string
  details?: Record<string, unknown> | null
}

const LEGACY_CREDIT_PACKS: Record<string, number> = {
  ppl_credits_10: 10,
  ppl_credits_50: 50,
  ppl_credits_100: 100,
}

function normalizeSubscriptionStatus(status: string | null | undefined) {
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled'
  return 'active'
}

function parseIntOrNull(value: string | null | undefined) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

function isDuplicateWebhookError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : ''
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : JSON.stringify(error || {}).toLowerCase()

  return code === '23505' || message.includes('duplicate key')
}

function getCheckoutKind(metadata: Stripe.Metadata | null | undefined) {
  const explicit = metadata?.checkout_kind
  if (explicit) return explicit
  if (metadata?.service_request_id) return 'service_request'
  if (metadata?.tier_id || metadata?.agency_id) return 'subscription'
  if (metadata?.property_id || metadata?.propertyId) return 'featured'
  return 'unknown'
}

function resolveStripePriceId(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return item?.price?.id || null
}

async function registerWebhookEvent(db: CompatDbClient, event: Stripe.Event) {
  const { error } = await db.from('stripe_webhook_events').insert([
    {
      stripe_event_id: event.id,
      event_type: event.type,
    },
  ])

  if (!error) {
    return { duplicate: false, error: null }
  }

  if (isDuplicateWebhookError(error)) {
    return { duplicate: true, error: null }
  }

  return { duplicate: false, error }
}

async function handleFeaturedCheckout(db: CompatDbClient, metadata: Stripe.Metadata) {
  const propertyId = parseIntOrNull(metadata.property_id || metadata.propertyId)
  if (!propertyId) return

  const durationDays = parseIntOrNull(metadata.duration_days || metadata.durationDays) || FEATURED_PRODUCT.durationDays
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  await db
    .from('properties')
    .update({
      is_featured: true,
      featured_until: expiresAt.toISOString(),
      boost_level: 2,
    })
    .eq('id', propertyId)
}

async function handleServiceRequestCheckout(
  db: CompatDbClient,
  session: Stripe.Checkout.Session,
  metadata: Stripe.Metadata
) {
  const serviceRequestId = metadata.service_request_id
  if (!serviceRequestId) return

  const { data: requestRow } = await db
    .from('service_requests')
    .select('id, details')
    .eq('id', serviceRequestId)
    .maybeSingle<ServiceRequestRow>()

  const details = {
    ...(requestRow?.details || {}),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    checkout_completed_at: new Date().toISOString(),
  }

  await db
    .from('service_requests')
    .update({
      status: 'in_progress',
      details,
    })
    .eq('id', serviceRequestId)
}

async function handleLegacyCreditsCheckout(db: CompatDbClient, metadata: Stripe.Metadata) {
  const productType = metadata.product_type
  const userId = metadata.user_id
  const credits = productType ? LEGACY_CREDIT_PACKS[productType] || 0 : 0

  if (!userId || credits <= 0) return

  const { data: profile } = await db
    .from('profiles')
    .select('features')
    .eq('id', userId)
    .maybeSingle<{ features?: Record<string, unknown> | null }>()

  const currentFeatures = (profile?.features || {}) as Record<string, unknown>
  const currentCredits =
    typeof currentFeatures.lead_credits === 'number'
      ? currentFeatures.lead_credits
      : 0

  await db
    .from('profiles')
    .update({
      features: {
        ...currentFeatures,
        lead_credits: currentCredits + credits,
        last_credit_purchase: new Date().toISOString(),
      },
    })
    .eq('id', userId)
}

async function upsertSubscriptionFromStripe(
  db: CompatDbClient,
  subscription: Stripe.Subscription,
  metadata: Stripe.Metadata
) {
  const agencyId = parseIntOrNull(metadata.agency_id)
  const userId = metadata.user_id || null
  const priceId = resolveStripePriceId(subscription)
  const status = normalizeSubscriptionStatus(subscription.status)
  const periodEndEpoch =
    typeof (subscription as unknown as { current_period_end?: number }).current_period_end === 'number'
      ? (subscription as unknown as { current_period_end: number }).current_period_end
      : null
  const periodEnd = periodEndEpoch ? new Date(periodEndEpoch * 1000).toISOString() : null

  let tier: ServiceTierRow | null = null
  if (priceId) {
    const { data } = await db
      .from('service_tiers')
      .select('id, name')
      .eq('stripe_price_id', priceId)
      .maybeSingle<ServiceTierRow>()
    tier = data || null
  }

  if (agencyId) {
    const tierName = (tier?.name || 'basic').toString().toLowerCase()
    await db
      .from('agencies')
      .update({
        tier_subscription: tierName,
      })
      .eq('id', agencyId)
  }

  if (!userId || !tier?.id) return

  const { data: existing } = await db
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle<{ id: string }>()

  if (existing?.id) {
    await db
      .from('subscriptions')
      .update({
        tier_id: tier.id,
        status,
        current_period_end: periodEnd,
        agency_id: agencyId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return
  }

  await db.from('subscriptions').insert([
    {
      user_id: userId,
      tier_id: tier.id,
      status,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd,
      agency_id: agencyId,
    },
  ])
}

async function handleSubscriptionCanceled(db: CompatDbClient, subscription: Stripe.Subscription) {
  const agencyId = parseIntOrNull(subscription.metadata?.agency_id)

  await db
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (agencyId) {
    await db
      .from('agencies')
      .update({
        tier_subscription: 'basic',
      })
      .eq('id', agencyId)
  }
}

async function handlePaymentFailed(db: CompatDbClient, invoice: Stripe.Invoice) {
  const legacySubscription =
    typeof (invoice as unknown as { subscription?: unknown }).subscription === 'string'
      ? ((invoice as unknown as { subscription: string }).subscription)
      : null
  const nestedSubscription =
    typeof (invoice as unknown as { parent?: { subscription_details?: { subscription?: unknown } } }).parent
      ?.subscription_details?.subscription === 'string'
      ? ((invoice as unknown as { parent: { subscription_details: { subscription: string } } }).parent
          .subscription_details.subscription)
      : null
  const subscriptionId = legacySubscription || nestedSubscription
  if (!subscriptionId) return

  await db
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)
}

async function handleCheckoutCompleted(db: CompatDbClient, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  const checkoutKind = getCheckoutKind(metadata)

  if (checkoutKind === 'featured') {
    await handleFeaturedCheckout(db, metadata)
    return
  }

  if (checkoutKind === 'service_request') {
    await handleServiceRequestCheckout(db, session, metadata)
    return
  }

  if (checkoutKind === 'subscription' && typeof session.subscription === 'string') {
    const subscription = await stripe?.subscriptions.retrieve(session.subscription)
    if (subscription) {
      await upsertSubscriptionFromStripe(db, subscription, metadata)
    }
    return
  }

  if (metadata.product_type?.startsWith('ppl_')) {
    await handleLegacyCreditsCheckout(db, metadata)
    return
  }

  // Legacy fallback for old metadata payloads.
  if (metadata.propertyId || metadata.property_id) {
    await handleFeaturedCheckout(db, metadata)
  }
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is missing' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  let db: CompatDbClient
  try {
    db = createAdminClient()
  } catch (error) {
    console.error('Webhook admin client unavailable:', error)
    return NextResponse.json({ error: 'Webhook storage is unavailable' }, { status: 503 })
  }

  const registration = await registerWebhookEvent(db, event)
  if (registration.error) {
    console.error('Failed to register webhook idempotency marker:', registration.error)
    return NextResponse.json({ error: 'Webhook idempotency registration failed' }, { status: 500 })
  }
  if (registration.duplicate) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(db, event.data.object as Stripe.Checkout.Session)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await upsertSubscriptionFromStripe(
          db,
          event.data.object as Stripe.Subscription,
          (event.data.object as Stripe.Subscription).metadata || {}
        )
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionCanceled(db, event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.payment_failed': {
        await handlePaymentFailed(db, event.data.object as Stripe.Invoice)
        break
      }
      default:
        break
    }
  } catch (error: unknown) {
    await db.from('stripe_webhook_events').delete().eq('stripe_event_id', event.id)
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

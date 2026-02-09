import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeConfigured, FEATURED_PRODUCT } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Lazy Supabase admin client (created at runtime, not build time)
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error('Supabase environment variables not configured')
    }

    return createClient(url, key)
}

// Tipos de productos para monetización híbrida
const PRODUCT_TYPES = {
    // VPA: Vendor Paid Advertising (pago único)
    VPA_DRONE_VIDEO: 'vpa_drone_video',
    VPA_TOUR_360: 'vpa_tour_360',
    VPA_FEATURED_WEEK: 'vpa_featured_week',
    VPA_FEATURED_MONTH: 'vpa_featured_month',

    // SaaS: Suscripciones mensuales para inmobiliarias
    SAAS_BASIC: 'saas_basic',
    SAAS_PRO: 'saas_pro',
    SAAS_ENTERPRISE: 'saas_enterprise',

    // Pay-per-Lead: Créditos para profesionales
    PPL_CREDITS_10: 'ppl_credits_10',
    PPL_CREDITS_50: 'ppl_credits_50',
    PPL_CREDITS_100: 'ppl_credits_100'
} as const

export async function POST(request: NextRequest) {
    if (!isStripeConfigured() || !stripe) {
        return NextResponse.json(
            { error: 'Stripe is not configured' },
            { status: 400 }
        )
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        )
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json(
            { error: 'Webhook signature verification failed' },
            { status: 400 }
        )
    }

    const supabase = getSupabaseAdmin()

    try {
        switch (event.type) {
            // ============================================
            // CHECKOUT COMPLETADO
            // ============================================
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                await handleCheckoutComplete(supabase, session)
                break
            }

            // ============================================
            // SUSCRIPCIÓN CREADA/ACTUALIZADA
            // ============================================
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionChange(supabase, subscription)
                break
            }

            // ============================================
            // SUSCRIPCIÓN CANCELADA
            // ============================================
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionCanceled(supabase, subscription)
                break
            }

            // ============================================
            // PAGO FALLIDO
            // ============================================
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                console.log(`Payment failed for customer: ${invoice.customer}`)
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }
    } catch (error) {
        console.error('Webhook handler error:', error)
        return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}

// ============================================
// HANDLER: Checkout Completado
// ============================================
async function handleCheckoutComplete(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    session: Stripe.Checkout.Session
) {
    const { propertyId, durationDays, product_type, user_id } = session.metadata || {}

    // VPA: Destacar propiedad (legacy + nuevos tipos)
    if (propertyId) {
        const days = parseInt(durationDays || FEATURED_PRODUCT.durationDays.toString())
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + days)

        // Determinar boost level según producto
        const boostLevel = product_type === PRODUCT_TYPES.VPA_DRONE_VIDEO ? 3 :
            product_type === PRODUCT_TYPES.VPA_TOUR_360 ? 2 :
                product_type === PRODUCT_TYPES.VPA_FEATURED_MONTH ? 3 : 2

        const { error } = await supabase
            .from('properties')
            .update({
                is_featured: true,
                featured_until: expiresAt.toISOString(),
                boost_level: boostLevel
            })
            .eq('id', parseInt(propertyId))

        if (error) {
            console.error('Failed to update property:', error)
        } else {
            console.log(`Property ${propertyId} featured (boost ${boostLevel}) until ${expiresAt.toISOString()}`)
        }
    }

    // PPL: Agregar créditos de leads
    if (product_type?.startsWith('ppl_') && user_id) {
        const creditsMap: Record<string, number> = {
            [PRODUCT_TYPES.PPL_CREDITS_10]: 10,
            [PRODUCT_TYPES.PPL_CREDITS_50]: 50,
            [PRODUCT_TYPES.PPL_CREDITS_100]: 100
        }
        const credits = creditsMap[product_type] || 0

        if (credits > 0) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('features')
                .eq('id', user_id)
                .single()

            const currentCredits = (profile?.features as Record<string, number>)?.lead_credits || 0

            await supabase
                .from('profiles')
                .update({
                    features: {
                        ...(profile?.features || {}),
                        lead_credits: currentCredits + credits,
                        last_credit_purchase: new Date().toISOString()
                    }
                })
                .eq('id', user_id)

            console.log(`Added ${credits} credits to user ${user_id}`)
        }
    }
}

// ============================================
// HANDLER: Suscripción Creada/Actualizada
// ============================================
async function handleSubscriptionChange(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    subscription: Stripe.Subscription
) {
    const agencyId = subscription.metadata?.agency_id
    if (!agencyId) return

    const priceId = subscription.items.data[0]?.price.id

    // Mapear price ID a tier (configurar en env vars)
    const tierMap: Record<string, string> = {
        [process.env.STRIPE_PRICE_BASIC || '']: 'basic',
        [process.env.STRIPE_PRICE_PRO || '']: 'pro',
        [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise'
    }

    const tier = tierMap[priceId] || 'basic'

    const { error } = await supabase
        .from('agencies')
        .update({
            tier_subscription: tier
        })
        .eq('id', parseInt(agencyId))

    if (error) {
        console.error('Error updating subscription:', error)
    } else {
        console.log(`Agency ${agencyId} subscription updated to ${tier}`)
    }
}

// ============================================
// HANDLER: Suscripción Cancelada
// ============================================
async function handleSubscriptionCanceled(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    subscription: Stripe.Subscription
) {
    const agencyId = subscription.metadata?.agency_id
    if (!agencyId) return

    const { error } = await supabase
        .from('agencies')
        .update({ tier_subscription: 'basic' })
        .eq('id', parseInt(agencyId))

    if (error) {
        console.error('Error downgrading subscription:', error)
    } else {
        console.log(`Agency ${agencyId} downgraded to basic`)
    }
}


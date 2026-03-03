import { NextResponse } from 'next/server'
import { stripe, isStripeConfigured, FEATURED_PRODUCT } from '@/lib/stripe'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

interface FeaturedCheckoutBody {
  propertyId?: number | string
  propertyTitle?: string
}

interface PropertyRow {
  id: number
  agency_id?: number | null
  owner_id?: string | null
  title?: string | null
  is_featured?: boolean
}

interface ProfileRow {
  role?: string
  is_admin?: boolean
}

interface MembershipRow {
  agency_id: number
}

const CHECKOUT_ALIAS_SUNSET = 'Thu, 30 Apr 2026 23:59:59 GMT'

function parsePropertyId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed)
  }
  return null
}

function withDeprecationHeaders(response: NextResponse) {
  response.headers.set('Deprecation', 'true')
  response.headers.set('Sunset', CHECKOUT_ALIAS_SUNSET)
  response.headers.set('Link', '</api/stripe/checkout/featured>; rel="successor-version"')
  return response
}

async function resolveAuthorization(
  userId: string,
  propertyId: number
) {
  const client = await createInsforgeServerClient()
  const database = asCompatDatabase(client.database)

  const { data: property, error: propertyError } = await database
    .from('properties')
    .select('id, agency_id, owner_id, title, is_featured')
    .eq('id', propertyId)
    .maybeSingle<PropertyRow>()

  if (propertyError || !property?.id) {
    return {
      error: NextResponse.json({ error: propertyError?.message || 'Property not found' }, { status: 404 }),
      database,
      property: null,
    }
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    database
      .from('profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .maybeSingle<ProfileRow>(),
    database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', userId)
      .maybeSingle<MembershipRow>(),
  ])

  const isAdmin = Boolean(profile?.is_admin || profile?.role === 'platform_admin')
  const isOwner = property.owner_id === userId
  const sameAgency = Boolean(
    membership?.agency_id && property.agency_id && membership.agency_id === property.agency_id
  )

  if (!isAdmin && !isOwner && !sameAgency) {
    return {
      error: NextResponse.json({ error: 'Forbidden property scope' }, { status: 403 }),
      database,
      property: null,
    }
  }

  return {
    error: null,
    database,
    property,
  }
}

export async function createFeaturedCheckout(
  request: Request,
  options: { deprecatedAlias?: boolean } = {}
) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeProperties) {
      const response = NextResponse.json({ error: 'Properties feature is disabled' }, { status: 503 })
      return options.deprecatedAlias ? withDeprecationHeaders(response) : response
    }

    const { user } = await getServerUser()
    if (!user?.id) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return options.deprecatedAlias ? withDeprecationHeaders(response) : response
    }

    const body = (await request.json()) as FeaturedCheckoutBody
    const propertyId = parsePropertyId(body.propertyId)
    if (!propertyId) {
      const response = NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
      return options.deprecatedAlias ? withDeprecationHeaders(response) : response
    }

    const authz = await resolveAuthorization(user.id, propertyId)
    if (authz.error || !authz.property) {
      const response = authz.error || NextResponse.json({ error: 'Property not found' }, { status: 404 })
      return options.deprecatedAlias ? withDeprecationHeaders(response) : response
    }

    if (!isStripeConfigured() || !stripe) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + FEATURED_PRODUCT.durationDays)

      const { error } = await authz.database
        .from('properties')
        .update({
          is_featured: true,
          featured_until: expiresAt.toISOString(),
          boost_level: 2,
        })
        .eq('id', propertyId)

      if (error) {
        const response = NextResponse.json({ error: error.message }, { status: 400 })
        return options.deprecatedAlias ? withDeprecationHeaders(response) : response
      }

      const response = NextResponse.json({
        mode: 'simulation',
        success: true,
        message: `Propiedad destacada por ${FEATURED_PRODUCT.durationDays} días (modo simulación)`,
        expiresAt: expiresAt.toISOString(),
      })
      return options.deprecatedAlias ? withDeprecationHeaders(response) : response
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: FEATURED_PRODUCT.name,
              description: `${body.propertyTitle || authz.property.title || 'Propiedad'} - ${FEATURED_PRODUCT.description}`,
            },
            unit_amount: FEATURED_PRODUCT.priceUsd,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.appUrl}/partners/dashboard?featured=success&propertyId=${propertyId}`,
      cancel_url: `${env.appUrl}/partners/dashboard?featured=cancelled`,
      client_reference_id: `featured:${propertyId}:${user.id}`,
      metadata: {
        checkout_kind: 'featured',
        property_id: String(propertyId),
        agency_id: String(authz.property.agency_id || ''),
        user_id: user.id,
        duration_days: String(FEATURED_PRODUCT.durationDays),
      },
    })

    const response = NextResponse.json({
      mode: 'live',
      url: session.url,
    })

    return options.deprecatedAlias ? withDeprecationHeaders(response) : response
  } catch (error: unknown) {
    const response = NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create featured checkout session') },
      { status: 500 }
    )
    return options.deprecatedAlias ? withDeprecationHeaders(response) : response
  }
}

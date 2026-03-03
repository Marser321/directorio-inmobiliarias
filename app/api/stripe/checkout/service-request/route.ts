import { NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

interface ServiceRequestCheckoutBody {
  type?: string
  details?: Record<string, unknown>
  priceId?: string
  price_id?: string
  requestId?: string
  request_id?: string
}

interface AgencyMembershipRow {
  agency_id: number
}

interface ServiceRequestRow extends Record<string, unknown> {
  id: string
  type?: string
  user_id?: string
  agency_id?: number
  status?: string
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

    const body = (await request.json()) as ServiceRequestCheckoutBody
    const type = body.type

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
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

    const existingRequestId = body.requestId || body.request_id
    let requestRow: ServiceRequestRow | null = null

    if (existingRequestId) {
      const { data: existingRequest, error: existingError } = await database
        .from('service_requests')
        .select('*')
        .eq('id', existingRequestId)
        .eq('user_id', user.id)
        .eq('agency_id', membership.agency_id)
        .maybeSingle<ServiceRequestRow>()

      if (existingError || !existingRequest?.id) {
        return NextResponse.json({ error: existingError?.message || 'Service request not found' }, { status: 404 })
      }
      if (existingRequest.type && existingRequest.type !== type) {
        return NextResponse.json({ error: 'Existing request type does not match checkout payload' }, { status: 400 })
      }

      requestRow = existingRequest
    } else {
      const { data: createdRequest, error } = await database
        .from('service_requests')
        .insert([
          {
            user_id: user.id,
            agency_id: membership.agency_id,
            type,
            details: body.details || {},
            status: 'pending',
          },
        ])
        .select()
        .single<ServiceRequestRow>()

      if (error || !createdRequest?.id) {
        return NextResponse.json({ error: error?.message || 'Failed to create service request' }, { status: 400 })
      }

      requestRow = createdRequest
    }

    if (!requestRow?.id) {
      return NextResponse.json({ error: 'Failed to resolve service request' }, { status: 400 })
    }

    const priceId = body.priceId || body.price_id

    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json({
        mode: 'simulation',
        success: true,
        request: requestRow,
        message: 'Solicitud creada en modo simulación',
      })
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'priceId is required for live checkout' },
        { status: 400 }
      )
    }

    const baseUrl = env.appUrl

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      client_reference_id: `service_request:${requestRow.id}:${user.id}`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/partners/dashboard/marketing?service=success`,
      cancel_url: `${baseUrl}/partners/dashboard/marketing?service=cancelled`,
      metadata: {
        checkout_kind: 'service_request',
        agency_id: membership.agency_id.toString(),
        service_request_id: String(requestRow.id),
        user_id: user.id,
        service_type: type,
      },
    })

    return NextResponse.json({ mode: 'live', url: session.url, request: requestRow })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

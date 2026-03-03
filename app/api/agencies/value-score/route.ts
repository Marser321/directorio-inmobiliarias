import { NextResponse } from 'next/server'
import { createClient } from '@/lib/insforge/compat-supabase'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { buildAgencyValueScore } from '@/lib/scoring/agency-value'
import { getErrorMessage } from '@/lib/insforge/compat'

type AgencyRow = {
  id: number
  name: string | null
  tagline: string | null
  description: string | null
  website: string | null
  contact_phone: string | null
  whatsapp: string | null
  logo_url: string | null
  cover_image_url: string | null
  social_links: Record<string, unknown> | null
  is_verified: boolean
  avg_response_time: number | null
}

type PropertyRow = {
  id: number
  agency_id: number
  price: number | null
  status: string | null
}

type CommissionRow = {
  operation_type: 'sale' | 'rent'
  commission_model: 'percent' | 'fixed' | 'mixed'
  commission_percent: number | null
  commission_fixed_amount: number | null
  currency: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  is_public: boolean
}

function parsePositiveInt(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.trunc(parsed)
}

function isMissingTableError(error: { message?: string; code?: string } | null | undefined, table: string) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  return (
    code === '42p01' ||
    (code.startsWith('pgrst') && message.includes(table.toLowerCase()) && message.includes('table')) ||
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`relation 'public.${table}' does not exist`) ||
    message.includes(`could not find the '${table}' table`)
  )
}

export async function GET(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureAgencyValueScore) {
      return NextResponse.json({ error: 'Agency value score feature is disabled' }, { status: 503 })
    }

    const url = new URL(request.url)
    const agencyId = parsePositiveInt(url.searchParams.get('agencyId'))
    const propertyId = parsePositiveInt(url.searchParams.get('propertyId'))

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId is required' }, { status: 400 })
    }

    const database = createClient(env.baseUrl, env.anonKey)
    const { data: agency, error: agencyError } = await database
      .from('agencies')
      .select(
        'id,name,tagline,description,website,contact_phone,whatsapp,logo_url,cover_image_url,social_links,is_verified,avg_response_time'
      )
      .eq('id', agencyId)
      .maybeSingle<AgencyRow>()

    if (agencyError) {
      return NextResponse.json({ error: agencyError.message || 'Failed to load agency' }, { status: 400 })
    }
    if (!agency?.id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    let property: PropertyRow | null = null
    if (propertyId) {
      const { data: propertyRow, error: propertyError } = await database
        .from('properties')
        .select('id,agency_id,price,status')
        .eq('id', propertyId)
        .maybeSingle<PropertyRow>()

      if (propertyError) {
        return NextResponse.json({ error: propertyError.message || 'Failed to load property' }, { status: 400 })
      }

      if (propertyRow?.id && propertyRow.agency_id === agencyId) {
        property = propertyRow
      }
    }

    const operationType = property?.status === 'for_rent' ? 'rent' : 'sale'
    let commissionProfile: CommissionRow | null = null

    const { data: commissionRow, error: commissionError } = await database
      .from('agency_commission_profiles')
      .select(
        'operation_type,commission_model,commission_percent,commission_fixed_amount,currency,verification_status,is_public'
      )
      .eq('agency_id', agencyId)
      .eq('operation_type', operationType)
      .eq('is_public', true)
      .maybeSingle<CommissionRow>()

    if (commissionError && !isMissingTableError(commissionError, 'agency_commission_profiles')) {
      return NextResponse.json({ error: commissionError.message || 'Failed to load commission profile' }, { status: 400 })
    }
    if (commissionRow) {
      commissionProfile = commissionRow
    }

    const score = buildAgencyValueScore({
      agency: {
        agency_id: agency.id,
        is_verified: agency.is_verified === true,
        avg_response_time: typeof agency.avg_response_time === 'number' ? agency.avg_response_time : null,
        name: agency.name,
        tagline: agency.tagline,
        description: agency.description,
        website: agency.website,
        contact_phone: agency.contact_phone,
        whatsapp: agency.whatsapp,
        logo_url: agency.logo_url,
        cover_image_url: agency.cover_image_url,
        social_links: agency.social_links || {},
      },
      commissionProfile,
      propertyId: property?.id || null,
      propertyPrice: typeof property?.price === 'number' ? property.price : null,
    })

    return NextResponse.json({ data: score })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

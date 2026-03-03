import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { createInsforgeClient } from '@/lib/insforge/client'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

const leadSchema = z.object({
  property_id: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().max(180).optional(),
  message: z.string().trim().max(1200).optional(),
  source: z.enum(['property_detail', 'search_result']),
  session_id: z.string().trim().min(6).max(120).optional(),
  page_path: z.string().trim().max(300).optional(),
})

interface PropertyRow {
  id: number
  agency_id: number | null
  title: string
}

function isMissingTableError(error: { message?: string; code?: string } | null | undefined, table: string) {
  const message = error?.message?.toLowerCase() || ''
  const code = (error as { code?: string } | null | undefined)?.code?.toLowerCase() || ''
  const serialized = JSON.stringify(error || {}).toLowerCase()
  const haystack = `${message} ${serialized}`
  const normalized = table.toLowerCase()
  return (
    haystack.includes(`relation "${normalized}" does not exist`) ||
    haystack.includes(`relation '${normalized}' does not exist`) ||
    haystack.includes(`relation ${normalized} does not exist`) ||
    haystack.includes(`relation "public.${normalized}" does not exist`) ||
    haystack.includes(`relation 'public.${normalized}' does not exist`) ||
    haystack.includes(`relation public.${normalized} does not exist`) ||
    haystack.includes(`could not find the '${normalized}' table`) ||
    haystack.includes(`could not find the "${normalized}" table`) ||
    haystack.includes(`'${normalized}' table of`) ||
    code === '42p01' ||
    (code.startsWith('pgrst') && haystack.includes(normalized) && haystack.includes('table'))
  )
}

function isEmptyErrorObject(error: unknown) {
  return typeof error === 'object' && error !== null && Object.keys(error as Record<string, unknown>).length === 0
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureLeadFormFallback) {
      return NextResponse.json({ error: 'Lead form fallback is disabled' }, { status: 503 })
    }

    const payload = await request.json()
    const parsed = leadSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid lead payload', issues: parsed.error.issues }, { status: 400 })
    }

    const client = createInsforgeClient()
    const database = asCompatDatabase(client.database)

    const { data: property, error: propertyError } = await database
      .from('properties')
      .select('id, agency_id, title')
      .eq('id', parsed.data.property_id)
      .maybeSingle<PropertyRow>()

    if (propertyError || !property?.id) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const leadId = randomUUID()
    const leadInsert = {
      id: leadId,
      property_id: parsed.data.property_id,
      agency_id: property.agency_id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      message: parsed.data.message || null,
      source: parsed.data.source,
      status: 'pending',
    }

    const { error } = await database
      .from('property_leads')
      .insert([leadInsert])

    if (error) {
      let missingPropertyLeads = isMissingTableError(error, 'property_leads')
      if (!missingPropertyLeads && isEmptyErrorObject(error)) {
        const probe = await database.from('property_leads').select('id').limit(1)
        missingPropertyLeads = isMissingTableError(
          probe.error as { message?: string; code?: string } | null | undefined,
          'property_leads'
        )
      }

      if (!missingPropertyLeads) {
        return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Failed to create lead' }, { status: 400 })
      }

      const fallbackId = `lead-fallback-${Date.now().toString(36)}`
      if (env.featureFunnelEvents && parsed.data.session_id) {
        await database.from('user_funnel_events').insert([
          {
            session_id: parsed.data.session_id,
            event_name: 'lead_form_submitted',
            page_path: parsed.data.page_path || '/property',
            property_id: parsed.data.property_id,
            agency_id: property.agency_id,
            metadata: {
              source: parsed.data.source,
              degraded_mode: true,
              storage_error: 'missing_property_leads',
            },
          },
        ])
      }

      return NextResponse.json({ id: fallbackId, status: 'pending' }, { status: 201 })
    }

    if (env.featureFunnelEvents && parsed.data.session_id) {
      await database.from('user_funnel_events').insert([
        {
          session_id: parsed.data.session_id,
          event_name: 'lead_form_submitted',
          page_path: parsed.data.page_path || '/property',
          property_id: parsed.data.property_id,
          agency_id: property.agency_id,
          metadata: {
            source: parsed.data.source,
          },
        },
      ])
    }

    return NextResponse.json({ id: leadId, status: 'pending' }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

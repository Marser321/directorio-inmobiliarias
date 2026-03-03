import { NextResponse } from 'next/server'
import { createInsforgeClient } from '@/lib/insforge/client'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'

interface IngestPropertyPayload {
  title?: string
  source?: string
  price?: number
  currency?: string
  url?: string
  images?: string[]
  address?: string
  location?: string
  city?: string
  description?: string
  builtArea?: number
  landArea?: number
  contactName?: string
  contactPhone?: string
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeScraper) {
      return NextResponse.json({ error: 'Scraper feature is disabled' }, { status: 503 })
    }

    const body = await request.json()
    const { agencyId, properties, status, jobId, callbackAccessToken } = body as {
      agencyId?: number | string
      properties?: IngestPropertyPayload[]
      status?: string
      jobId?: string
      callbackAccessToken?: string
    }

    if (env.n8nSharedSecret) {
      const incomingSecret = request.headers.get('x-webhook-secret')
      if (incomingSecret !== env.n8nSharedSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
      }
    }

    const normalizedAgencyId = Number(agencyId)
    if (!Array.isArray(properties) || !Number.isFinite(normalizedAgencyId) || normalizedAgencyId <= 0) {
      return NextResponse.json({ error: 'Invalid payload. agencyId and properties[] are required' }, { status: 400 })
    }

    const accessToken = typeof callbackAccessToken === 'string' && callbackAccessToken.length > 0
      ? callbackAccessToken
      : request.headers.get('x-callback-access-token') || undefined

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing callback access token' }, { status: 401 })
    }

    const client = createInsforgeClient({ accessToken })
    const database = asCompatDatabase(client.database)

    if (jobId) {
      await database
        .from('scraping_jobs')
        .update({
          status: status || 'processing',
          records_found: properties.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    const payload = properties.map((property) => ({
      agency_id: normalizedAgencyId,
      source: property.source || 'other',
      original_url: property.url,
      url: property.url,
      title: property.title || 'Sin titulo',
      address: property.address || property.location || null,
      city: property.city || 'Unknown',
      listed_price: property.price || 0,
      currency: property.currency || 'USD',
      images: property.images || [],
      description: property.description || null,
      built_area: property.builtArea || null,
      land_area: property.landArea || null,
      status: 'new',
      owner_name: property.contactName || null,
      owner_phone: property.contactPhone || null,
      meta: {
        scraped_at: new Date().toISOString(),
      },
    }))

    const { error } = await database
      .from('prospect_properties')
      .upsert(payload, {
        onConflict: 'original_url',
        ignoreDuplicates: false,
      })

    if (error) {
      if (jobId) {
        await database
          .from('scraping_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (jobId) {
      await database
        .from('scraping_jobs')
        .update({
          status: status || 'completed',
          records_ingested: properties.length,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    return NextResponse.json({
      success: true,
      upserted: properties.length,
      failed: 0,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { getInsforgeAccessToken } from '@/lib/insforge/cookies'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'
import type { ScraperJobCreateDto } from '@/types/domain'

interface AgencyMembershipRow {
  agency_id: number
}

interface ScrapingJobRow {
  id: string
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeScraper) {
      return NextResponse.json({ error: 'Scraper feature is disabled' }, { status: 503 })
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)
    const { user } = await getServerUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as ScraperJobCreateDto
    if (!body.portalUrl || !body.source || !body.agencyId) {
      return NextResponse.json({ error: 'portalUrl, source and agencyId are required' }, { status: 400 })
    }

    const agencyId = Number(body.agencyId)
    if (!Number.isFinite(agencyId) || agencyId <= 0) {
      return NextResponse.json({ error: 'agencyId must be a valid positive number' }, { status: 400 })
    }

    const { data: membership } = await database
      .from('agency_memberships')
      .select('agency_id')
      .eq('user_id', user.id)
      .eq('agency_id', agencyId)
      .maybeSingle<AgencyMembershipRow>()

    if (!membership?.agency_id) {
      return NextResponse.json({ error: 'Forbidden agency scope' }, { status: 403 })
    }

    const callbackAccessToken = await getInsforgeAccessToken()
    if (!callbackAccessToken) {
      return NextResponse.json({ error: 'Missing active session token for scraper callback' }, { status: 401 })
    }

    const { data: job, error: jobError } = await database
      .from('scraping_jobs')
      .insert([
        {
          agency_id: agencyId,
          requested_by: user.id,
          portal_url: body.portalUrl,
          source: body.source,
          status: 'pending',
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single<ScrapingJobRow>()

    if (jobError || !job?.id) {
      return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 400 })
    }

    if (!env.n8nScraperWebhookUrl) {
      return NextResponse.json({ jobId: job.id, status: 'pending', warning: 'N8N webhook URL is not configured' })
    }

    const webhookResponse = await fetch(env.n8nScraperWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': env.n8nSharedSecret,
      },
      body: JSON.stringify({
        jobId: job.id,
        agencyId,
        source: body.source,
        portalUrl: body.portalUrl,
        callbackUrl: `${env.appUrl}/api/webhooks/ingest-properties`,
        callbackSecret: env.n8nSharedSecret,
        callbackAccessToken,
      }),
    })

    if (!webhookResponse.ok) {
      await database
        .from('scraping_jobs')
        .update({ status: 'failed', error_message: 'n8n dispatch failed' })
        .eq('id', job.id)

      return NextResponse.json({ error: 'Failed to dispatch scraper job' }, { status: 502 })
    }

    await database
      .from('scraping_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id)

    return NextResponse.json({ jobId: job.id, status: 'processing' })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

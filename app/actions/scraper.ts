'use server'

import { revalidatePath } from 'next/cache'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatDatabase, getErrorMessage } from '@/lib/insforge/compat'

interface AgencyMembershipRow {
    agency_id: number
}

interface ScrapingJobRow {
    id: string
}

export async function triggerScraper(agencyUrl: string) {
    const env = getInsforgeEnv()
    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)

    try {
        if (!env.featureInsforgeScraper) {
            return { success: false, message: 'Scraper feature flag is disabled' }
        }

        const { user } = await getServerUser()
        if (!user) throw new Error('Unauthorized')

        const { data: membership } = await database
            .from('agency_memberships')
            .select('agency_id')
            .eq('user_id', user.id)
            .maybeSingle<AgencyMembershipRow>()

        if (!membership?.agency_id) {
            throw new Error('User has no agency membership')
        }

        const { data: job, error: jobError } = await database
            .from('scraping_jobs')
            .insert([{
                agency_id: membership.agency_id,
                requested_by: user.id,
                portal_url: agencyUrl,
                source: 'manual',
                status: 'pending',
                records_found: 0,
                records_ingested: 0,
                started_at: new Date().toISOString(),
            }])
            .select()
            .single<ScrapingJobRow>()

        if (jobError) throw new Error(jobError.message)
        if (!job?.id) throw new Error('Failed to create scraping job')

        const response = await fetch(`${env.appUrl}/api/scraper/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                portalUrl: agencyUrl,
                source: 'manual',
                agencyId: membership.agency_id,
            })
        })

        if (!response.ok) {
            await database
                .from('scraping_jobs')
                .update({ status: 'failed', error_message: 'n8n connection failed' })
                .eq('id', job.id)
            throw new Error('Failed to trigger n8n workflow')
        }

        revalidatePath('/admin/scraper')
        return { success: true, message: 'Scraping started', logId: job.id }

    } catch (error: unknown) {
        console.error('Scraper Action Error:', error)
        return { success: false, message: getErrorMessage(error, 'Failed to trigger scraper') }
    }
}

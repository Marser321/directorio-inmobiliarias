import { NextResponse } from 'next/server'
import { createClient } from '@/lib/insforge/compat-supabase'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { getErrorMessage } from '@/lib/insforge/compat'
import { sendMetaWhatsappPropertyAlert } from '@/lib/whatsapp/meta'
import { createAdminClient } from '@/utils/supabase/admin'

type SavedSearchRow = {
  id: string
  user_id: string
  name: string
  filters: Record<string, unknown>
  phone_e164: string
}

type SearchProperty = {
  id: number
  title: string
  slug: string | null
  price: number
  currency: string | null
  bedrooms: number | null
  bathrooms: number | null
  status: string
  main_image: string | null
  location?: {
    name?: string | null
  } | null
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toPriceLabel(price: number, currency: string | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function isUniqueViolation(error: { message?: string; code?: string } | null | undefined) {
  const code = error?.code?.toLowerCase() || ''
  const message = error?.message?.toLowerCase() || ''
  return code === '23505' || message.includes('duplicate key')
}

async function findMatchingProperties(filters: Record<string, unknown>, maxRows = 8) {
  const env = getInsforgeEnv()
  const supabase = createClient(env.baseUrl, env.anonKey)
  let query = supabase
    .from('properties')
    .select('id, title, slug, price, currency, bedrooms, bathrooms, status, main_image, location:locations(name)')
    .in('status', ['for_sale', 'for_rent'])
    .order('created_at', { ascending: false })
    .limit(maxRows)

  const q = asText(filters.query || filters.q)
  if (q) {
    const escaped = q.replace(/[%_]/g, '').replace(/[(),]/g, ' ').trim()
    if (escaped) query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
  }

  const status = asText(filters.status)
  if (status === 'for_sale' || status === 'for_rent') query = query.eq('status', status)

  const priceMin = asNumber(filters.priceMin ?? filters.price_min)
  if (priceMin !== null) query = query.gte('price', priceMin)

  const priceMax = asNumber(filters.priceMax ?? filters.price_max)
  if (priceMax !== null) query = query.lte('price', priceMax)

  const bedrooms = asNumber(filters.bedrooms)
  if (bedrooms !== null) query = query.gte('bedrooms', bedrooms)

  const bathrooms = asNumber(filters.bathrooms)
  if (bathrooms !== null) query = query.gte('bathrooms', bathrooms)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message || 'Failed to evaluate saved search')
  }

  return (data || []) as SearchProperty[]
}

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureSavedSearch || !env.featureWhatsappAlerts) {
      return NextResponse.json({ error: 'Alerts feature is disabled' }, { status: 503 })
    }

    const secret = request.headers.get('x-cron-secret') || ''
    if (!env.alertsCronSecret || secret !== env.alertsCronSecret) {
      return NextResponse.json({ error: 'Unauthorized run request' }, { status: 401 })
    }

    let database: ReturnType<typeof createAdminClient>
    try {
      database = createAdminClient()
    } catch (error: unknown) {
      return NextResponse.json({ error: getErrorMessage(error, 'Admin client is not configured') }, { status: 503 })
    }

    const { data: savedSearches, error: savedSearchesError } = await database
      .from('saved_searches')
      .select('id, user_id, name, filters, phone_e164')
      .eq('is_active', true)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(100)

    if (savedSearchesError) {
      return NextResponse.json({ error: savedSearchesError.message || 'Failed to load saved searches' }, { status: 400 })
    }

    let searchesEvaluated = 0
    let alertsSent = 0
    let alertsFailed = 0
    let skippedDuplicates = 0

    for (const savedSearch of ((savedSearches || []) as SavedSearchRow[])) {
      searchesEvaluated += 1

      const matches = await findMatchingProperties(savedSearch.filters || {}, 8)
      for (const property of matches) {
        const { data: insertedDelivery, error: insertDeliveryError } = await database
          .from('search_alert_deliveries')
          .insert([
            {
              saved_search_id: savedSearch.id,
              property_id: property.id,
              channel: 'whatsapp',
              status: 'queued',
            },
          ])
          .select('id')
          .maybeSingle<{ id: string }>()

        if (insertDeliveryError) {
          if (isUniqueViolation(insertDeliveryError)) {
            skippedDuplicates += 1
            continue
          }
          alertsFailed += 1
          continue
        }

        if (!insertedDelivery?.id) {
          alertsFailed += 1
          continue
        }

        const propertyUrl = `${env.appUrl}/property/${property.slug || property.id}`
        const sendResult = await sendMetaWhatsappPropertyAlert({
          to: savedSearch.phone_e164,
          propertyTitle: property.title,
          propertyPrice: toPriceLabel(property.price, property.currency),
          propertyUrl,
          locationName: property.location?.name || 'Punta del Este',
        })

        const nextStatus = sendResult.ok ? 'sent' : 'failed'
        const updateDelivery = await database
          .from('search_alert_deliveries')
          .update({
            status: nextStatus,
            provider_message_id: sendResult.providerMessageId,
            error_message: sendResult.error,
          })
          .eq('id', insertedDelivery.id)

        if (updateDelivery.error) {
          alertsFailed += 1
          continue
        }

        if (sendResult.ok) {
          alertsSent += 1
          await database.from('user_funnel_events').insert([
            {
              session_id: `saved-search-${savedSearch.id}`,
              event_name: 'whatsapp_alert_sent',
              page_path: '/api/alerts/run',
              property_id: property.id,
              agency_id: null,
              metadata: {
                saved_search_id: savedSearch.id,
                search_name: savedSearch.name,
                channel: 'whatsapp',
              },
            },
          ])
        } else {
          alertsFailed += 1
        }
      }

      await database
        .from('saved_searches')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', savedSearch.id)
    }

    return NextResponse.json({
      ok: true,
      searchesEvaluated,
      alertsSent,
      alertsFailed,
      skippedDuplicates,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

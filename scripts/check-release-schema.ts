import { config } from 'dotenv'

config({ path: '.env.local' })

import { createClient } from '@/lib/insforge/compat-supabase'

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL
const keyCandidates = [
  process.env.INSFORGE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.INSFORGE_ADMIN_API_KEY,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
const runtimeKey = keyCandidates[0] || null

if (!baseUrl || !runtimeKey) {
  console.error(
    'Missing schema-check credentials. Required: NEXT_PUBLIC_INSFORGE_BASE_URL (or INSFORGE_BASE_URL) plus admin key'
  )
  process.exit(1)
}

const client = createClient(baseUrl, runtimeKey)

type SchemaCheck = {
  table: string
  select: string
}

const RELEASE_CONTRACT_CHECKS: SchemaCheck[] = [
  { table: 'properties', select: 'id,publication_status,location_lat,location_lng,location_point_geojson' },
  { table: 'property_media', select: 'id,property_id,media_type,url,display_order,is_primary,key,metadata' },
  { table: 'search_queries', select: 'id,query,results_count,created_at' },
  { table: 'service_tiers', select: 'id,name,price,currency,is_active,stripe_price_id' },
  { table: 'vibe_scores', select: 'id,property_id,zone_name,noise_score,safety_score,wind_score,nightlife_score' },
  { table: 'stripe_webhook_events', select: 'id,stripe_event_id,event_type,processed_at' },
]

async function checkTableContract(check: SchemaCheck) {
  const { error } = await client.from(check.table).select(check.select).limit(1)

  if (error) {
    throw new Error(`${check.table}: ${error.message}`)
  }
}

async function main() {
  const failures: string[] = []

  for (const check of RELEASE_CONTRACT_CHECKS) {
    try {
      await checkTableContract(check)
      console.log(`OK: ${check.table}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(message)
      console.error(`FAIL: ${message}`)
    }
  }

  if (failures.length > 0) {
    console.error('\nRelease schema contract failed. Missing critical tables/columns:')
    for (const failure of failures) {
      console.error(` - ${failure}`)
    }
    process.exit(1)
  }

  console.log('\nRelease schema contract check passed.')
}

void main()

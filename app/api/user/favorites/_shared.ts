import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

export async function resolveFavoritesScope() {
  const env = getInsforgeEnv()
  if (!env.featureFavoritesSync) {
    return {
      error: NextResponse.json({ error: 'Favorites sync feature is disabled' }, { status: 503 }),
      database: null,
      userId: null,
    }
  }

  const client = await createInsforgeServerClient()
  const database = asCompatDatabase(client.database)
  const { user } = await getServerUser()
  const userId = typeof user?.id === 'string' ? user.id : null
  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      database: null,
      userId: null,
    }
  }

  return {
    error: null,
    database,
    userId,
  }
}

export function parsePropertyId(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

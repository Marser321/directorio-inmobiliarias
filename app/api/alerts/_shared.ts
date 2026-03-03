import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase } from '@/lib/insforge/compat'
import { getInsforgeEnv } from '@/lib/insforge/env'

export async function resolveAlertsScope() {
  const env = getInsforgeEnv()
  if (!env.featureSavedSearch) {
    return {
      error: NextResponse.json({ error: 'Saved search feature is disabled' }, { status: 503 }),
      database: null,
      userId: null,
      env,
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
      env,
    }
  }

  return {
    error: null,
    database,
    userId,
    env,
  }
}

export function normalizePhoneE164(value: string) {
  const normalized = value.replace(/[^\d+]/g, '')
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null
}

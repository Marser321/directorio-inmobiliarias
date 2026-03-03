import { NextResponse } from 'next/server'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase } from '@/lib/insforge/compat'
import { createAdminClient } from '@/utils/supabase/admin'
import { parseBooleanEnv } from '@/lib/env/normalize'

const DEBUG_ROUTE_FLAG = parseBooleanEnv(process.env.FEATURE_DEBUG_USERS_ROUTE, false).value

async function requireAdminSession() {
  const { user } = await getServerUser()
  if (!user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const client = await createInsforgeServerClient()
  const database = asCompatDatabase(client.database)

  const { data: profile } = await database
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle<{ is_admin?: boolean; role?: string }>()

  const isAdmin = Boolean(profile?.is_admin || profile?.role === 'platform_admin')
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { error: null }
}

async function handleDebugUsers() {
  if (!DEBUG_ROUTE_FLAG) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const authCheck = await requireAdminSession()
  if (authCheck.error) return authCheck.error

  try {
    const adminClient = createAdminClient()
    const {
      data: { users },
      error,
    } = await adminClient.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Debug route is unavailable'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}

export async function POST() {
  return handleDebugUsers()
}

export async function GET() {
  return handleDebugUsers()
}

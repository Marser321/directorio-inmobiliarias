'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const IMPERSONATION_DISABLED_MESSAGE =
  'Impersonation is disabled until InsForge provides a supported admin flow for this project.'

async function checkSuperAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single<{ is_admin?: boolean; role?: string }>()

  const isAdmin = Boolean(profile?.is_admin || profile?.role === 'platform_admin')
  if (!isAdmin) throw new Error('Forbidden: Admin access required')

  return user
}

function getAdminClientOrNull() {
  try {
    return createAdminClient()
  } catch (error) {
    console.error('Admin client unavailable:', error)
    return null
  }
}

export async function logAdminAction(action: string, targetResource: string, details?: Record<string, unknown>) {
  try {
    const user = await checkSuperAdmin()
    const adminClient = getAdminClientOrNull()
    if (!adminClient) return

    await adminClient.from('admin_logs').insert({
      admin_id: user.id,
      action,
      target_resource: targetResource,
      details: details || null,
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

export async function impersonateUser(userId: string) {
  try {
    await checkSuperAdmin()
    await logAdminAction('impersonation_blocked', `user:${userId}`, {
      reason: IMPERSONATION_DISABLED_MESSAGE,
    })

    return { success: false, error: IMPERSONATION_DISABLED_MESSAGE }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to impersonate user'
    return { success: false, error: message }
  }
}

import { NextResponse } from 'next/server'
import { clearInsforgeAccessCookie, getInsforgeAccessToken } from '@/lib/insforge/cookies'
import { createInsforgeClient } from '@/lib/insforge/client'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatAuth } from '@/lib/insforge/compat'

export async function POST() {
  const env = getInsforgeEnv()
  if (!env.featureInsforgeAuth) {
    return NextResponse.json({ success: true })
  }

  const accessToken = await getInsforgeAccessToken()

  if (accessToken) {
    const client = createInsforgeClient({ accessToken })
    const auth = asCompatAuth(client.auth)
    try {
      if (auth.signOut) {
        await auth.signOut()
      }
    } catch {
      // Ignore provider sign-out failures. Cookie cleanup is the source of truth.
    }
  }

  await clearInsforgeAccessCookie()
  return NextResponse.json({ success: true })
}

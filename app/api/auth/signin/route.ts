import { NextResponse } from 'next/server'
import { createInsforgeClient } from '@/lib/insforge/client'
import { setInsforgeAccessCookie } from '@/lib/insforge/cookies'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatAuth, getErrorMessage } from '@/lib/insforge/compat'
import type { AuthSigninDto } from '@/types/domain'

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeAuth) {
      return NextResponse.json({ error: 'Auth feature is disabled' }, { status: 503 })
    }

    const body = (await request.json()) as AuthSigninDto

    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const client = createInsforgeClient()
    const auth = asCompatAuth(client.auth)
    const signInResponse = auth.signInWithPassword
      ? await auth.signInWithPassword({
          email: body.email,
          password: body.password,
        })
      : { data: null, error: { message: 'signInWithPassword is not available' } }

    const { data, error } = signInResponse
    const signInData = data as
      | { accessToken?: string; user?: Record<string, unknown>; redirectTo?: string }
      | null

    if (error || !signInData?.accessToken) {
      return NextResponse.json({ error: error?.message || 'Invalid login credentials' }, { status: 401 })
    }

    await setInsforgeAccessCookie(signInData.accessToken)

    return NextResponse.json({
      user: signInData.user,
      accessToken: signInData.accessToken,
      redirectTo: signInData.redirectTo || '/partners/dashboard',
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

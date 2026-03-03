import { NextResponse } from 'next/server'
import { createInsforgeClient } from '@/lib/insforge/client'
import { setInsforgeAccessCookie } from '@/lib/insforge/cookies'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatAuth, getErrorMessage } from '@/lib/insforge/compat'
import type { AuthVerifyOtpDto } from '@/types/domain'

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeAuth) {
      return NextResponse.json({ error: 'Auth feature is disabled' }, { status: 503 })
    }

    const body = (await request.json()) as AuthVerifyOtpDto

    if (!body.otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 })
    }

    const client = createInsforgeClient()
    const auth = asCompatAuth(client.auth)
    const verifyResponse = auth.verifyEmail
      ? await auth.verifyEmail({
          email: body.email,
          otp: body.otp,
        })
      : { data: null, error: { message: 'verifyEmail is not available' } }

    const { data, error } = verifyResponse
    const verifyData = data as
      | { accessToken?: string; user?: Record<string, unknown>; redirectTo?: string }
      | null

    if (error || !verifyData?.accessToken) {
      return NextResponse.json({ error: error?.message || 'Invalid OTP' }, { status: 400 })
    }

    await setInsforgeAccessCookie(verifyData.accessToken)

    return NextResponse.json({
      accessToken: verifyData.accessToken,
      user: verifyData.user,
      redirectTo: verifyData.redirectTo || '/partners/dashboard',
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

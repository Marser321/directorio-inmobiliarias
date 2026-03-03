import { NextResponse } from 'next/server'
import { createInsforgeClient } from '@/lib/insforge/client'
import { setInsforgeAccessCookie } from '@/lib/insforge/cookies'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { asCompatAuth, getErrorMessage } from '@/lib/insforge/compat'
import type { AuthSignupDto } from '@/types/domain'

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeAuth) {
      return NextResponse.json({ error: 'Auth feature is disabled' }, { status: 503 })
    }

    const body = (await request.json()) as AuthSignupDto

    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const client = createInsforgeClient()
    const auth = asCompatAuth(client.auth)

    const signUpResponse = auth.signUp
      ? await auth.signUp({
          email: body.email,
          password: body.password,
          name: body.name,
          options: {
            emailRedirectTo: `${env.appUrl}/partners/login`,
          },
        })
      : { data: null, error: { message: 'signUp is not available' } }

    const { data, error } = signUpResponse
    const signUpData = data as {
      requireEmailVerification?: boolean
      user?: Record<string, unknown>
      accessToken?: string
      session?: { accessToken?: string; access_token?: string } | null
    } | null

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const skipEmailVerification = process.env.FEATURE_SKIP_EMAIL_VERIFICATION === 'true'
    const requiresVerification = Boolean(signUpData?.requireEmailVerification)
    const signUpAccessToken =
      signUpData?.accessToken || signUpData?.session?.accessToken || signUpData?.session?.access_token || null

    if (skipEmailVerification && requiresVerification && auth.signInWithPassword) {
      const signInResponse = await auth.signInWithPassword({
        email: body.email,
        password: body.password,
      })
      const signInData = signInResponse.data as { accessToken?: string; user?: Record<string, unknown> } | null

      if (!signInResponse.error && signInData?.accessToken) {
        await setInsforgeAccessCookie(signInData.accessToken)
        return NextResponse.json({
          requireEmailVerification: false,
          user: signInData.user ?? null,
          accessToken: signInData.accessToken,
        })
      }
    }

    if (!requiresVerification && signUpAccessToken) {
      await setInsforgeAccessCookie(signUpAccessToken)
    }

    return NextResponse.json({
      requireEmailVerification: requiresVerification,
      user: signUpData?.user ?? null,
      accessToken: !requiresVerification ? signUpAccessToken : null,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

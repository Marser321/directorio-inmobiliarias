import { getInsforgeEnv } from '@/lib/insforge/env'

type ValidatedUser = Record<string, unknown> & { id: string }

export async function validateInsforgeAccessToken(
  accessToken: string | null | undefined
): Promise<ValidatedUser | null> {
  if (!accessToken || typeof accessToken !== 'string') {
    return null
  }

  const env = getInsforgeEnv()
  const endpoint = `${env.baseUrl}/api/auth/sessions/current`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { user?: Record<string, unknown> | null } | null
    const user = payload?.user
    if (!user || typeof user.id !== 'string' || !user.id.trim()) {
      return null
    }

    return user as ValidatedUser
  } catch {
    return null
  }
}

import { cookies } from 'next/headers'

export const INSFORGE_ACCESS_COOKIE = 'insforge_access_token'

export async function setInsforgeAccessCookie(accessToken: string) {
  const cookieStore = await cookies()
  cookieStore.set(INSFORGE_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearInsforgeAccessCookie() {
  const cookieStore = await cookies()
  cookieStore.set(INSFORGE_ACCESS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function getInsforgeAccessToken() {
  const cookieStore = await cookies()
  return cookieStore.get(INSFORGE_ACCESS_COOKIE)?.value || null
}

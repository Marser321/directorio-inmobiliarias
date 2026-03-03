const CLIENT_ACCESS_TOKEN_KEY = 'insforge_client_access_token'

export function setClientAccessToken(token: string | null | undefined) {
  if (typeof window === 'undefined') return

  if (typeof token === 'string' && token.trim()) {
    window.localStorage.setItem(CLIENT_ACCESS_TOKEN_KEY, token)
    return
  }

  window.localStorage.removeItem(CLIENT_ACCESS_TOKEN_KEY)
}

export function clearClientAccessToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CLIENT_ACCESS_TOKEN_KEY)
}

export function getClientAccessToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CLIENT_ACCESS_TOKEN_KEY)
}

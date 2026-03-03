/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { createInsforgeClient } from '@/lib/insforge/client'
import { getInsforgeEnv } from '@/lib/insforge/env'
import type { CompatQuery } from '@/lib/insforge/compat'
import { claimsToUser, decodeJwtClaims, normalizeUser } from '@/lib/insforge/jwt'
import { validateInsforgeAccessToken } from '@/lib/insforge/token-validation'

type AnyObject = Record<string, unknown>
type InsforgeClient = ReturnType<typeof createInsforgeClient>

interface SupabaseCompatOptions {
  global?: {
    headers?: {
      Authorization?: string
    }
  }
  headers?: {
    Authorization?: string
  }
}

export interface EnvDiagnostics {
  ok: boolean
  missing: string[]
  mode: 'client' | 'server'
}

interface ResolvedClientConfig {
  baseUrl: string | null
  anonKey: string | null
  diagnostics: EnvDiagnostics
}

function hasText(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function resolveClientConfig(url?: string, key?: string): ResolvedClientConfig {
  const mode: EnvDiagnostics['mode'] = typeof window === 'undefined' ? 'server' : 'client'
  let baseUrl = hasText(url) ? url : undefined
  let anonKey = hasText(key) ? key : undefined

  if (!baseUrl && hasText(process.env.NEXT_PUBLIC_INSFORGE_BASE_URL)) {
    baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
  }
  if (!anonKey && hasText(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY)) {
    anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  }

  if (mode === 'server' && (!baseUrl || !anonKey)) {
    try {
      const env = getInsforgeEnv()
      if (!baseUrl) baseUrl = env.baseUrl
      if (!anonKey) anonKey = env.anonKey
    } catch {
      // Keep missing values and return diagnostics instead of throwing.
    }
  }

  const missing: string[] = []
  if (!baseUrl) missing.push('NEXT_PUBLIC_INSFORGE_BASE_URL')
  if (!anonKey) missing.push('NEXT_PUBLIC_INSFORGE_ANON_KEY')

  return {
    baseUrl: baseUrl || null,
    anonKey: anonKey || null,
    diagnostics: {
      ok: missing.length === 0,
      missing,
      mode,
    },
  }
}

export function getInsforgeClientEnvDiagnostics(url?: string, key?: string): EnvDiagnostics {
  return resolveClientConfig(url, key).diagnostics
}

function normalizeError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return error
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return new Error(typeof message === 'string' ? message : String(error))
  }
  return new Error(String(error))
}

function buildPublicUrl(baseUrl: string, bucket: string, key: string) {
  return `${baseUrl}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`
}

function createStorageCompat(client: InsforgeClient, baseUrl: string) {
  return {
    from(bucket: string) {
      const storageBucket = client.storage.from(bucket)

      return {
        async upload(path: string, file: File | Blob) {
          const { data, error } = await storageBucket.upload(path, file)
          return {
            data: data
              ? {
                  path: data.key,
                  id: data.key,
                  fullPath: data.key,
                  Key: data.key,
                }
              : null,
            error: normalizeError(error),
          }
        },
        getPublicUrl(path: string) {
          return {
            data: {
              publicUrl: buildPublicUrl(baseUrl, bucket, path),
            },
          }
        },
        async download(path: string) {
          const { data, error } = await storageBucket.download(path)
          return { data, error: normalizeError(error) }
        },
        async remove(paths: string[]) {
          const results = await Promise.all(paths.map((path) => storageBucket.remove(path)))
          const failed = results.find((r) => r.error)
          return {
            data: failed ? null : paths,
            error: normalizeError(failed?.error),
          }
        },
      }
    },
  }
}

function createRealtimeCompat() {
  const noopChannel = {
    on(_event?: unknown, _filter?: unknown, _callback?: unknown) {
      return noopChannel
    },
    subscribe(_callback?: unknown) {
      return noopChannel
    },
    unsubscribe() {
      return noopChannel
    },
  }

  return {
    channel(_name?: string) {
      return noopChannel
    },
    removeChannel(_channel?: unknown) {
      return noopChannel
    },
  }
}

function createMissingEnvError(diagnostics: EnvDiagnostics) {
  return new Error(
    `InsForge config missing (${diagnostics.mode}): ${diagnostics.missing.join(', ')}. ` +
      'Check .env.local and restart the dev server.'
  )
}

function createMissingQueryCompat(error: Error): CompatQuery {
  const payload = { data: null, error }

  const proxy = new Proxy(
    {},
    {
      get(_target, property: string | symbol) {
        if (property === 'then') return Promise.resolve(payload).then.bind(Promise.resolve(payload))
        if (property === 'catch') return Promise.resolve(payload).catch.bind(Promise.resolve(payload))
        if (property === 'finally') return Promise.resolve(payload).finally.bind(Promise.resolve(payload))
        if (property === 'data') return null
        if (property === 'error') return error
        if (typeof property === 'symbol') return undefined
        return () => proxy as CompatQuery
      },
    }
  )

  return proxy as CompatQuery
}

function createMissingStorageCompat(error: Error) {
  return {
    from(_bucket: string) {
      return {
        async upload() {
          return { data: null, error }
        },
        getPublicUrl() {
          return {
            data: { publicUrl: '' },
            error,
          }
        },
        async download() {
          return { data: null, error }
        },
        async remove() {
          return { data: null, error }
        },
      }
    },
  }
}

function createMissingAuthCompat(error: Error) {
  return {
    async signUp() {
      return { data: null, error }
    },
    async verifyEmail() {
      return { data: null, error }
    },
    async signInWithPassword() {
      return { data: null, error }
    },
    async signOut() {
      return { error }
    },
    async getUser() {
      return { data: { user: null }, error }
    },
    async getSession() {
      return { data: { session: null }, error }
    },
    admin: {
      async createUser() {
        return { data: { user: null }, error }
      },
      async deleteUser() {
        return { data: null, error }
      },
      async listUsers() {
        return { data: { users: [] }, error }
      },
      async getUserById() {
        return { data: { user: null }, error }
      },
      async generateLink() {
        return { data: null, error }
      },
    },
  }
}

function createAuthCompat(client: InsforgeClient, explicitAccessToken?: string): any {
  return {
    async signUp(payload: AnyObject) {
      const { data, error } = await client.auth.signUp(payload as any)
      return {
        data: data
          ? {
              user: data.user ?? null,
              session: data.accessToken ? { access_token: data.accessToken, user: data.user ?? null } : null,
              requireEmailVerification: data.requireEmailVerification ?? false,
            }
          : null,
        error: normalizeError(error),
      }
    },
    async verifyEmail(payload: AnyObject) {
      const { data, error } = await client.auth.verifyEmail(payload as any)
      return {
        data: data
          ? {
              user: data.user ?? null,
              session: data.accessToken ? { access_token: data.accessToken, user: data.user ?? null } : null,
            }
          : null,
        error: normalizeError(error),
      }
    },
    async signInWithPassword(payload: AnyObject) {
      const { data, error } = await client.auth.signInWithPassword(payload as any)
      return {
        data: data
          ? {
              user: data.user ?? null,
              session: data.accessToken ? { access_token: data.accessToken, user: data.user ?? null } : null,
            }
          : null,
        error: normalizeError(error),
      }
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      return { error: normalizeError(error) }
    },
    async getUser() {
      const claims = decodeJwtClaims(explicitAccessToken)
      const claimsUser = claimsToUser(claims)

      if (explicitAccessToken) {
        const validatedUser = await validateInsforgeAccessToken(explicitAccessToken)
        const normalizedValidatedUser = validatedUser
          ? normalizeUser((validatedUser as AnyObject) ?? null, claims)
          : normalizeUser(null, claims)

        return {
          data: {
            user: normalizedValidatedUser || claimsUser,
          },
          error: null,
        }
      }

      let data: { user?: unknown } | null = null
      let error: unknown = null

      if (typeof client.auth.getCurrentUser === 'function') {
        const result = await client.auth.getCurrentUser()
        data = result.data as { user?: unknown } | null
        error = result.error
      } else {
        const result = await client.auth.getCurrentSession()
        data = { user: result.data?.session?.user ?? null }
        error = result.error
      }

      return {
        data: {
          user: normalizeUser((data?.user as AnyObject | null | undefined) ?? null, claims),
        },
        error: normalizeError(error),
      }
    },
    async getSession() {
      const claims = decodeJwtClaims(explicitAccessToken)
      const claimsUser = claimsToUser(claims)
      if (explicitAccessToken) {
        const validatedUser = await validateInsforgeAccessToken(explicitAccessToken)
        const normalizedValidatedUser = validatedUser
          ? normalizeUser((validatedUser as AnyObject) ?? null, claims)
          : normalizeUser(null, claims)

        return {
          data: {
            session: normalizedValidatedUser || claimsUser
              ? {
                  access_token: explicitAccessToken,
                  user: normalizedValidatedUser || claimsUser,
                }
              : null,
          },
          error: null,
        }
      }

      const { data, error } = await client.auth.getCurrentSession()
      const accessToken = data?.session?.accessToken || null
      const normalizedUser = normalizeUser(
        (data?.session?.user as AnyObject | null | undefined) ?? null,
        claims
      )

      return {
        data: {
          session: accessToken
            ? {
                access_token: accessToken,
                user: normalizedUser,
                expires_at: data?.session?.expiresAt,
              }
            : null,
        },
        error: normalizeError(error),
      }
    },
    admin: {
      async createUser(_payload?: AnyObject) {
        return {
          data: { user: null as { id: string } | null },
          error: new Error('InsForge admin.createUser is not available in this project'),
        }
      },
      async deleteUser(_userId?: string) {
        return { data: null, error: new Error('InsForge admin.deleteUser is not available in this project') }
      },
      async listUsers(_params?: AnyObject) {
        return {
          data: { users: [] as Array<{ id: string }> },
          error: new Error('InsForge admin.listUsers is not available in this project'),
        }
      },
      async getUserById(_userId?: string) {
        return {
          data: { user: null as { id: string } | null },
          error: new Error('InsForge admin.getUserById is not available in this project'),
        }
      },
      async generateLink(_payload?: AnyObject) {
        return { data: null, error: new Error('InsForge admin.generateLink is not available in this project') }
      },
    },
  }
}

export function createClient(_url?: string, _key?: string, options?: SupabaseCompatOptions) {
  const authHeader = options?.global?.headers?.Authorization || options?.headers?.Authorization
  const accessToken = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : undefined
  const resolved = resolveClientConfig(_url, _key)
  const realtime = createRealtimeCompat()

  if (!resolved.baseUrl || !resolved.anonKey || !resolved.diagnostics.ok) {
    const error = createMissingEnvError(resolved.diagnostics)
    const database = {
      from: (_table: string) => createMissingQueryCompat(error),
      rpc: async () => ({ data: null, error }),
    }

    return {
      __envDiagnostics: resolved.diagnostics,
      auth: createMissingAuthCompat(error),
      from: (...args: unknown[]) => database.from(...(args as [string])),
      rpc: (..._args: unknown[]) => database.rpc(),
      database,
      storage: createMissingStorageCompat(error),
      channel: realtime.channel,
      removeChannel: realtime.removeChannel,
      realtime,
    }
  }

  const client = createInsforgeClient({
    baseUrl: resolved.baseUrl,
    anonKey: resolved.anonKey,
    accessToken,
  })

  const database = client.database as unknown as {
    from: (...args: unknown[]) => CompatQuery
    rpc: (...args: unknown[]) => any
  }

  return {
    __envDiagnostics: resolved.diagnostics,
    auth: createAuthCompat(client, accessToken),
    from: (...args: unknown[]) => database.from(...args),
    rpc: (...args: unknown[]) => database.rpc(...args),
    database: client.database,
    storage: createStorageCompat(client, resolved.baseUrl),
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
    realtime: client.realtime,
  }
}

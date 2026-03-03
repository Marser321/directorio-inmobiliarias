/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CompatError {
  message?: string
  code?: string
}

export interface CompatUserProfile {
  name?: string
}

export interface CompatUser {
  id?: string
  email?: string
  profile?: CompatUserProfile
  [key: string]: unknown
}

export interface CompatSession {
  user?: CompatUser | null
}

export interface CompatAuth {
  getCurrentSession?: () => Promise<{
    data?: { session?: CompatSession | null } | null
    error?: CompatError | null
  }>
  getCurrentUser?: () => Promise<{
    data?: { user?: CompatUser | null } | null
    error?: CompatError | null
  }>
  signUp?: (payload: Record<string, unknown>) => Promise<{
    data?: Record<string, unknown> | null
    error?: CompatError | null
  }>
  signInWithPassword?: (payload: Record<string, unknown>) => Promise<{
    data?: Record<string, unknown> | null
    error?: CompatError | null
  }>
  verifyEmail?: (payload: Record<string, unknown>) => Promise<{
    data?: Record<string, unknown> | null
    error?: CompatError | null
  }>
  signOut?: () => Promise<{ error?: CompatError | null }>
}

export interface CompatQuery {
  select: (...args: unknown[]) => CompatQuery
  eq: (...args: unknown[]) => CompatQuery
  in: (...args: unknown[]) => CompatQuery
  insert: (values: unknown) => CompatQuery
  update: (values: unknown) => CompatQuery
  upsert: (
    values: unknown,
    options?: Record<string, unknown>
  ) => Promise<{ data?: unknown; error?: CompatError | null }>
  delete: (...args: unknown[]) => CompatQuery
  order: (...args: unknown[]) => CompatQuery
  limit: (...args: unknown[]) => CompatQuery
  maybeSingle: <T = any>() => Promise<{
    data?: T
    error?: CompatError | null
  }>
  single: <T = any>() => Promise<{
    data?: T
    error?: CompatError | null
  }>
  [key: string]: any
}

export interface CompatDatabase {
  from: (table: string) => CompatQuery
  rpc?: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data?: unknown; error?: CompatError | null }>
}

export function asCompatAuth(auth: unknown): CompatAuth {
  return auth as CompatAuth
}

export function asCompatDatabase(database: unknown): CompatDatabase {
  return database as CompatDatabase
}

export function getErrorMessage(error: unknown, fallback = 'Internal server error') {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

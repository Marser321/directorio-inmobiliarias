'use client'

import { useEffect, useMemo, useState } from 'react'
import type { EnvDiagnostics } from '@/lib/insforge/compat-supabase'
import { getSupabaseBrowserEnvDiagnostics } from '@/lib/supabase-browser'

type HealthConfigResponse = {
  ok: boolean
  missing: string[]
}

function normalizeDiagnostics(payload: Partial<HealthConfigResponse> | null): EnvDiagnostics {
  const rawMissing = payload?.missing
  const missing = Array.isArray(rawMissing)
    ? rawMissing.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []

  return {
    ok: payload?.ok === true && missing.length === 0,
    missing,
    mode: 'server',
  }
}

function SetupScreen({ diagnostics }: { diagnostics: EnvDiagnostics }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-50/60 p-6 shadow-lg dark:bg-amber-950/20">
        <h2 className="text-xl font-semibold text-foreground">Configuracion pendiente de InsForge</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Faltan variables de entorno requeridas para auth/dashboard ({diagnostics.mode}).
        </p>

        <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4">
          <p className="text-sm font-medium text-foreground">Variables faltantes</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {diagnostics.missing.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>1. Completa las variables en <code>.env.local</code>.</p>
          <p>2. Reinicia el servidor: <code>npm run dev</code>.</p>
          <p>3. Verifica el estado en <code>/api/health/config</code>.</p>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )
}

export function EnvSetupGate({ children }: { children: React.ReactNode }) {
  const clientDiagnostics = useMemo(() => getSupabaseBrowserEnvDiagnostics(), [])
  const [serverDiagnostics, setServerDiagnostics] = useState<EnvDiagnostics | null>(null)
  const [checkingServer, setCheckingServer] = useState(clientDiagnostics.ok)

  useEffect(() => {
    if (!clientDiagnostics.ok) {
      setCheckingServer(false)
      return
    }

    let active = true

    const run = async () => {
      try {
        const response = await fetch('/api/health/config', { cache: 'no-store' })
        if (!active) return

        if (!response.ok) {
          setServerDiagnostics({
            ok: true,
            missing: [],
            mode: 'server',
          })
          return
        }

        const payload = (await response.json()) as Partial<HealthConfigResponse>
        setServerDiagnostics(normalizeDiagnostics(payload))
      } catch {
        if (!active) return
        setServerDiagnostics({
          ok: true,
          missing: [],
          mode: 'server',
        })
      } finally {
        if (active) setCheckingServer(false)
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [clientDiagnostics.ok])

  const activeDiagnostics =
    !clientDiagnostics.ok
      ? clientDiagnostics
      : serverDiagnostics && !serverDiagnostics.ok
        ? serverDiagnostics
        : null

  if (activeDiagnostics) {
    return <SetupScreen diagnostics={activeDiagnostics} />
  }

  if (checkingServer) {
    return <LoadingScreen />
  }

  return <>{children}</>
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Compass, LogOut } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAuth, useUserAgency } from '@/hooks/useAuth'
import { PartnersDashboardNav } from '@/components/partners/PartnersDashboardNav'

interface PartnersShellProps {
  children: ReactNode
}

export function PartnersShell({ children }: PartnersShellProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { agency } = useUserAgency()
  const [signingOut, setSigningOut] = useState(false)

  const isDashboardArea = pathname.startsWith('/partners/dashboard')

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      window.location.href = '/partners/login'
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-editorial-layer text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-surface-0/95 backdrop-blur supports-[backdrop-filter]:bg-surface-0/80">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-accent-gold-soft/30 bg-accent-gold-soft/10 text-accent-gold-soft">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-lg text-ink-strong">Luxe Estate</span>
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">Partners</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/partners"
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                pathname === '/partners'
                  ? 'border-accent-gold-soft/35 bg-accent-gold-soft/10 text-ink-strong'
                  : 'border-border/80 bg-card/70 text-muted-foreground hover:border-accent-gold-soft/35 hover:text-ink-strong'
              )}
            >
              <Compass className="h-4 w-4" />
              Directorio
            </Link>

            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Saliendo...' : 'Salir'}
              </button>
            ) : (
              <Link
                href="/partners/login"
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className={cn('pt-16', isDashboardArea && 'pb-4')}>
        {isDashboardArea ? <PartnersDashboardNav /> : null}
        {isDashboardArea && agency?.name ? (
          <div className="border-b border-border/60 bg-surface-1/70 px-4 py-2 text-xs text-muted-foreground">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
              <span>Panel operativo de {agency.name}</span>
              <span className="hidden md:inline">Actualiza propiedades, pipeline y perfil desde un solo lugar</span>
            </div>
          </div>
        ) : null}
        <main>{children}</main>
      </div>
    </div>
  )
}

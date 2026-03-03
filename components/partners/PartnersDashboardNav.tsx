'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  Building2,
  ChartLine,
  LayoutDashboard,
  Megaphone,
  Plus,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth, useUserAgency } from '@/hooks/useAuth'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  enabled?: boolean
}

function isActive(pathname: string, href: string) {
  if (href === '/partners/dashboard') {
    return pathname === href
  }
  if (href === '/partners/dashboard/properties') {
    return (
      pathname === href ||
      pathname.startsWith('/partners/dashboard/properties/') ||
      pathname.startsWith('/partners/dashboard/edit/')
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PartnersDashboardNav() {
  const pathname = usePathname()
  const { featureFlags, agencyContext } = useAuth()
  const { agency } = useUserAgency()

  const items: NavItem[] = [
    { href: '/partners/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/partners/dashboard/properties', label: 'Propiedades', icon: Building2 },
    { href: '/partners/dashboard/leads', label: 'Leads Center', icon: Target },
    {
      href: '/partners/dashboard/marketing',
      label: 'Marketing',
      icon: Megaphone,
      enabled: featureFlags.marketing,
    },
    {
      href: '/partners/dashboard/manager',
      label: 'Manager',
      icon: Sparkles,
      enabled: featureFlags.manager,
    },
    { href: '/partners/dashboard/settings', label: 'Perfil de Inmobiliaria', icon: Settings },
  ]

  const canManageProperties = agencyContext?.permissions.canManageProperties === true

  return (
    <div className="border-b border-border/70 bg-surface-0/95 backdrop-blur supports-[backdrop-filter]:bg-surface-0/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Navegación de partners">
          {items
            .filter((item) => item.enabled !== false)
            .map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors duration-200',
                    active
                      ? 'border-accent-gold-soft/40 bg-accent-gold-soft/10 text-ink-strong'
                      : 'border-border/80 bg-card/70 text-muted-foreground hover:border-accent-gold-soft/35 hover:text-ink-strong'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {agency?.slug ? (
            <Link
              href={`/agencies/${agency.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong"
            >
              <ChartLine className="h-4 w-4" />
              Ver perfil público
            </Link>
          ) : null}
          {canManageProperties ? (
            <Link
              href="/partners/dashboard/new"
              className="inline-flex items-center gap-2 rounded-full border border-accent-gold-soft/40 bg-accent-gold-soft/10 px-3 py-1.5 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
            >
              <Plus className="h-4 w-4" />
              Nueva propiedad
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

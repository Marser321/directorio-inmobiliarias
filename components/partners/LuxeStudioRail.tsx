'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import { Sparkles, Camera, Film, PenSquare, Megaphone, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { LuxeStudioRequestType } from '@/types/domain'

type LuxeService = {
  type: LuxeStudioRequestType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const SERVICES: LuxeService[] = [
  {
    type: 'property_photos',
    label: 'Fotos de propiedad',
    description: 'Set visual profesional para mejorar clic y contacto.',
    icon: Camera,
  },
  {
    type: 'video_tour',
    label: 'Video tour',
    description: 'Recorrido corto optimizado para listing y redes.',
    icon: Film,
  },
  {
    type: 'copywriting',
    label: 'Copy de conversión',
    description: 'Descripción editorial enfocada en decisión.',
    icon: PenSquare,
  },
  {
    type: 'social_media',
    label: 'Pack social media',
    description: 'Activos listos para Instagram y pauta.',
    icon: Megaphone,
  },
]

interface LuxeStudioRailProps {
  source: string
  propertyId?: number | null
  compact?: boolean
  className?: string
}

function toHref(type: LuxeStudioRequestType, source: string, propertyId?: number | null) {
  const params = new URLSearchParams({
    service: type,
    source,
  })

  if (typeof propertyId === 'number' && Number.isFinite(propertyId) && propertyId > 0) {
    params.set('propertyId', String(propertyId))
  }

  return `/partners/dashboard/marketing?${params.toString()}`
}

export function LuxeStudioRail({ source, propertyId = null, compact = false, className }: LuxeStudioRailProps) {
  const { featureFlags } = useAuth()
  const marketingEnabled = featureFlags.marketing

  return (
    <aside
      className={cn(
        'rounded-2xl border border-accent-gold-soft/25 bg-card/85 p-4 shadow-[0_12px_32px_-22px_rgba(87,70,30,0.45)]',
        className
      )}
      aria-label="Luxe Studio"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Luxe Studio</p>
          <h3 className="mt-1 text-lg font-semibold text-ink-strong">Potencia multimedia de tu propiedad</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Servicios contextuales para elevar cobertura visual sin salir de tu flujo operativo.
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-accent-gold-soft/25 bg-accent-gold-soft/10 text-accent-gold-strong">
          <Sparkles className="h-4 w-4" />
        </span>
      </div>

      {marketingEnabled ? (
        <div className={cn('mt-4 grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
          {SERVICES.map((service) => (
            <Link
              key={service.type}
              href={toHref(service.type, source, propertyId)}
              className="group rounded-xl border border-border/70 bg-surface-0/70 p-3 transition-all duration-200 hover:border-accent-gold-soft/40 hover:bg-surface-1/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-accent-gold-soft/25 bg-accent-gold-soft/10 text-accent-gold-strong">
                  <service.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-strong">{service.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{service.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border/70 bg-surface-0/70 p-3 text-sm text-muted-foreground">
          Luxe Studio está desactivado en este entorno (`FEATURE_INSFORGE_MARKETING=false`).
          Puedes continuar gestionando media manualmente o pedir activación interna.
        </div>
      )}
    </aside>
  )
}

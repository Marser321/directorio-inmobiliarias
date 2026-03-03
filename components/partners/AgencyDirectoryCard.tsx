import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Building2, ChartColumn, Clock3, Eye, MapPin } from 'lucide-react'
import type { AgencyDirectoryItem } from '@/types/domain'

interface AgencyDirectoryCardProps {
  agency: AgencyDirectoryItem
}

function formatTier(tier: string | null) {
  if (!tier) return 'basic'
  if (tier === 'enterprise') return 'enterprise'
  if (tier === 'pro') return 'pro'
  return 'basic'
}

export function AgencyDirectoryCard({ agency }: AgencyDirectoryCardProps) {
  const tierLabel = formatTier(agency.tier_subscription).toUpperCase()

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-gold-soft/35 hover:shadow-lg">
      <div className="relative h-28 overflow-hidden bg-surface-2">
        {agency.cover_image_url ? (
          <Image
            src={agency.cover_image_url}
            alt={`Portada ${agency.name}`}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface-1 to-surface-2" />
        )}
      </div>

      <div className="relative px-4 pb-4 pt-3">
        <div className="-mt-10 mb-3 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-surface-1">
          {agency.logo_url ? (
            <Image
              src={agency.logo_url}
              alt={`Logo ${agency.name}`}
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-contain"
            />
          ) : (
            <Building2 className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-ink-strong">{agency.name}</h3>
            {agency.tagline ? <p className="text-sm text-muted-foreground">{agency.tagline}</p> : null}
          </div>
          <span className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {tierLabel}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-1/70 px-2 py-1">
            <MapPin className="h-3.5 w-3.5" />
            {agency.city || 'Sin ciudad'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-1/70 px-2 py-1">
            <ChartColumn className="h-3.5 w-3.5" />
            {agency.total_properties} propiedades
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-1/70 px-2 py-1">
            <Eye className="h-3.5 w-3.5" />
            {agency.total_views} vistas
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-1/70 px-2 py-1">
            <Clock3 className="h-3.5 w-3.5" />
            {agency.avg_response_time ? `${agency.avg_response_time}h resp.` : 'Resp. s/d'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {agency.is_verified ? (
              <>
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                Verificada
              </>
            ) : (
              'Perfil activo'
            )}
          </span>
          <Link
            href={`/agencies/${agency.slug}`}
            className="rounded-full border border-accent-gold-soft/40 bg-accent-gold-soft/10 px-3 py-1.5 text-xs font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
          >
            Ver inmobiliaria
          </Link>
        </div>
      </div>
    </article>
  )
}

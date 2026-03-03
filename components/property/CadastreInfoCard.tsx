'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import type { AgencyValueScoreDto, CadastreLookupDto } from '@/types/domain'

interface CadastreInfoCardProps {
  propertyId: number
  agencyId: number | null
  address: string | null
  city: string | null
  lat: number | null
  lng: number | null
  coordinateSource?: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown' | null
}

function getCoordinateLabel(source: CadastreInfoCardProps['coordinateSource']) {
  if (source === 'manual') return 'Manual'
  if (source === 'geocoded') return 'Geocodificada'
  if (source === 'centroid') return 'Centroide'
  if (source === 'none') return 'Sin dato'
  return 'No informado'
}

export function CadastreInfoCard({
  propertyId,
  agencyId,
  address,
  city,
  lat,
  lng,
  coordinateSource = null,
}: CadastreInfoCardProps) {
  const { featureFlags } = useAuth()
  const [cadastre, setCadastre] = useState<CadastreLookupDto | null>(null)
  const [valueScore, setValueScore] = useState<AgencyValueScoreDto | null>(null)

  const canLookupCadastre = featureFlags.geocatastroLookup
  const canLookupValueScore = featureFlags.agencyValueScore && typeof agencyId === 'number' && agencyId > 0

  useEffect(() => {
    let active = true
    const run = async () => {
      if (!canLookupCadastre) {
        setCadastre(null)
        return
      }

      const params = new URLSearchParams()
      if (typeof lat === 'number' && typeof lng === 'number') {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
      } else if (address) {
        params.set('address', address)
        params.set('city', city || 'Maldonado')
      } else {
        setCadastre(null)
        return
      }

      try {
        const response = await fetch(`/api/geo/cadastre/lookup?${params.toString()}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !active) return
        setCadastre((payload.data || null) as CadastreLookupDto | null)
      } catch {
        if (active) setCadastre(null)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [address, canLookupCadastre, city, lat, lng])

  useEffect(() => {
    let active = true
    const run = async () => {
      if (!canLookupValueScore || !agencyId) {
        setValueScore(null)
        return
      }

      try {
        const params = new URLSearchParams({
          agencyId: String(agencyId),
          propertyId: String(propertyId),
        })
        const response = await fetch(`/api/agencies/value-score?${params.toString()}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !active) return
        setValueScore((payload.data || null) as AgencyValueScoreDto | null)
      } catch {
        if (active) setValueScore(null)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [agencyId, canLookupValueScore, propertyId])

  const shouldRender = canLookupCadastre || canLookupValueScore
  const locationPrecision = useMemo(() => getCoordinateLabel(coordinateSource), [coordinateSource])

  if (!shouldRender) return null

  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
      <h3 className="text-lg font-semibold text-ink-strong">Ficha catastral y score de valor</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Información de apoyo para decisión. Referencia legal disponible en la guía de comisiones.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-border/70 bg-surface-1/65 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Localización</p>
          <p className="mt-1 text-sm font-medium text-ink-strong">Precisión: {locationPrecision}</p>
          {canLookupCadastre ? (
            cadastre ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Padrón: {cadastre.padron || 's/d'} · Área: {cadastre.area_m2 !== null ? `${cadastre.area_m2} m²` : 's/d'} · Localidad:{' '}
                {cadastre.localidad || 's/d'}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Sin dato catastral disponible para esta ubicación.</p>
            )
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Lookup catastral desactivado en este entorno.</p>
          )}
        </article>

        <article className="rounded-xl border border-border/70 bg-surface-1/65 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Value Score</p>
          {canLookupValueScore ? (
            valueScore ? (
              <p className="mt-1 text-sm font-medium text-ink-strong">
                {valueScore.value_score.toFixed(1)} / 100
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Costo {valueScore.cost_score.toFixed(1)} · Transparencia {valueScore.transparency_score.toFixed(1)} · Operación{' '}
                  {valueScore.operational_score.toFixed(1)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Sin score disponible para esta agencia/propiedad.</p>
            )
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Score de valor desactivado o sin agencia asociada.</p>
          )}
        </article>
      </div>

      <Link
        href="/legal/comisiones-inmobiliarias"
        className="mt-3 inline-block text-xs text-muted-foreground underline hover:text-ink-strong"
      >
        Ver guía legal informativa sobre comisiones
      </Link>
    </section>
  )
}

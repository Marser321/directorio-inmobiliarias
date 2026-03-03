'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Check, Sparkles, Zap } from 'lucide-react'
import { ServiceRequestForm } from '@/components/marketing/ServiceRequestForm'
import { RequestStatusList } from '@/components/marketing/RequestStatusList'
import type { LuxeStudioContext, LuxeStudioRequestType } from '@/types/domain'

const SERVICE_TYPES: LuxeStudioRequestType[] = ['property_photos', 'video_tour', 'copywriting', 'social_media']

function isServiceType(value: string | null): value is LuxeStudioRequestType {
  return Boolean(value && SERVICE_TYPES.includes(value as LuxeStudioRequestType))
}

export default function MarketingPage() {
  const searchParams = useSearchParams()
  const [currentPlan, setCurrentPlan] = useState({
    name: 'Pack Básico',
    credits_total: 10,
    credits_used: 0,
    renewal_date: '-',
  })

  const context = useMemo<LuxeStudioContext | null>(() => {
    const serviceParam = searchParams.get('service')
    if (!isServiceType(serviceParam)) return null

    const propertyIdRaw = Number(searchParams.get('propertyId') || '')
    const propertyId = Number.isFinite(propertyIdRaw) && propertyIdRaw > 0 ? propertyIdRaw : null

    return {
      service: serviceParam,
      propertyId,
      source: searchParams.get('source') || 'marketing_dashboard',
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/marketing/tiers', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        const subscription = payload.currentSubscription
        const tier = subscription?.tier
        if (!tier) return

        setCurrentPlan({
          name: tier.name || 'Plan Activo',
          credits_total: 10,
          credits_used: 0,
          renewal_date: subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString('es-UY')
            : '-',
        })
      })
      .catch(() => undefined)
  }, [])

  const creditsLeft = Math.max(currentPlan.credits_total - currentPlan.credits_used, 0)
  const usagePercent = currentPlan.credits_total > 0 ? (currentPlan.credits_used / currentPlan.credits_total) * 100 : 0

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-editorial-layer px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border/70 bg-card/90 p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Luxe Studio</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink-strong md:text-3xl">Centro de servicios multimedia</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Solicita producción de contenido para propiedades con contexto desde dashboard, wizard y media center.
              </p>
              {context ? (
                <p className="mt-2 text-xs text-accent-gold-strong">
                  Prefill activo: {context.service} {context.propertyId ? `· propiedad #${context.propertyId}` : ''} · {context.source}
                </p>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-3 py-1.5 text-xs text-ink-strong">
              <Sparkles className="h-3.5 w-3.5" />
              Operación contextual
            </span>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-2xl border border-border/70 bg-card/90 p-5"
            >
              <div className="relative overflow-hidden rounded-xl border border-accent-gold-soft/25 bg-surface-1/80 p-4">
                <div className="absolute -right-6 -top-6 opacity-10">
                  <Zap className="h-28 w-28" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Plan actual</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink-strong">{currentPlan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Te quedan <span className="font-medium text-ink-strong">{creditsLeft} créditos</span> en el período actual.
                    Renovación: {currentPlan.renewal_date}.
                  </p>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uso de créditos</span>
                      <span>
                        {currentPlan.credits_used} / {currentPlan.credits_total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border/80">
                      <div className="h-full bg-accent-gold-soft transition-all duration-500" style={{ width: `${usagePercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <ServiceRequestForm context={context} />
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <RequestStatusList />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="rounded-2xl border border-border/70 bg-card/90 p-5"
            >
              <h3 className="text-base font-semibold text-ink-strong">Qué cubre Luxe Studio</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Set de fotos para listing y portada.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Video corto orientado a conversión.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Copy de ficha y kit base para redes.
                </li>
              </ul>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  )
}

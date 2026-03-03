'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Target,
  Users,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getInsforgeBrowserClient } from '@/lib/insforge/client'
import { ProspectsTable, type ProspectRow } from '@/components/partners/ProspectsTable'
import type { ProspectProperty } from '@/types/database.types'

function toProspectRow(prospect: ProspectProperty): ProspectRow {
  return {
    id: String(prospect.id),
    address: prospect.address || 'Sin dirección',
    owner_name: prospect.owner_name || 'Sin propietario',
    listed_price: prospect.listed_price || 0,
    market_estimate: prospect.market_price_estimate || 0,
    source: (prospect.source as ProspectRow['source']) || 'google_maps',
    status: (prospect.status as ProspectRow['status']) || 'new',
    quality_score: prospect.quality_score || 0,
    days_on_market: prospect.days_on_market || 0,
    last_contact: prospect.updated_at || null,
  }
}

function StageCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneClasses = {
    neutral: 'border-border bg-card text-ink-strong',
    success: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    warning: 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    danger: 'border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-300',
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-2xl font-semibold">{value}</p>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}

export function LeadsCenterContent({ showBackToDashboard = true }: { showBackToDashboard?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [prospects, setProspects] = useState<ProspectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchProspects = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('prospect_properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('[LeadsCenter] Failed to fetch prospects:', error)
      } else {
        const mapped = ((data || []) as ProspectProperty[]).map(toProspectRow)
        setProspects(mapped)
      }
      setLoading(false)
    }

    const connectRealtime = async () => {
      try {
        const meResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!meResponse.ok) return

        const me = await meResponse.json()
        const agencyId = me?.agencyMembership?.agency_id
        if (!agencyId) return

        const realtimeClient = getInsforgeBrowserClient()
        const channelName = `prospect_properties:${agencyId}`
        await realtimeClient.realtime.connect()
        const result = await realtimeClient.realtime.subscribe(channelName)
        if (!result?.ok) return

        const handleInsert = (payload: { new?: ProspectProperty } & ProspectProperty) => {
          const candidate = payload.new ?? payload
          if (!candidate?.id) return
          const mapped = toProspectRow(candidate)
          setProspects((current) => {
            if (current.some((entry) => entry.id === mapped.id)) return current
            return [mapped, ...current]
          })
        }

        realtimeClient.realtime.on('INSERT_prospect_properties', handleInsert)
      } catch (realtimeError) {
        console.error('[LeadsCenter] realtime connect failed:', realtimeError)
      }
    }

    void fetchProspects()
    void connectRealtime()
    const pollId = window.setInterval(() => {
      void fetchProspects()
    }, 15000)

    return () => {
      window.clearInterval(pollId)
    }
  }, [supabase])

  const stats = {
    total: prospects.length,
    new: prospects.filter((row) => row.status === 'new').length,
    qualified: prospects.filter((row) => row.status === 'qualified').length,
    contacted: prospects.filter((row) => row.status === 'contacted').length,
    converted: prospects.filter((row) => row.status === 'converted').length,
    disqualified: prospects.filter((row) => row.status === 'disqualified').length,
  }

  const updateStatus = async (id: string, status: ProspectRow['status']) => {
    const { error } = await supabase.from('prospect_properties').update({ status }).eq('id', id)
    if (error) {
      setMessage('No se pudo actualizar el estado del lead.')
      return false
    }
    setProspects((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
    return true
  }

  const handleAction = async (id: string, action: string) => {
    setMessage(null)

    if (action === 'approve') {
      await updateStatus(id, 'qualified')
      return
    }

    if (action === 'contact') {
      const updated = await updateStatus(id, 'contacted')
      if (!updated) return
      await supabase.from('outreach_queue').insert({
        lead_id: id,
        channel: 'whatsapp',
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      })
      setMessage('Lead enviado a secuencia de contacto.')
      return
    }

    if (action === 'convert') {
      await updateStatus(id, 'converted')
      return
    }

    if (action === 'reject') {
      await updateStatus(id, 'disqualified')
      return
    }

    if (action === 'outreach') {
      await supabase.from('outreach_queue').insert({
        lead_id: id,
        channel: 'whatsapp',
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      })
      await updateStatus(id, 'contacted')
      setMessage('Outreach encolado correctamente.')
      return
    }

    if (action === 'view') {
      setMessage('Detalle extendido disponible en el siguiente bloque de CRM.')
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border/70 bg-card/90 p-5"
        >
          {showBackToDashboard ? (
            <Link
              href="/partners/dashboard"
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-ink-strong"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al dashboard
            </Link>
          ) : null}

          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-ink-strong md:text-3xl">Leads Center</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pipeline operativo para captación y conversión de oportunidades con acciones rápidas.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Seguimiento activo
            </span>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
        >
          <StageCard label="Total" value={stats.total} icon={Users} tone="neutral" />
          <StageCard label="Nuevos" value={stats.new} icon={Clock3} tone="warning" />
          <StageCard label="Calificados" value={stats.qualified} icon={Target} tone="neutral" />
          <StageCard label="Contactados" value={stats.contacted} icon={MessageCircle} tone="neutral" />
          <StageCard label="Convertidos" value={stats.converted} icon={CheckCircle2} tone="success" />
          <StageCard label="Descartados" value={stats.disqualified} icon={XCircle} tone="danger" />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-border/70 bg-card/90"
        >
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="text-lg font-semibold text-ink-strong">Pipeline por lead</h2>
            <p className="text-sm text-muted-foreground">Actualiza estado, dispara contacto y prioriza cierre por score.</p>
            {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No hay leads todavía. Cuando ingresen oportunidades al pipeline, aparecerán aquí con acciones guiadas.
            </div>
          ) : (
            <ProspectsTable prospects={prospects} onAction={handleAction} />
          )}
        </motion.section>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { AgencyCommissionProfileDto, CommissionModel, CommissionOperationType } from '@/types/domain'

type ApiResponse = {
  data: AgencyCommissionProfileDto[]
  permissions: {
    membershipRole: string | null
    canEditAgencyCommissionProfile: boolean
  }
}

type FormState = {
  commission_model: CommissionModel
  commission_percent: string
  commission_fixed_amount: string
  currency: string
  additional_fees: string
  notes: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  evidence_url: string
  is_public: boolean
}

const DEFAULT_FORM: FormState = {
  commission_model: 'percent',
  commission_percent: '',
  commission_fixed_amount: '',
  currency: 'USD',
  additional_fees: '',
  notes: '',
  verification_status: 'unverified',
  evidence_url: '',
  is_public: true,
}

function toForm(profile: AgencyCommissionProfileDto | null): FormState {
  if (!profile) return DEFAULT_FORM
  return {
    commission_model: profile.commission_model,
    commission_percent: profile.commission_percent !== null ? String(profile.commission_percent) : '',
    commission_fixed_amount:
      profile.commission_fixed_amount !== null ? String(profile.commission_fixed_amount) : '',
    currency: profile.currency || 'USD',
    additional_fees: profile.additional_fees || '',
    notes: profile.notes || '',
    verification_status: profile.verification_status,
    evidence_url: profile.evidence_url || '',
    is_public: profile.is_public,
  }
}

export function AgencyCommissionSettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeOperation, setActiveOperation] = useState<CommissionOperationType>('sale')
  const [profiles, setProfiles] = useState<Record<CommissionOperationType, AgencyCommissionProfileDto | null>>({
    sale: null,
    rent: null,
  })
  const [canEdit, setCanEdit] = useState(false)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/partners/agency/commission-profile', { cache: 'no-store' })
        const payload = (await response.json()) as ApiResponse & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error || 'No se pudo cargar la política comercial')
        }

        const sale = payload.data.find((item) => item.operation_type === 'sale') || null
        const rent = payload.data.find((item) => item.operation_type === 'rent') || null
        setProfiles({ sale, rent })
        setCanEdit(payload.permissions?.canEditAgencyCommissionProfile === true)
        setMembershipRole(payload.permissions?.membershipRole || null)
      } catch (nextError: unknown) {
        setError(nextError instanceof Error ? nextError.message : 'No se pudo cargar la política comercial')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  useEffect(() => {
    setForm(toForm(profiles[activeOperation]))
  }, [activeOperation, profiles])

  const activeUpdatedAt = useMemo(() => {
    const value = profiles[activeOperation]?.updated_at
    if (!value) return 'Sin actualizaciones'
    return new Date(value).toLocaleString('es-UY')
  }, [profiles, activeOperation])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/partners/agency/commission-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: activeOperation,
          commission_model: form.commission_model,
          commission_percent: form.commission_percent.length > 0 ? Number(form.commission_percent) : null,
          commission_fixed_amount:
            form.commission_fixed_amount.length > 0 ? Number(form.commission_fixed_amount) : null,
          currency: form.currency.trim().toUpperCase(),
          additional_fees: form.additional_fees.trim() || null,
          notes: form.notes.trim() || null,
          verification_status: form.verification_status,
          evidence_url: form.evidence_url.trim() || null,
          is_public: form.is_public,
        }),
      })

      const payload = (await response.json()) as { data?: AgencyCommissionProfileDto; error?: string }
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'No se pudo guardar la política comercial')
      }

      setProfiles((current) => ({ ...current, [activeOperation]: payload.data || null }))
      setSuccess('Política comercial actualizada.')
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo guardar la política comercial')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando política comercial...
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink-strong">Comisiones y condiciones comerciales</h2>
          <p className="text-sm text-muted-foreground">
            Declaración interna con opción de visibilidad pública y estado de verificación.
          </p>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          Rol: {membershipRole || 'sin rol'}
        </div>
      </div>

      {!canEdit ? (
        <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Tu rol es de lectura. Solo owner/admin puede editar esta sección.
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveOperation('sale')}
          className={`rounded-full border px-3 py-1.5 text-xs ${
            activeOperation === 'sale'
              ? 'border-accent-gold-soft/35 bg-accent-gold-soft/10 text-ink-strong'
              : 'border-border text-muted-foreground'
          }`}
        >
          Venta
        </button>
        <button
          type="button"
          onClick={() => setActiveOperation('rent')}
          className={`rounded-full border px-3 py-1.5 text-xs ${
            activeOperation === 'rent'
              ? 'border-accent-gold-soft/35 bg-accent-gold-soft/10 text-ink-strong'
              : 'border-border text-muted-foreground'
          }`}
        >
          Alquiler
        </button>
        <span className="ml-auto text-xs text-muted-foreground">Última actualización: {activeUpdatedAt}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Modelo de comisión</span>
          <select
            value={form.commission_model}
            onChange={(event) => setField('commission_model', event.target.value as CommissionModel)}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          >
            <option value="percent">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
            <option value="mixed">Mixto</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Moneda</span>
          <input
            value={form.currency}
            onChange={(event) => setField('currency', event.target.value.toUpperCase())}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Comisión %</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.commission_percent}
            onChange={(event) => setField('commission_percent', event.target.value)}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Comisión fija</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.commission_fixed_amount}
            onChange={(event) => setField('commission_fixed_amount', event.target.value)}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-muted-foreground">Cargos adicionales</span>
          <input
            value={form.additional_fees}
            onChange={(event) => setField('additional_fees', event.target.value)}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-muted-foreground">Notas</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => setField('notes', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none disabled:opacity-70"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Estado de verificación</span>
          <select
            value={form.verification_status}
            onChange={(event) => setField('verification_status', event.target.value as FormState['verification_status'])}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          >
            <option value="unverified">No verificada</option>
            <option value="pending">Pendiente</option>
            <option value="verified">Verificada</option>
            <option value="rejected">Rechazada</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">URL evidencia</span>
          <input
            value={form.evidence_url}
            onChange={(event) => setField('evidence_url', event.target.value)}
            disabled={!canEdit}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none disabled:opacity-70"
          />
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={form.is_public}
          onChange={(event) => setField('is_public', event.target.checked)}
          disabled={!canEdit}
        />
        Mostrar esta política en perfil público y score de valor.
      </label>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit || saving}
          className="inline-flex items-center gap-2 rounded-full bg-ink-strong px-4 py-2 text-sm text-surface-0 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar política
        </button>
      </div>
    </section>
  )
}

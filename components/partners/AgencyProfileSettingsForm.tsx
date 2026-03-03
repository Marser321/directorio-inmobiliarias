'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Image from 'next/image'
import { Loader2, Save, UploadCloud } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import type { AgencyProfileDto, AgencyProfileUpdateDto } from '@/types/domain'

interface PermissionsPayload {
  membershipRole: string | null
  canEditAgencyProfile: boolean
}

interface ApiPayload {
  data: AgencyProfileDto
  permissions: PermissionsPayload
}

interface FormState {
  name: string
  slug: string
  tagline: string
  description: string
  contact_email: string
  contact_phone: string
  whatsapp: string
  website: string
  address: string
  city: string
  logo_url: string
  cover_image_url: string
  meta_description: string
  year_established: string
  languages: string
  specialties: string
  certifications: string
  instagram: string
  facebook: string
  linkedin: string
  youtube: string
  tiktok: string
}

const INITIAL_STATE: FormState = {
  name: '',
  slug: '',
  tagline: '',
  description: '',
  contact_email: '',
  contact_phone: '',
  whatsapp: '',
  website: '',
  address: '',
  city: '',
  logo_url: '',
  cover_image_url: '',
  meta_description: '',
  year_established: '',
  languages: '',
  specialties: '',
  certifications: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
  tiktok: '',
}

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function serializeList(value: string[]) {
  return value.join(', ')
}

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  )
}

function toFormState(data: AgencyProfileDto): FormState {
  return {
    name: data.name || '',
    slug: data.slug || '',
    tagline: data.tagline || '',
    description: data.description || '',
    contact_email: data.contact_email || '',
    contact_phone: data.contact_phone || '',
    whatsapp: data.whatsapp || '',
    website: data.website || '',
    address: data.address || '',
    city: data.city || '',
    logo_url: data.logo_url || '',
    cover_image_url: data.cover_image_url || '',
    meta_description: data.meta_description || '',
    year_established: data.year_established ? String(data.year_established) : '',
    languages: serializeList(data.languages || []),
    specialties: serializeList(data.specialties || []),
    certifications: serializeList(data.certifications || []),
    instagram: data.social_links?.instagram || '',
    facebook: data.social_links?.facebook || '',
    linkedin: data.social_links?.linkedin || '',
    youtube: data.social_links?.youtube || '',
    tiktok: data.social_links?.tiktok || '',
  }
}

async function uploadAgencyMedia(agencyId: number, file: File, target: 'logo' | 'cover') {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato no permitido. Usá JPG, PNG, WEBP o AVIF.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg'
  const filePath = `agencies/${agencyId}/${target}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const supabase = createClient()
  const { error: uploadError } = await supabase.storage.from('agency-logos').upload(filePath, file)
  if (uploadError) {
    throw new Error('No se pudo subir el archivo al bucket agency-logos.')
  }

  const { data } = supabase.storage.from('agency-logos').getPublicUrl(filePath)
  return data.publicUrl
}

export function AgencyProfileSettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [profile, setProfile] = useState<AgencyProfileDto | null>(null)
  const [permissions, setPermissions] = useState<PermissionsPayload | null>(null)

  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/partners/agency/profile', { cache: 'no-store' })
        const payload = (await response.json()) as Partial<ApiPayload> & { error?: string }
        if (!response.ok || !payload.data || !payload.permissions) {
          throw new Error(payload.error || 'No se pudo cargar el perfil de inmobiliaria.')
        }

        setProfile(payload.data)
        setPermissions(payload.permissions)
        setForm(toFormState(payload.data))
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el perfil.')
      } finally {
        setLoading(false)
      }
    }

    void fetchProfile()
  }, [])

  const canEdit = permissions?.canEditAgencyProfile === true

  const socialPreview = useMemo(
    () => [form.instagram, form.facebook, form.linkedin, form.youtube, form.tiktok].filter(Boolean).length,
    [form.instagram, form.facebook, form.linkedin, form.youtube, form.tiktok]
  )

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleMediaUpload = async (file: File | undefined, target: 'logo' | 'cover') => {
    if (!file || !profile?.id || !canEdit) return

    setError(null)
    setSuccess(null)

    try {
      if (target === 'logo') setUploadingLogo(true)
      if (target === 'cover') setUploadingCover(true)

      const publicUrl = await uploadAgencyMedia(profile.id, file, target)
      if (target === 'logo') updateField('logo_url', publicUrl)
      if (target === 'cover') updateField('cover_image_url', publicUrl)
      setSuccess(`Archivo ${target === 'logo' ? 'de logo' : 'de portada'} subido correctamente.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Error al subir archivo.')
    } finally {
      if (target === 'logo') setUploadingLogo(false)
      if (target === 'cover') setUploadingCover(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canEdit) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload: AgencyProfileUpdateDto = {
      name: form.name,
      slug: form.slug,
      tagline: form.tagline || null,
      description: form.description || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      whatsapp: form.whatsapp || null,
      website: form.website || null,
      address: form.address || null,
      city: form.city || null,
      logo_url: form.logo_url || null,
      cover_image_url: form.cover_image_url || null,
      meta_description: form.meta_description || null,
      year_established: form.year_established ? Number(form.year_established) : null,
      languages: parseList(form.languages),
      specialties: parseList(form.specialties),
      certifications: parseList(form.certifications),
      social_links: {
        instagram: form.instagram || null,
        facebook: form.facebook || null,
        linkedin: form.linkedin || null,
        youtube: form.youtube || null,
        tiktok: form.tiktok || null,
      },
    }

    try {
      const response = await fetch('/api/partners/agency/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as Partial<ApiPayload> & { error?: string }
      if (!response.ok || !result.data || !result.permissions) {
        throw new Error(result.error || 'No se pudo guardar el perfil.')
      }

      setProfile(result.data)
      setPermissions(result.permissions)
      setForm(toFormState(result.data))
      setSuccess('Perfil de inmobiliaria actualizado correctamente.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile || !permissions) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error || 'No se pudo cargar la configuración de inmobiliaria.'}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-ink-strong">Perfil de inmobiliaria</h1>
            <p className="text-sm text-muted-foreground">Configura marca, contacto, redes y narrativa pública.</p>
          </div>
          <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Rol actual: {permissions.membershipRole || 'sin rol'}
          </div>
        </div>

        {!canEdit ? (
          <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Tu rol actual es de lectura. Solo `owner` y `admin` pueden guardar cambios en este perfil.
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Nombre</span>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Slug</span>
            <input
              value={form.slug}
              onChange={(event) => updateField('slug', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block text-muted-foreground">Tagline</span>
            <input
              value={form.tagline}
              onChange={(event) => updateField('tagline', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block text-muted-foreground">Descripción institucional</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              disabled={!canEdit}
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink-strong">Contacto y presencia</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Email</span>
            <input
              type="email"
              value={form.contact_email}
              onChange={(event) => updateField('contact_email', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Teléfono</span>
            <input
              value={form.contact_phone}
              onChange={(event) => updateField('contact_phone', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">WhatsApp</span>
            <input
              value={form.whatsapp}
              onChange={(event) => updateField('whatsapp', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Sitio web</span>
            <input
              value={form.website}
              onChange={(event) => updateField('website', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Ciudad</span>
            <input
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Dirección</span>
            <input
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink-strong">Marca y medios</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <span className="block text-sm text-muted-foreground">Logo</span>
            <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
              {form.logo_url ? (
                <Image src={form.logo_url} alt="Logo" width={320} height={160} unoptimized className="h-32 w-full object-contain" />
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sin logo cargado</div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) => void handleMediaUpload(event.target.files?.[0], 'logo')}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={!canEdit || uploadingLogo}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-ink-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                Subir logo
              </button>
              <input
                value={form.logo_url}
                onChange={(event) => updateField('logo_url', event.target.value)}
                disabled={!canEdit}
                placeholder="URL pública del logo"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm text-muted-foreground">Portada</span>
            <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
              {form.cover_image_url ? (
                <Image
                  src={form.cover_image_url}
                  alt="Portada"
                  width={640}
                  height={240}
                  unoptimized
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sin portada cargada</div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) => void handleMediaUpload(event.target.files?.[0], 'cover')}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={!canEdit || uploadingCover}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-ink-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                Subir portada
              </button>
              <input
                value={form.cover_image_url}
                onChange={(event) => updateField('cover_image_url', event.target.value)}
                disabled={!canEdit}
                placeholder="URL pública de portada"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          </div>

          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block text-muted-foreground">Meta descripción</span>
            <input
              value={form.meta_description}
              onChange={(event) => updateField('meta_description', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink-strong">Especialización y redes</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Año de fundación</span>
            <input
              value={form.year_established}
              onChange={(event) => updateField('year_established', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <div className="text-xs text-muted-foreground md:pt-7">Redes cargadas: {socialPreview}</div>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block text-muted-foreground">Idiomas (separados por coma)</span>
            <input
              value={form.languages}
              onChange={(event) => updateField('languages', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block text-muted-foreground">Especialidades (separadas por coma)</span>
            <input
              value={form.specialties}
              onChange={(event) => updateField('specialties', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block text-muted-foreground">Certificaciones (separadas por coma)</span>
            <input
              value={form.certifications}
              onChange={(event) => updateField('certifications', event.target.value)}
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>

          {[
            ['instagram', 'Instagram'],
            ['facebook', 'Facebook'],
            ['linkedin', 'LinkedIn'],
            ['youtube', 'YouTube'],
            ['tiktok', 'TikTok'],
          ].map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="mb-1 block text-muted-foreground">{label}</span>
              <input
                value={form[key as keyof FormState]}
                onChange={(event) => updateField(key as keyof FormState, event.target.value)}
                disabled={!canEdit}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-accent-gold-soft/40 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-3 z-20 flex justify-end">
        <button
          type="submit"
          disabled={!canEdit || saving}
          className="inline-flex items-center gap-2 rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-5 py-2 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </button>
      </div>
    </form>
  )
}

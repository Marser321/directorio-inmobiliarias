import { createServerClient } from '@/lib/insforge/compat-ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  Building2,
  Calendar,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Youtube,
} from 'lucide-react'
import { buildAgencyValueScore } from '@/lib/scoring/agency-value'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface AgencyView {
  id: number
  name: string
  slug: string
  tagline: string | null
  description: string | null
  city: string | null
  address: string | null
  logo_url: string | null
  cover_image_url: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp: string | null
  website: string | null
  specialties: string[]
  certifications: string[]
  languages: string[]
  year_established: number | null
  avg_response_time: number | null
  is_verified: boolean
  tier_subscription: string
  total_properties: number
  total_views: number
  social_links: {
    instagram: string | null
    facebook: string | null
    linkedin: string | null
    youtube: string | null
    tiktok: string | null
  }
}

interface AgencyProperty {
  id: number
  title: string
  price: number | null
  currency: string | null
  status: string
  is_featured: boolean
  main_image: string | null
  location: string | null
  bedrooms: number | null
  bathrooms: number | null
}

type CommissionProfileRow = {
  operation_type: 'sale' | 'rent'
  commission_model: 'percent' | 'fixed' | 'mixed'
  commission_percent: number | null
  commission_fixed_amount: number | null
  currency: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  is_public: boolean
}

function isMissingTableError(error: { message?: string; code?: string } | null | undefined, table: string) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  return (
    code === '42p01' ||
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`relation 'public.${table}' does not exist`) ||
    message.includes(`could not find the '${table}' table`)
  )
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function asSocialLinks(value: unknown): AgencyView['social_links'] {
  if (!value || typeof value !== 'object') {
    return {
      instagram: null,
      facebook: null,
      linkedin: null,
      youtube: null,
      tiktok: null,
    }
  }

  const links = value as Record<string, unknown>

  return {
    instagram: asString(links.instagram),
    facebook: asString(links.facebook),
    linkedin: asString(links.linkedin),
    youtube: asString(links.youtube),
    tiktok: asString(links.tiktok),
  }
}

function normalizeAgencyRow(row: Record<string, unknown>): AgencyView {
  return {
    id: Number(row.id || 0),
    name: asString(row.name) || 'Inmobiliaria',
    slug: asString(row.slug) || 'sin-slug',
    tagline: asString(row.tagline),
    description: asString(row.description),
    city: asString(row.city),
    address: asString(row.address),
    logo_url: asString(row.logo_url),
    cover_image_url: asString(row.cover_image_url),
    contact_email: asString(row.contact_email),
    contact_phone: asString(row.contact_phone),
    whatsapp: asString(row.whatsapp),
    website: asString(row.website),
    specialties: asStringArray(row.specialties),
    certifications: asStringArray(row.certifications),
    languages: asStringArray(row.languages),
    year_established: asNumber(row.year_established),
    avg_response_time: asNumber(row.avg_response_time),
    is_verified: row.is_verified === true,
    tier_subscription: asString(row.tier_subscription) || 'basic',
    total_properties: asNumber(row.total_properties) || 0,
    total_views: asNumber(row.total_views) || 0,
    social_links: asSocialLinks(row.social_links),
  }
}

function normalizePropertyRow(row: Record<string, unknown>): AgencyProperty {
  const images = asStringArray(row.images)
  return {
    id: Number(row.id || 0),
    title: asString(row.title) || 'Propiedad',
    price: asNumber(row.price),
    currency: asString(row.currency),
    status: asString(row.status) || 'for_sale',
    is_featured: row.is_featured === true,
    main_image: asString(row.main_image) || images[0] || null,
    location: asString(row.location) || asString(row.address),
    bedrooms: asNumber(row.bedrooms),
    bathrooms: asNumber(row.bathrooms),
  }
}

function normalizeWhatsapp(raw: string) {
  return raw.replace(/[^\d]/g, '')
}

async function getAgency(slug: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // noop for server rendering
          }
        },
      },
    }
  )

  const { data: agencyRow } = await supabase.from('agencies').select('*').eq('slug', slug).maybeSingle()
  if (!agencyRow) return null

  const agency = normalizeAgencyRow((agencyRow || {}) as Record<string, unknown>)

  const { data: propertiesRows } = await supabase
    .from('properties')
    .select('*')
    .eq('agency_id', agency.id)
    .in('status', ['for_sale', 'for_rent'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(18)

  const properties = ((propertiesRows as unknown[] | null) || [])
    .map((row: unknown) => normalizePropertyRow((row || {}) as Record<string, unknown>))
    .filter((property: AgencyProperty) => property.id > 0)

  const valueScoreEnabled = process.env.FEATURE_AGENCY_VALUE_SCORE === 'true'
  let valueScore = null

  if (valueScoreEnabled) {
    let commissionProfile: CommissionProfileRow | null = null
    const { data: commissionRows, error: commissionError } = await supabase
      .from('agency_commission_profiles')
      .select('operation_type,commission_model,commission_percent,commission_fixed_amount,currency,verification_status,is_public')
      .eq('agency_id', agency.id)
      .eq('operation_type', 'sale')
      .eq('is_public', true)
      .limit(1)

    if (!commissionError && Array.isArray(commissionRows) && commissionRows.length > 0) {
      commissionProfile = commissionRows[0] as CommissionProfileRow
    } else if (commissionError && !isMissingTableError(commissionError as { message?: string; code?: string }, 'agency_commission_profiles')) {
      // Ignore non-fatal score enrichment issues to keep page available.
    }

    valueScore = buildAgencyValueScore({
      agency: {
        agency_id: agency.id,
        is_verified: agency.is_verified,
        avg_response_time: agency.avg_response_time,
        name: agency.name,
        tagline: agency.tagline,
        description: agency.description,
        website: agency.website,
        contact_phone: agency.contact_phone,
        whatsapp: agency.whatsapp,
        logo_url: agency.logo_url,
        cover_image_url: agency.cover_image_url,
        social_links: agency.social_links,
      },
      commissionProfile,
      propertyId: properties[0]?.id || null,
      propertyPrice: properties[0]?.price || null,
    })
  }

  return { agency, properties, valueScore }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getAgency(slug)

  if (!result) {
    return { title: 'Inmobiliaria no encontrada' }
  }

  const { agency } = result

  return {
    title: `${agency.name} | Inmobiliaria`,
    description:
      agency.description?.slice(0, 160) ||
      `${agency.name} en ${agency.city || 'Punta del Este'}: propiedades activas, contacto y señales de confianza.`,
    openGraph: {
      title: agency.name,
      description:
        agency.description?.slice(0, 160) ||
        `${agency.name} en ${agency.city || 'Punta del Este'}: perfil y propiedades destacadas.`,
      images: agency.cover_image_url ? [agency.cover_image_url] : agency.logo_url ? [agency.logo_url] : [],
    },
  }
}

function PropertyCard({ property }: { property: AgencyProperty }) {
  return (
    <Link
      href={`/property/${property.id}`}
      className="group overflow-hidden rounded-2xl border border-border/70 bg-card/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-gold-soft/35 hover:shadow-md"
    >
      <div className="relative h-44 bg-surface-2">
        {property.main_image ? (
          <Image
            src={property.main_image}
            alt={property.title}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
          </div>
        )}
        {property.is_featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">Destacada</span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-ink-strong">{property.title}</h3>
        <p className="text-sm text-muted-foreground">{property.location || 'Ubicación a confirmar'}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink-strong">
            {property.price
              ? new Intl.NumberFormat('es-UY', {
                  style: 'currency',
                  currency: property.currency || 'USD',
                  maximumFractionDigits: 0,
                }).format(property.price)
              : 'Precio a consultar'}
          </span>
          <span className="text-xs text-muted-foreground">
            {property.bedrooms ?? '-'} hab · {property.bathrooms ?? '-'} baños
          </span>
        </div>
      </div>
    </Link>
  )
}

export default async function AgencyPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getAgency(slug)

  if (!result) {
    notFound()
  }

  const { agency, properties, valueScore } = result
  const social = agency.social_links
  const whatsappHref = agency.whatsapp ? `https://wa.me/${normalizeWhatsapp(agency.whatsapp)}` : null

  return (
    <div className="min-h-screen bg-editorial-layer">
      <section className="relative overflow-hidden border-b border-border/70 bg-card">
        <div className="bg-photo-fade absolute inset-0">
          {agency.cover_image_url ? (
            <Image
              src={agency.cover_image_url}
              alt={agency.name}
              fill
              unoptimized
              sizes="100vw"
              className="object-cover opacity-55"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface-1 to-surface-2" />
          )}
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:py-16">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white/90">
              {agency.logo_url ? (
                <Image src={agency.logo_url} alt={agency.name} width={80} height={80} unoptimized className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold text-white md:text-4xl">{agency.name}</h1>
              {agency.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/50 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verificada
                </span>
              ) : null}
            </div>
            {agency.tagline ? <p className="text-base text-white/85">{agency.tagline}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/20 px-2 py-1">
                <MapPin className="h-3.5 w-3.5" />
                {agency.city || 'Sin ciudad'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/20 px-2 py-1">
                <Star className="h-3.5 w-3.5" />
                Plan {agency.tier_subscription.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/20 px-2 py-1">
                {agency.total_properties} propiedades
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-white/35 bg-black/25 p-4 text-white backdrop-blur">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}
            {agency.contact_phone ? (
              <a
                href={`tel:${agency.contact_phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
                {agency.contact_phone}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-border/60 bg-surface-0/95 backdrop-blur supports-[backdrop-filter]:bg-surface-0/80">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 text-sm">
          {[
            { href: '#resumen', label: 'Resumen' },
            { href: '#propiedades', label: 'Propiedades' },
            { href: '#credenciales', label: 'Credenciales' },
            { href: '#contacto', label: 'Contacto' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-muted-foreground transition-colors hover:border-accent-gold-soft/35 hover:text-ink-strong"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-6">
          <section id="resumen" className="rounded-2xl border border-border/70 bg-card/90 p-6">
            <h2 className="text-xl font-semibold text-ink-strong">Resumen</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {agency.description ||
                'Esta inmobiliaria todavía no agregó su descripción institucional. Podés contactarla directamente para conocer su propuesta de valor.'}
            </p>
            {valueScore ? (
              <div className="mt-4 rounded-xl border border-accent-gold-soft/30 bg-accent-gold-soft/10 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Value Score</p>
                <p className="mt-1 text-xl font-semibold text-ink-strong">{valueScore.value_score.toFixed(1)} / 100</p>
                <p className="text-xs text-muted-foreground">
                  Costo {valueScore.cost_score.toFixed(1)} · Transparencia {valueScore.transparency_score.toFixed(1)} · Operación{' '}
                  {valueScore.operational_score.toFixed(1)}
                </p>
              </div>
            ) : null}
            <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
              <div className="rounded-xl bg-surface-1/70 p-3">
                <p className="text-xs uppercase tracking-wide">Tiempo de respuesta</p>
                <p className="mt-1 text-base font-medium text-ink-strong">
                  {agency.avg_response_time ? `${agency.avg_response_time}h` : 'Sin dato'}
                </p>
              </div>
              <div className="rounded-xl bg-surface-1/70 p-3">
                <p className="text-xs uppercase tracking-wide">Vistas acumuladas</p>
                <p className="mt-1 text-base font-medium text-ink-strong">{agency.total_views}</p>
              </div>
              <div className="rounded-xl bg-surface-1/70 p-3">
                <p className="text-xs uppercase tracking-wide">Fundada</p>
                <p className="mt-1 text-base font-medium text-ink-strong">{agency.year_established || 'Sin dato'}</p>
              </div>
            </div>
          </section>

          <section id="propiedades" className="rounded-2xl border border-border/70 bg-card/90 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-ink-strong">Propiedades destacadas</h2>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{properties.length} resultados</span>
            </div>
            {properties.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-1/55 px-4 py-8 text-center text-sm text-muted-foreground">
                Esta inmobiliaria aún no publicó propiedades activas. Volvé pronto o contáctala para recibir inventario actualizado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </section>

          <section id="credenciales" className="rounded-2xl border border-border/70 bg-card/90 p-6">
            <h2 className="text-xl font-semibold text-ink-strong">Credenciales y enfoque</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-surface-1/70 p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink-strong">
                  <ShieldCheck className="h-4 w-4" />
                  Certificaciones
                </p>
                {agency.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agency.certifications.map((item) => (
                      <span key={item} className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin certificaciones publicadas.</p>
                )}
              </div>

              <div className="rounded-xl bg-surface-1/70 p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink-strong">
                  <Languages className="h-4 w-4" />
                  Idiomas
                </p>
                {agency.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agency.languages.map((item) => (
                      <span key={item} className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin idiomas informados.</p>
                )}
              </div>

              <div className="rounded-xl bg-surface-1/70 p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink-strong">
                  <Calendar className="h-4 w-4" />
                  Especialidades
                </p>
                {agency.specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agency.specialties.map((item) => (
                      <span key={item} className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin especialidades publicadas.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside id="contacto" className="sticky top-32 h-fit space-y-4">
          <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
            <h2 className="text-lg font-semibold text-ink-strong">Contacto</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {agency.address || agency.city ? (
                <p className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {agency.address ? `${agency.address}, ` : ''}
                    {agency.city || 'Sin ciudad'}
                  </span>
                </p>
              ) : null}
              {agency.contact_email ? (
                <a href={`mailto:${agency.contact_email}`} className="inline-flex items-center gap-2 hover:text-ink-strong">
                  <Mail className="h-4 w-4" />
                  {agency.contact_email}
                </a>
              ) : null}
              {agency.contact_phone ? (
                <a href={`tel:${agency.contact_phone}`} className="inline-flex items-center gap-2 hover:text-ink-strong">
                  <Phone className="h-4 w-4" />
                  {agency.contact_phone}
                </a>
              ) : null}
              {agency.website ? (
                <a href={agency.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-ink-strong">
                  <Globe className="h-4 w-4" />
                  Sitio web
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-4 py-2 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
              >
                <MessageCircle className="h-4 w-4" />
                Escribir por WhatsApp
              </a>
            ) : null}
            <Link
              href="/legal/comisiones-inmobiliarias"
              className="mt-3 inline-block text-xs text-muted-foreground underline hover:text-ink-strong"
            >
              Guía legal informativa sobre comisiones
            </Link>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/90 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Redes y presencia</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {social.instagram ? (
                <a href={social.instagram} target="_blank" rel="noreferrer" className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-ink-strong">
                  <Instagram className="mr-1 inline h-3.5 w-3.5" /> Instagram
                </a>
              ) : null}
              {social.facebook ? (
                <a href={social.facebook} target="_blank" rel="noreferrer" className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-ink-strong">
                  <Facebook className="mr-1 inline h-3.5 w-3.5" /> Facebook
                </a>
              ) : null}
              {social.youtube ? (
                <a href={social.youtube} target="_blank" rel="noreferrer" className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-ink-strong">
                  <Youtube className="mr-1 inline h-3.5 w-3.5" /> YouTube
                </a>
              ) : null}
              {!social.instagram && !social.facebook && !social.youtube ? (
                <p className="text-sm text-muted-foreground">Esta inmobiliaria todavía no conectó sus redes.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

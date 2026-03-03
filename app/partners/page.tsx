import { cookies } from 'next/headers'
import Link from 'next/link'
import { createServerClient } from '@/lib/insforge/compat-ssr'
import type { AgencyDirectoryItem } from '@/types/domain'
import { AgencyDirectoryCard } from '@/components/partners/AgencyDirectoryCard'
import { AgencyDirectoryFilters } from '@/components/partners/AgencyDirectoryFilters'
import { AgencyDirectoryEmptyState } from '@/components/partners/AgencyDirectoryEmptyState'

interface PartnersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function normalizeAgencyRow(row: Record<string, unknown>): AgencyDirectoryItem {
  return {
    id: Number(row.id || 0),
    name: typeof row.name === 'string' ? row.name : 'Inmobiliaria',
    slug: typeof row.slug === 'string' ? row.slug : 'sin-slug',
    city: typeof row.city === 'string' ? row.city : null,
    tagline: typeof row.tagline === 'string' ? row.tagline : null,
    description: typeof row.description === 'string' ? row.description : null,
    logo_url: typeof row.logo_url === 'string' ? row.logo_url : null,
    cover_image_url: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
    tier_subscription: typeof row.tier_subscription === 'string' ? row.tier_subscription : null,
    is_verified: row.is_verified === true,
    avg_response_time: typeof row.avg_response_time === 'number' ? row.avg_response_time : null,
    total_properties: typeof row.total_properties === 'number' ? row.total_properties : 0,
    total_views: typeof row.total_views === 'number' ? row.total_views : 0,
    featured_until: typeof row.featured_until === 'string' ? row.featured_until : null,
  }
}

async function getDirectoryData(filters: {
  q: string
  city: string
  tier: string
  verifiedOnly: boolean
}) {
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
            // noop in SSR rendering contexts
          }
        },
      },
    }
  )

  let query = supabase
    .from('agencies')
    .select(
      'id, name, slug, city, tagline, description, logo_url, cover_image_url, tier_subscription, is_verified, avg_response_time, total_properties, total_views, featured_until'
    )

  if (filters.q) {
    const safeQuery = filters.q.replace(/[,]/g, ' ').trim()
    query = query.or(`name.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%`)
  }

  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }

  if (filters.tier) {
    query = query.eq('tier_subscription', filters.tier)
  }

  if (filters.verifiedOnly) {
    query = query.eq('is_verified', true)
  }

  const { data } = await query
    .order('is_verified', { ascending: false })
    .order('featured_until', { ascending: false, nullsFirst: false })
    .order('total_properties', { ascending: false })
    .order('total_views', { ascending: false })
    .limit(80)

  const agencies = Array.isArray(data)
    ? data
        .map((row) => normalizeAgencyRow((row || {}) as Record<string, unknown>))
        .filter((agency) => agency.id > 0 && agency.slug !== 'sin-slug')
    : []

  const { data: cityRows } = await supabase
    .from('agencies')
    .select('city')
    .not('city', 'is', null)
    .order('city', { ascending: true })
    .limit(200)

  const cityOptions = Array.from(
    new Set(
      ((cityRows as Array<{ city?: unknown }> | null) || [])
        .map((row: { city?: unknown }) => (typeof row.city === 'string' ? row.city.trim() : ''))
        .filter((name: string) => name.length > 0)
    )
  )

  return { agencies, cityOptions }
}

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const params = await searchParams
  const q = getValue(params.q).trim()
  const city = getValue(params.city).trim()
  const tier = getValue(params.tier).trim()
  const verifiedOnly = getValue(params.verified) === 'true'

  const { agencies, cityOptions } = await getDirectoryData({ q, city, tier, verifiedOnly })

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-editorial-layer px-4 pb-10 pt-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/80">
          <div className="bg-photo-fade bg-grain-subtle relative isolate px-6 py-10 md:px-10">
            <div className="relative z-10 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Directorio de Inmobiliarias</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink-strong md:text-4xl">
                Encontrá agencias con respaldo operativo, inventario real y perfiles completos.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Explorá por ciudad, plan y verificación. Cada ficha concentra señales de confianza y acceso directo a sus propiedades.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/80 bg-background px-3 py-1">{agencies.length} resultados</span>
                <Link
                  href="/partners/registro"
                  className="rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-3 py-1 font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
                >
                  Publicar inmobiliaria
                </Link>
              </div>
            </div>
          </div>
        </section>

        <AgencyDirectoryFilters
          query={q}
          city={city}
          tier={tier}
          verifiedOnly={verifiedOnly}
          cityOptions={cityOptions}
        />

        {agencies.length === 0 ? (
          <AgencyDirectoryEmptyState />
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agencies.map((agency) => (
              <AgencyDirectoryCard key={agency.id} agency={agency} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

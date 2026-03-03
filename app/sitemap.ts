import { MetadataRoute } from 'next'
import { createClient } from '@/lib/insforge/compat-supabase'

type SitemapProperty = {
    id?: number | string
    slug?: string | null
    updated_at?: string | null
}

type SitemapAgency = {
    slug?: string | null
    updated_at?: string | null
}

const SEO_ZONES = ['punta-del-este', 'la-barra', 'jose-ignacio', 'manantiales']
const SEO_TYPES = ['casas', 'apartamentos', 'chacras', 'terrenos']
const SEO_LIFESTYLES = ['vida-nocturna', 'silencio-paz', 'golf-bosque', 'surf-olas', 'familiar']

function isMissingColumnError(errorMessage: string | undefined, column: string) {
    const message = (errorMessage || '').toLowerCase()
    const normalized = column.toLowerCase()
    return message.includes(`column ${normalized}`) || message.includes(`"${normalized}"`) || message.includes(normalized)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://realstate-nu.vercel.app').replace(/\/$/, '')
    const supabase = createClient(
        process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
        process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
    )

    const staticPages: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/partners`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
        { url: `${baseUrl}/privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/terminos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ]

    const seoLandingPages: MetadataRoute.Sitemap = [
        ...SEO_ZONES.flatMap((zone) =>
            SEO_TYPES.map((type) => ({
                url: `${baseUrl}/maldonado/${zone}/${type}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }))
        ),
        ...SEO_ZONES.flatMap((zone) =>
            SEO_LIFESTYLES.map((lifestyle) => ({
                url: `${baseUrl}/maldonado/${zone}/${lifestyle}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.65,
            }))
        ),
    ]

    let properties: SitemapProperty[] = []

    const primaryPropertiesResult = await supabase
        .from('properties')
        .select('id, slug, updated_at, status, publication_status')
        .in('status', ['for_sale', 'for_rent'])
        .eq('publication_status', 'published')
        .order('updated_at', { ascending: false })
        .limit(1000)

    if (primaryPropertiesResult.error && isMissingColumnError(primaryPropertiesResult.error.message, 'publication_status')) {
        const fallbackPropertiesResult = await supabase
            .from('properties')
            .select('id, slug, updated_at, status')
            .in('status', ['for_sale', 'for_rent'])
            .order('updated_at', { ascending: false })
            .limit(1000)

        properties = (fallbackPropertiesResult.data || []) as SitemapProperty[]
    } else {
        properties = (primaryPropertiesResult.data || []) as SitemapProperty[]
    }

    const propertyPages: MetadataRoute.Sitemap = properties
        .filter((property) => Boolean(property.slug || property.id))
        .map((property) => ({
            url: `${baseUrl}/property/${property.slug || property.id}`,
            lastModified: property.updated_at ? new Date(property.updated_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.75,
        }))

    const { data: agencies } = await supabase
        .from('agencies')
        .select('slug, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200)

    const agencyPages: MetadataRoute.Sitemap = ((agencies || []) as SitemapAgency[])
        .filter((agency) => Boolean(agency.slug))
        .map((agency) => ({
            url: `${baseUrl}/agencies/${agency.slug}`,
            lastModified: agency.updated_at ? new Date(agency.updated_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }))

    return [...staticPages, ...seoLandingPages, ...propertyPages, ...agencyPages]
}

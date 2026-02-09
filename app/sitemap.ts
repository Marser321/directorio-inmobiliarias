import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for server-side use
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Zonas de Punta del Este / Maldonado para SEO Long Tail
const ZONES = [
    { slug: 'punta-del-este', name: 'Punta del Este' },
    { slug: 'la-barra', name: 'La Barra' },
    { slug: 'jose-ignacio', name: 'José Ignacio' },
    { slug: 'manantiales', name: 'Manantiales' },
    { slug: 'montoya', name: 'Montoya' },
    { slug: 'beverly-hills', name: 'Beverly Hills' },
    { slug: 'san-rafael', name: 'San Rafael' },
    { slug: 'pinares', name: 'Pinares' },
    { slug: 'garzon', name: 'Garzón' },
    { slug: 'maldonado', name: 'Maldonado Ciudad' }
]

// Tipos de propiedad para rutas específicas
const PROPERTY_TYPES = [
    { slug: 'casas', name: 'Casas' },
    { slug: 'apartamentos', name: 'Apartamentos' },
    { slug: 'chacras', name: 'Chacras' },
    { slug: 'terrenos', name: 'Terrenos' },
    { slug: 'ph', name: 'PH' }
]

// Lifestyle Vibes
const VIBES = [
    { slug: 'vida-nocturna', tag: 'nightlife' },
    { slug: 'silencio-paz', tag: 'silence' },
    { slug: 'golf-bosque', tag: 'golf' },
    { slug: 'surf-olas', tag: 'surf' },
    { slug: 'familiar', tag: 'family' }
]

// Servicios para Long Tail
const SERVICES = [
    { slug: 'electricistas', name: 'Electricistas' },
    { slug: 'plomeros', name: 'Plomeros' },
    { slug: 'jardineros', name: 'Jardineros' },
    { slug: 'limpieza', name: 'Limpieza' },
    { slug: 'seguridad', name: 'Seguridad' },
    { slug: 'piscinas', name: 'Mantenimiento Piscinas' }
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://realstate-nu.vercel.app'

    // ============================================
    // 1. PÁGINAS ESTÁTICAS
    // ============================================
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/explore`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/partners/registro`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]

    // ============================================
    // 2. RUTAS DINÁMICAS: ZONA + TIPO
    // Ejemplo: /maldonado/punta-del-este/casas
    // ============================================
    const zoneTypePages: MetadataRoute.Sitemap = ZONES.flatMap(zone =>
        PROPERTY_TYPES.map(type => ({
            url: `${baseUrl}/maldonado/${zone.slug}/${type.slug}`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        }))
    )

    // ============================================
    // 3. RUTAS DINÁMICAS: ZONA + VIBE
    // Ejemplo: /maldonado/jose-ignacio/silencio-paz
    // ============================================
    const zoneVibePages: MetadataRoute.Sitemap = ZONES.flatMap(zone =>
        VIBES.map(vibe => ({
            url: `${baseUrl}/maldonado/${zone.slug}/${vibe.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.75,
        }))
    )

    // ============================================
    // 4. RUTAS DE SERVICIOS LONG TAIL
    // Ejemplo: /punta-del-este/servicios/electricistas-urgencia-24hs
    // ============================================
    const servicePages: MetadataRoute.Sitemap = ZONES.slice(0, 5).flatMap(zone =>
        SERVICES.map(service => ({
            url: `${baseUrl}/${zone.slug}/servicios/${service.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }))
    )

    // ============================================
    // 5. PROPIEDADES INDIVIDUALES
    // ============================================
    const { data: properties, error } = await supabase
        .from('properties')
        .select('slug, updated_at, is_featured, boost_level')
        .in('status', ['for_sale', 'for_rent'])
        .order('is_featured', { ascending: false })
        .order('boost_level', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1000) // Limitar para performance

    if (error) {
        console.error('Sitemap: Failed to fetch properties:', error)
        return [...staticPages, ...zoneTypePages]
    }

    const propertyPages: MetadataRoute.Sitemap = (properties || []).map((property) => ({
        url: `${baseUrl}/property/${property.slug}`,
        lastModified: new Date(property.updated_at),
        changeFrequency: 'weekly' as const,
        // Prioridad basada en boost level y featured
        priority: property.boost_level >= 3 ? 0.95 :
            property.boost_level >= 2 ? 0.9 :
                property.is_featured ? 0.85 : 0.7,
    }))

    // ============================================
    // 6. PÁGINAS DE AGENCIAS
    // ============================================
    const { data: agencies } = await supabase
        .from('agencies')
        .select('slug, updated_at, is_verified')
        .eq('is_verified', true)
        .order('total_properties', { ascending: false })
        .limit(100)

    const agencyPages: MetadataRoute.Sitemap = (agencies || []).map((agency) => ({
        url: `${baseUrl}/partners/${agency.slug}`,
        lastModified: new Date(agency.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.65,
    }))

    return [
        ...staticPages,
        ...zoneTypePages,
        ...zoneVibePages,
        ...servicePages,
        ...propertyPages,
        ...agencyPages
    ]
}


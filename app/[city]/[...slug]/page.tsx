import { notFound, redirect } from "next/navigation"

interface PageProps {
    params: Promise<{
        city: string
        slug?: string[]
    }>
}

const RESERVED_PREFIXES = new Set([
    'admin',
    'api',
    'partners',
    'property',
    'agencies',
    '_next',
    'search',
    'explore',
    'privacidad',
    'terminos',
    'sitemap.xml',
    'robots.txt',
    'favicon.ico',
])

const PROPERTY_TYPE_MAP: Record<string, string> = {
    casas: 'casa',
    apartamentos: 'apartamento',
    chacras: 'chacra',
    terrenos: 'terreno',
    ph: 'apartamento',
}

const LIFESTYLE_MAP: Record<string, string> = {
    'vida-nocturna': 'nightlife',
    'silencio-paz': 'silence',
    'golf-bosque': 'golf',
    'surf-olas': 'surf',
    familiar: 'family',
}

function toHumanText(value: string) {
    return value
        .split('-')
        .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
        .join(' ')
}

function isReservedPath(params: { city: string; slug?: string[] }) {
    if (RESERVED_PREFIXES.has(params.city.toLowerCase())) {
        return true
    }

    const firstSlugSegment = params.slug?.[0]?.toLowerCase()
    if (!firstSlugSegment) {
        return false
    }

    return RESERVED_PREFIXES.has(firstSlugSegment)
}

function buildSearchParams(city: string, slug?: string[]) {
    const params = new URLSearchParams()
    const normalizedCity = city.toLowerCase()
    const firstSegment = slug?.[0]?.toLowerCase()
    const secondSegment = slug?.[1]?.toLowerCase()

    const zoneSegment = secondSegment ? firstSegment : undefined
    const categorySegment = secondSegment || firstSegment

    if (zoneSegment) {
        params.set('q', toHumanText(zoneSegment))
    } else if (normalizedCity !== 'maldonado') {
        params.set('q', toHumanText(city))
    }

    if (categorySegment && PROPERTY_TYPE_MAP[categorySegment]) {
        params.set('type', PROPERTY_TYPE_MAP[categorySegment])
    }

    if (categorySegment && LIFESTYLE_MAP[categorySegment]) {
        params.set('lifestyles', LIFESTYLE_MAP[categorySegment])
    }

    return params
}

export async function generateMetadata({ params }: PageProps) {
    const { city, slug } = await params

    if (isReservedPath({ city, slug })) {
        return {
            title: 'Página no encontrada',
            robots: {
                index: false,
                follow: false,
            },
        }
    }

    const firstSegment = slug?.[0]
    const secondSegment = slug?.[1]
    const zone = secondSegment ? firstSegment : undefined
    const filter = secondSegment || firstSegment

    const titleParts = [
        filter ? toHumanText(filter) : 'Propiedades de lujo',
        zone ? `en ${toHumanText(zone)}` : (city.toLowerCase() !== 'maldonado' ? `en ${toHumanText(city)}` : 'en Maldonado')
    ]

    const title = `${titleParts.join(' ')} | Luxe Estate`

    return {
        title,
        description: `Explora resultados filtrados de ${titleParts.join(' ')} con mapa interactivo y contacto directo por WhatsApp.`,
    }
}

export default async function DynamicSEOPage({ params }: PageProps) {
    const { city, slug } = await params

    if (isReservedPath({ city, slug })) {
        notFound()
    }

    const searchParams = buildSearchParams(city, slug)
    const target = `/search${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    redirect(target)
}

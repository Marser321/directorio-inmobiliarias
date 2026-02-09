import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    MapPin,
    Phone,
    Mail,
    Globe,
    MessageCircle,
    Building2,
    CheckCircle,
    Calendar,
    ExternalLink,
    Instagram,
    Facebook,
    Linkedin,
    Youtube,
    Award,
    Tag,
    Clock
} from 'lucide-react'

interface PageProps {
    params: Promise<{ slug: string }>
}

async function getAgency(slug: string) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: agency } = await supabase
        .from('agencies')
        .select('*')
        .eq('slug', slug)
        .single()

    if (!agency) return null

    // Fetch agency properties
    const { data: properties } = await supabase
        .from('properties')
        .select('id, title, slug, price, currency, status, images, location')
        .eq('agency_id', agency.id)
        .eq('status', 'for_sale')
        .order('created_at', { ascending: false })
        .limit(12)

    return { agency, properties: properties || [] }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const result = await getAgency(slug)

    if (!result) {
        return { title: 'Agencia no encontrada' }
    }

    const { agency } = result

    return {
        title: `${agency.name} | Inmobiliaria en ${agency.city || 'Punta del Este'}`,
        description: agency.meta_description || agency.description?.substring(0, 160) || `${agency.name} - Inmobiliaria de confianza en ${agency.city || 'Punta del Este'}. Propiedades de lujo, casas, apartamentos y más.`,
        openGraph: {
            title: agency.name,
            description: agency.meta_description || agency.description?.substring(0, 160),
            images: agency.cover_image_url ? [agency.cover_image_url] : (agency.logo_url ? [agency.logo_url] : []),
        },
    }
}

export default async function AgencyPage({ params }: PageProps) {
    const { slug } = await params
    const result = await getAgency(slug)

    if (!result) {
        notFound()
    }

    const { agency, properties } = result
    const social = agency.social_links || {}

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className={`relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white ${agency.cover_image_url ? 'min-h-[300px]' : ''}`}>

                {/* Cover Image Background */}
                {agency.cover_image_url && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={agency.cover_image_url}
                            alt="Cover"
                            className="w-full h-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    </div>
                )}

                <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        {/* Logo */}
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl p-4 shadow-xl flex-shrink-0 border-4 border-white">
                            {agency.logo_url ? (
                                <img
                                    src={agency.logo_url}
                                    alt={agency.name}
                                    className="w-full h-full object-contain"
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl">
                                    <Building2 className="w-16 h-16 text-slate-400" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-2 flex-wrap">
                                <h1 className="text-3xl md:text-4xl font-bold">{agency.name}</h1>
                                {agency.is_verified && (
                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Verificada
                                    </Badge>
                                )}
                            </div>

                            {agency.tagline && (
                                <p className="text-xl text-slate-300 mb-4 font-light italic">"{agency.tagline}"</p>
                            )}

                            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6 text-slate-300">
                                {agency.city && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {agency.address && <span className="mr-1">{agency.address},</span>}
                                        {agency.city}
                                    </div>
                                )}

                                {agency.year_established && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        Est. {agency.year_established}
                                    </div>
                                )}
                            </div>

                            {/* Social Links */}
                            <div className="flex items-center justify-center md:justify-start gap-3">
                                {social.instagram && (
                                    <a href={social.instagram.startsWith('http') ? social.instagram : `https://instagram.com/${social.instagram.replace('@', '')}`} target="_blank" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                )}
                                {social.facebook && (
                                    <a href={social.facebook} target="_blank" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                )}
                                {social.linkedin && (
                                    <a href={social.linkedin} target="_blank" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                                        <Linkedin className="w-5 h-5" />
                                    </a>
                                )}
                                {social.youtube && (
                                    <a href={social.youtube} target="_blank" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                                        <Youtube className="w-5 h-5" />
                                    </a>
                                )}
                                {agency.website && (
                                    <a href={agency.website} target="_blank" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                                        <Globe className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* About */}
                        {(agency.description || (agency.specialties && agency.specialties.length > 0)) && (
                            <section className="bg-white rounded-2xl p-6 shadow-sm border">
                                <h2 className="text-xl font-bold mb-4">Sobre Nosotros</h2>
                                {agency.description && (
                                    <p className="text-slate-600 whitespace-pre-line mb-6">{agency.description}</p>
                                )}

                                {agency.specialties && agency.specialties.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Especialidades</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {agency.specialties.map((spec: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200">
                                                    <Tag className="w-3 h-3 mr-2 text-slate-400" />
                                                    {spec}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Properties */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Propiedades Destacadas ({properties.length})</h2>
                            </div>

                            {properties.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {properties.map((property: any) => (
                                        <Link
                                            key={property.id}
                                            href={`/property/${property.id}`}
                                            className="group rounded-xl overflow-hidden border hover:shadow-lg transition-shadow bg-white"
                                        >
                                            <div className="aspect-video bg-slate-100 relative">
                                                {property.images?.[0] ? (
                                                    <img
                                                        src={property.images[0]}
                                                        alt={property.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <Building2 className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <Badge className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm border-0 text-white hover:bg-black/60">
                                                    {property.status === 'for_sale' ? 'En Venta' : 'En Alquiler'}
                                                </Badge>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {property.title}
                                                </h3>
                                                <div className="flex items-center text-slate-500 text-sm mt-1 mb-2">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {property.location || 'Ubicación no disponible'}
                                                </div>
                                                <p className="text-lg font-bold text-slate-900">
                                                    {property.currency} {property.price?.toLocaleString()}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-8">
                                    Esta agencia aún no tiene propiedades publicadas para mostrar.
                                </p>
                            )}
                        </section>

                        {/* Certifications & Languages */}
                        {(agency.certifications?.length > 0 || agency.languages?.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {agency.certifications && agency.certifications.length > 0 && (
                                    <section className="bg-white rounded-2xl p-6 shadow-sm border">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Award className="w-5 h-5 text-amber-500" />
                                            Certificaciones
                                        </h3>
                                        <ul className="space-y-2">
                                            {agency.certifications.map((cert: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-slate-600">
                                                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 flex-shrink-0" />
                                                    <span>{cert}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                {agency.languages && agency.languages.length > 0 && (
                                    <section className="bg-white rounded-2xl p-6 shadow-sm border">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Globe className="w-5 h-5 text-blue-500" />
                                            Idiomas
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {agency.languages.map((lang: string, i: number) => (
                                                <Badge key={i} variant="outline" className="border-slate-200">
                                                    {lang}
                                                </Badge>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Sidebar - Contact */}
                    <aside className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border sticky top-6">
                            <h2 className="text-xl font-bold mb-6">Contacto</h2>

                            <div className="space-y-4">
                                {agency.contact_email && (
                                    <a
                                        href={`mailto:${agency.contact_email}`}
                                        className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                            <Mail className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                                        </div>
                                        <span className="text-sm font-medium">{agency.contact_email}</span>
                                    </a>
                                )}

                                {agency.contact_phone && (
                                    <a
                                        href={`tel:${agency.contact_phone}`}
                                        className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                            <Phone className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                                        </div>
                                        <span className="text-sm font-medium">{agency.contact_phone}</span>
                                    </a>
                                )}

                                {agency.website && (
                                    <a
                                        href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`}
                                        target="_blank"
                                        className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                            <Globe className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                                        </div>
                                        <span className="text-sm font-medium">Sitio Web</span>
                                        <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                                    </a>
                                )}

                                {agency.address && (
                                    <div className="flex items-start gap-3 text-slate-600 pt-4 border-t mt-2">
                                        <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm">{agency.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* CTA */}
                            {agency.whatsapp && (
                                <Button
                                    asChild
                                    className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
                                    size="lg"
                                >
                                    <a
                                        href={`https://wa.me/${agency.whatsapp.replace(/[^0-9]/g, '')}?text=Hola! Vi su perfil en el directorio de inmobiliarias y me gustaría más información.`}
                                        target="_blank"
                                    >
                                        <MessageCircle className="w-5 h-5 mr-2" />
                                        Contactar por WhatsApp
                                    </a>
                                </Button>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border">
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">Estadísticas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <span className="block text-2xl font-bold text-slate-800">{properties.length}</span>
                                    <span className="text-xs text-slate-500 font-medium">Propiedades</span>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <span className="block text-2xl font-bold text-slate-800">{agency.total_views || 0}</span>
                                    <span className="text-xs text-slate-500 font-medium">Vistas</span>
                                </div>
                                {agency.avg_response_time && (
                                    <div className="col-span-2 flex items-center justify-center gap-2 text-sm text-slate-600 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        Tiempo resp. prom: <span className="font-semibold">{agency.avg_response_time}h</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}

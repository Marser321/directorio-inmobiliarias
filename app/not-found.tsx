import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { ArrowRight, Home } from 'lucide-react'

// Luxe Components
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/luxe/Footer'

interface FeaturedProperty {
    id: number
    title: string
    slug: string
    main_image: string | null
    description: string | null
    price: number
    currency: string
    locations: {
        name: string
        type: string
    } | null
}

export default async function NotFound() {
    const supabase = await createClient()

    // Fetch candidates and keep selection deterministic for stable renders.
    const { data } = await supabase
        .from('properties')
        .select('id, title, slug, main_image, description, price, currency, locations(name, type)')
        .eq('status', 'for_sale')
        .limit(12)

    const allSuggestions = (data as unknown as FeaturedProperty[]) || []

    const suggestions = [...allSuggestions]
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .slice(0, 3)

    return (
        <>
            <Header />
            <main className="min-h-screen pt-24 pb-20 bg-background">
                <div className="container mx-auto px-4">

                    {/* Hero 404 Section */}
                    <div className="text-center py-20 max-w-3xl mx-auto space-y-6">
                        <div className="inline-block px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 text-gold text-sm font-medium mb-4 animate-in">
                            Pagina No Encontrada
                        </div>

                        <h1 className="text-6xl md:text-8xl font-serif font-bold text-foreground mb-4 animate-in [animation-delay:100ms]">
                            4<span className="text-gold">0</span>4
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground font-light animate-in [animation-delay:200ms]">
                            La propiedad que buscas ya no está disponible, pero hemos seleccionado estas opciones exclusivas para ti.
                        </p>

                        <div className="pt-8 flex justify-center animate-in [animation-delay:300ms]">
                            <Link
                                href="/"
                                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background rounded-full hover:bg-gold hover:text-white transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <Home className="w-5 h-5 relative z-10" />
                                <span className="font-medium relative z-10">Volver al Inicio</span>
                            </Link>
                        </div>
                    </div>

                    {/* Exclusive Options Grid */}
                    {suggestions.length > 0 && (
                        <div className="mt-16 animate-in [animation-delay:500ms]">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-serif font-bold">Opciones Exclusivas</h2>
                                <Link href="/explore" className="text-gold flex items-center gap-2 hover:underline">
                                    Ver todas <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {suggestions.map((property) => (
                                    <Link
                                        key={property.id}
                                        href={`/property/${property.slug}`}
                                        className="group block"
                                    >
                                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-muted">
                                            <Image
                                                src={property.main_image || '/images/placeholders/luxury-villa.jpg'}
                                                alt={property.title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-foreground">
                                                {property.locations?.name}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-serif font-bold mb-2 group-hover:text-gold transition-colors">
                                            {property.title}
                                        </h3>
                                        <p className="text-muted-foreground line-clamp-2 text-sm">
                                            {property.description}
                                        </p>
                                        <div className="mt-4 text-lg font-medium">
                                            {property.currency} {property.price.toLocaleString()}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </main>
            <Footer />
        </>
    )
}

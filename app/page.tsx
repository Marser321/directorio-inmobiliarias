// @regression-guard-locked: Luxe Estate v2.0 - Complete redesign

import { HeroSection } from "@/components/luxe/HeroSection";
import { BentoGrid } from "@/components/luxe/BentoGrid";
import { LifestyleCategories } from "@/components/luxe/LifestyleCategories";
import { MapWithListings } from "@/components/luxe/MapWithListings";
import { Footer } from "@/components/luxe/Footer";
import { createClient } from "@/utils/supabase/server";
export const revalidate = 120;

type HomeProperty = {
  id?: number | string
  title?: string | null
  slug?: string | null
  built_area?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  price?: number | null
  boost_level?: number | null
  currency?: string | null
  main_image?: string | null
  images?: string[] | null
  lifestyle_tags?: string[] | null
  location?: { name?: string | null } | null
} & Record<string, unknown>

export default async function Home() {
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*, location:locations(*)")
    .eq("status", "for_sale")
    .order("boost_level", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  // Fallback if DB is empty or error (though we just seeded)
  const displayProperties = ((properties || []) as HomeProperty[]).map((p, index) => ({
    ...p,
    id: typeof p.id === 'number' || typeof p.id === 'string' ? p.id : `property-${index}`,
    title: p.title || 'Propiedad destacada',
    slug: p.slug || undefined,
    // Ensure numbers are numbers, not null
    built_area: p.built_area || 0,
    bedrooms: p.bedrooms || 0,
    bathrooms: p.bathrooms || 0,
    price: p.price || 0,
    boost_level: p.boost_level || 1,
    // Ensure strings/arrays
    currency: p.currency || 'USD',
    main_image: p.main_image || '/images/placeholders/luxury-villa.jpg', // Fallback image
    images: p.images || [],
    lifestyle_tags: p.lifestyle_tags || [],
    // Flatten location name if available
    location: p.location?.name || 'Punta del Este'
  }));

  const inventoryCount = displayProperties.length
  const avgPrice = inventoryCount
    ? Math.round(displayProperties.reduce((acc, property) => acc + Number(property.price || 0), 0) / inventoryCount)
    : 0
  const avgM2 = inventoryCount
    ? Math.round(displayProperties.reduce((acc, property) => acc + Number(property.built_area || 0), 0) / inventoryCount)
    : 0

  const zoneCounts = displayProperties.reduce<Record<string, number>>((acc, property) => {
    const zone = typeof property.location === 'string' ? property.location : 'Punta del Este'
    acc[zone] = (acc[zone] || 0) + 1
    return acc
  }, {})
  const topZones = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground bg-editorial-layer">
      {/* 1. HERO SECTION - Cinematic */}
      <HeroSection />

      {/* 2. TRUST + DECISION SIGNALS */}
      <section className="bg-surface-1/55 py-14 md:py-16 border-y border-border/60">
        <div className="container mx-auto px-6">
          <div className="mb-8 flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold-strong">
              Señales de Decisión
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink-strong">
              Contexto real para decidir mejor
            </h2>
            <p className="text-sm md:text-base text-ink-soft max-w-2xl">
              Una lectura rápida del inventario activo para orientar comparación, timing de contacto y rango de inversión.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <article className="rounded-2xl border border-border/70 bg-card/80 p-5 backdrop-blur-sm shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Inventario activo</p>
              <p className="mt-2 text-3xl font-serif font-bold text-ink-strong">{inventoryCount}</p>
              <p className="mt-2 text-sm text-ink-soft">Propiedades destacadas con datos consistentes.</p>
            </article>
            <article className="rounded-2xl border border-border/70 bg-card/80 p-5 backdrop-blur-sm shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Precio promedio</p>
              <p className="mt-2 text-3xl font-serif font-bold text-ink-strong">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(avgPrice)}
              </p>
              <p className="mt-2 text-sm text-ink-soft">Ticket medio de entrada para propiedades de la colección.</p>
            </article>
            <article className="rounded-2xl border border-border/70 bg-card/80 p-5 backdrop-blur-sm shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Superficie promedio</p>
              <p className="mt-2 text-3xl font-serif font-bold text-ink-strong">{avgM2} m²</p>
              <p className="mt-2 text-sm text-ink-soft">Área construida media para evaluar valor por metro.</p>
            </article>
          </div>

          {topZones.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Zonas con mayor movimiento</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topZones.map(([zone, count]) => (
                  <span
                    key={zone}
                    className="rounded-full border border-accent-gold-soft/30 bg-accent-gold-soft/10 px-3 py-1 text-xs font-medium text-ink-strong"
                  >
                    {zone} · {count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 3. LIFESTYLE CATEGORIES */}
      <LifestyleCategories />

      {/* 4. FEATURED PROPERTIES - Bento Grid */}
      <BentoGrid
        properties={displayProperties}
        title="Propiedades Destacadas"
        subtitle="Selección curada de propiedades exclusivas en Punta del Este"
      />

      {/* 5. MAP WITH LISTINGS - Interactive */}
      <MapWithListings
        properties={displayProperties}
        title="Explora en el Mapa"
        subtitle="Encuentra propiedades por ubicación en Punta del Este"
      />

      {/* 6. VALUE PROPOSITION */}
      <section className="py-24 bg-surface-1/40 bg-grain-subtle">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4 px-4">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-gold-soft to-accent-gold-strong text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground">Expertise Inigualable</h3>
              <p className="text-muted-foreground leading-relaxed">
                Más de 20 años de experiencia en el mercado de lujo de Punta del Este, guiando a inversores y familias.
              </p>
            </div>

            <div className="space-y-4 px-4 md:border-x border-border">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-gold-soft to-accent-gold-strong text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground">Inventario Exclusivo</h3>
              <p className="text-muted-foreground leading-relaxed">
                Acceso a propiedades off-market y las más codiciadas en La Barra, Manantiales y José Ignacio.
              </p>
            </div>

            <div className="space-y-4 px-4">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-gold-soft to-accent-gold-strong text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground">Concierge Local</h3>
              <p className="text-muted-foreground leading-relaxed">
                Más allá del Real Estate, te conectamos con el lifestyle. Desde clubs privados hasta asesoría legal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <Footer />
    </main>
  );
}

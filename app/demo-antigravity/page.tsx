'use client';

import { LifestyleMap } from '@/components/explore/LifestyleMap';
import { VirtualStaging } from '@/components/luxe/VirtualStaging';
import { motion } from 'framer-motion';

export default function DemoAntigravityPage() {
    // Datos mockeados para el mapa
    const demoProperties = [
        {
            id: 1,
            title: "Villa Sol y Sal",
            price: 2500000,
            currency: "USD",
            bedrooms: 5,
            bathrooms: 4,
            location: [-34.9120, -54.9450] as [number, number],
            lifestyle_tags: ['nightlife', 'surf'],
            main_image: "/images/placeholders/modern-apartment.jpg",
            slug: "villa-sol-y-sal"
        },
        {
            id: 2,
            title: "Chacra La Calma",
            price: 1800000,
            currency: "USD",
            bedrooms: 3,
            bathrooms: 3,
            location: [-34.8210, -54.6350] as [number, number], // José Ignacio
            lifestyle_tags: ['silence'],
            main_image: "/images/placeholders/farm-ranch.jpg",
            slug: "chacra-la-calma"
        },
        {
            id: 3,
            title: "Golf Estate Beverly",
            price: 3200000,
            currency: "USD",
            bedrooms: 6,
            bathrooms: 6,
            location: [-34.9280, -54.9060] as [number, number],
            lifestyle_tags: ['golf', 'family'],
            main_image: "/images/placeholders/golf-estate.jpg",
            slug: "golf-estate-beverly"
        }
    ];

    return (
        <main className="min-h-screen bg-neutral-900 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-20">

                {/* Header */}
                <section className="text-center space-y-4 pt-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400"
                    >
                        Antigravity ReOS
                    </motion.h1>
                    <p className="text-neutral-400 max-w-2xl mx-auto">
                        Verificación de componentes de Fase 2: Lifestyle Map y Virtual Staging.
                    </p>
                </section>

                {/* Componente 1: Lifestyle Map */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-serif text-gold">01. Lifestyle Matching Map</h2>
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">Live</span>
                    </div>
                    <p className="text-neutral-400 mt-2">
                        Mapa interactivo con filtros de &quot;Vibe&quot; dinámicos. Prueba filtrar por &quot;Vida Nocturna&quot; o &quot;Silencio&quot; para ver cómo cambian las zonas activas.
                    </p>

                    <div className="glass-card p-2 rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
                        <LifestyleMap properties={demoProperties} />
                    </div>
                </section>

                {/* Componente 2: Virtual Staging */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-serif text-gold">02. Virtual Staging Slider</h2>
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">Interactive</span>
                    </div>
                    <p className="text-neutral-400 mt-2">
                        Deslizador interactivo para comparar estados de una propiedad o evolución de obra.
                    </p>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-medium text-white/80">Caso 1: Evolución de Obra</h3>
                            <VirtualStaging
                                beforeImage="/sequences/mansion/frame_0001.webp"
                                afterImage="/sequences/mansion/frame_0100.webp"
                                beforeLabel="Inicio Obra"
                                afterLabel="Avance 60%"
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-white/80">Caso 2: Day vs Night</h3>
                            {/* Usamos placeholders de imágenes distintas para simular */}
                            <VirtualStaging
                                beforeImage="/images/placeholders/modern-apartment.jpg"
                                afterImage="/images/placeholders/luxury-villa.jpg"
                                beforeLabel="Día"
                                afterLabel="Noche"
                            />
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}

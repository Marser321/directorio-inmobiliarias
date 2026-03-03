'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CanvasSequenceAnimator } from './CanvasSequenceAnimator';
import { GoldenDust } from './GoldenDust';
import { trackFunnelEvent } from '@/lib/analytics/funnel';

export function HeroSection() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <CanvasSequenceAnimator
            frameCount={160}
            frameUrlPattern="/sequences/mansion/frame_{index}.webp"
            className="w-full relative bg-black bg-photo-fade bg-grain-subtle"
            captions={[
                {
                    at: 0.15,
                    text: 'La Vista que Mereces',
                    position: 'center',
                },
                {
                    at: 0.35,
                    text: 'Diseño Arquitectónico Único',
                    position: 'bottom-left',
                },
                {
                    at: 0.55,
                    text: 'Piscina Infinity Edge',
                    position: 'bottom-right',
                },
                {
                    at: 0.75,
                    text: 'Materiales de Primera',
                    position: 'center',
                },
                {
                    at: 0.90,
                    text: 'Tu Próximo Hogar',
                    position: 'center',
                },
            ]}
        >
            {(scrollProgress: MotionValue<number>) => (
                <>
                    <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/30 to-black/55" />
                    <GoldenDust />
                    <HeroContent
                        scrollProgress={scrollProgress}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />
                </>
            )}
        </CanvasSequenceAnimator>
    );
}

// Separate component to handle the inner content logic and animations
function HeroContent({
    scrollProgress,
    searchQuery,
    setSearchQuery
}: {
    scrollProgress: MotionValue<number>;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}) {
    const router = useRouter();
    // Opacity animation: Fade out as user starts scrolling (0 to 0.1)
    const contentOpacity = useTransform(scrollProgress, [0, 0.08], [1, 0]);

    // Let's make the main Hero text disappear quickly so the animation takes over
    // But the Nav should stay accessible or maybe fade out if we want full immersion?
    // User said "move it to the main hero". Usually Hero nav is useful.
    // Let's keep Nav visible but maybe minimal.
    // Actually, let's fade out the Hero TEXT, but keep the NAV.

    // Transform for Hero Text: Move up and fade out
    const textY = useTransform(scrollProgress, [0, 0.1], [0, -100]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            void trackFunnelEvent('hero_search_submitted', {
                metadata: {
                    query: searchQuery.trim(),
                },
            });
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleLifestyleClick = (tag: string) => {
        // Map display tags to URL/DB values if needed, for now using direct values or simple mapping
        // 'Vista al Mar' -> 'waterfront'
        const tagMap: Record<string, string> = {
            'Vista al Mar': 'waterfront',
            'Golf & Country': 'golf',
            'Sunset Views': 'sunset',
            'Chacras Privadas': 'farm',
            'Frente al Lago': 'lake'
        };
        const value = tagMap[tag] || tag.toLowerCase();
        router.push(`/search?lifestyles=${value}`);
    };

    return (
        <>
            {/* Header Navigation - Stays visible (or maybe fades if desired) */}
            <motion.header
                className="absolute top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{ opacity: 1 }} // Keep nav visible for now, or use navOpacity if desired
            >
                <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
                    <Link href="/" className="flex items-center group">
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight transition-transform group-hover:scale-105 drop-shadow-md">
                            Luxe<span className="text-accent-gold-soft">Estate</span>
                        </h1>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link
                            href="/search"
                            className="text-white/90 hover:text-accent-gold-soft transition-colors font-medium text-sm tracking-wide drop-shadow-sm"
                        >
                            Propiedades
                        </Link>
                        <Link
                            href="/search?mode=map"
                            className="text-white/90 hover:text-accent-gold-soft transition-colors font-medium text-sm tracking-wide drop-shadow-sm"
                        >
                            Mapa
                        </Link>
                        <Link
                            href="/partners"
                            className="text-white/90 hover:text-accent-gold-soft transition-colors font-medium text-sm tracking-wide drop-shadow-sm"
                        >
                            Inmobiliarias
                        </Link>
                        <Link
                            href="/search?type=temporary"
                            className="text-white/90 hover:text-accent-gold-soft transition-colors font-medium text-sm tracking-wide drop-shadow-sm"
                        >
                            Temporal
                        </Link>

                        <Link href="/partners/registro">
                            <button className="btn-luxe px-6 py-2.5 rounded-full text-white font-bold text-sm tracking-wide shadow-lg border border-white/20 backdrop-blur-sm hover:bg-white/10 transition-all">
                                Publicar
                            </button>
                        </Link>
                    </div>
                </nav>
            </motion.header>

            {/* Initial Hero Content (Fades out on scroll) */}
            <motion.div
                className="relative z-20 flex flex-col items-center justify-center h-full px-4 pt-20"
                style={{ opacity: contentOpacity, y: textY }}
            >
                <div className="text-center max-w-5xl">
                    {/* Tagline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex items-center justify-center gap-2 mb-8"
                    >
                        <div className="px-4 py-1.5 rounded-full border border-accent-gold-soft/40 bg-black/40 backdrop-blur-md flex items-center gap-2 shadow-lg">
                            <Sparkles className="w-4 h-4 text-accent-gold-soft" />
                            <span className="text-accent-gold-soft font-semibold tracking-widest uppercase text-xs">
                                Real Estate de Lujo
                            </span>
                        </div>
                    </motion.div>

                    {/* Main Headline */}
                    <h2 className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-8 leading-[1.1] tracking-tighter drop-shadow-2xl">
                        Encuentra tu
                        <br />
                        <span className="bg-gradient-to-r from-accent-gold-soft via-[#d8c79f] to-accent-gold-strong bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                            hogar ideal
                        </span>
                    </h2>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-xl md:text-3xl text-white/90 font-light mb-16 max-w-3xl mx-auto leading-relaxed drop-shadow-md"
                    >
                        La colección más exclusiva de propiedades en Punta del Este, La Barra y José Ignacio.
                    </motion.p>
                </div>

                {/* AI Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="w-full max-w-2xl"
                >
                    <div className="glass-card rounded-full p-2 flex items-center shadow-2xl bg-white/10 backdrop-blur-xl border border-white/20">
                        <div className="flex items-center flex-1 pl-4">
                            <Search className="w-5 h-5 text-accent-gold-soft mr-3" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="¿Buscas un ático con vista al mar?"
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder:text-white/60 text-lg py-3"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="btn-luxe px-8 py-3 rounded-full text-white font-semibold text-lg hover:scale-105 transition-transform"
                        >
                            Buscar
                        </button>
                    </div>
                </motion.div>

                {/* Quick Lifestyle Tags */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="flex flex-wrap justify-center gap-3 mt-8"
                >
                    {['Vista al Mar', 'Golf & Country', 'Sunset Views', 'Chacras Privadas', 'Frente al Lago'].map((tag) => (
                        <button
                            key={tag}
                            onClick={() => handleLifestyleClick(tag)}
                            className="px-4 py-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-sm text-white/90 font-medium hover:bg-white/20 hover:border-accent-gold-soft/60 transition-all cursor-pointer shadow-lg"
                        >
                            {tag}
                        </button>
                    ))}
                </motion.div>
            </motion.div>
        </>
    );
}

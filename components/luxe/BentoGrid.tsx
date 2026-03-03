'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { PropertyCard } from './PropertyCard';

interface Property {
    id: number | string;
    title: string;
    slug?: string;
    price: number;
    currency: string;
    bedrooms: number;
    bathrooms: number;
    built_area: number;
    main_image: string;
    images?: string[];
    location?: string;
    status?: string;
    lifestyle_tags?: string[];
}

interface BentoGridProps {
    properties: Property[];
    title?: string;
    subtitle?: string;
    onPropertyHover?: (id: string | number | null) => void;
    isLoading?: boolean;
}

// Skeleton pulsante estilo Airbnb
function PropertyCardSkeleton({ index }: { index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="bg-card rounded-2xl overflow-hidden border border-border/50"
        >
            {/* Image skeleton */}
            <div className="aspect-[4/3] bg-gradient-to-r from-muted via-muted/80 to-muted animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
            </div>

            {/* Content skeleton */}
            <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                        {/* Title */}
                        <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse" />
                        {/* Location */}
                        <div className="h-4 bg-muted/70 rounded w-1/2 animate-pulse" />
                    </div>
                    {/* Price */}
                    <div className="space-y-1 text-right">
                        <div className="h-6 bg-muted rounded-lg w-24 animate-pulse" />
                        <div className="h-3 bg-muted/50 rounded w-12 ml-auto animate-pulse" />
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Specs */}
                <div className="flex justify-between">
                    <div className="h-4 bg-muted/60 rounded w-16 animate-pulse" />
                    <div className="h-4 bg-muted/60 rounded w-16 animate-pulse" />
                    <div className="h-4 bg-muted/60 rounded w-16 animate-pulse" />
                </div>
            </div>
        </motion.div>
    );
}

export function BentoGrid({
    properties,
    title = "Propiedades Destacadas",
    subtitle = "Selección curada de propiedades exclusivas",
    onPropertyHover,
    isLoading = false
}: BentoGridProps) {
    const showSkeleton = isLoading || properties.length === 0;

    return (
        <section className="py-24 bg-surface-0/80">
            <div className="container mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4"
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold-strong mb-2">
                            Curaduría de Mercado
                        </p>
                        <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-2">
                            {title}
                        </h2>
                        <div className="section-divider-soft mb-4" />
                        <p className="text-muted-foreground text-lg">{subtitle}</p>
                    </div>

                    <button className="group flex items-center gap-2 text-accent-gold-strong font-semibold hover:gap-3 transition-all" data-magnetic="true">
                        Ver todas las propiedades
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                {!showSkeleton ? (
                    <p className="mb-6 text-sm text-ink-soft">
                        {properties.length} propiedades activas en esta selección editorial.
                    </p>
                ) : null}

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
                    {showSkeleton ? (
                        // Skeleton loading state
                        Array.from({ length: 6 }).map((_, index) => (
                            <PropertyCardSkeleton key={`skeleton-${index}`} index={index} />
                        ))
                    ) : (
                        // Property cards
                        properties.map((property, index) => {
                            // Uniform Grid Layout (Removed Bento/Asymmetrical pattern for alignment)
                            return (
                                <PropertyCard
                                    key={property.id}
                                    property={property}
                                    index={index}
                                    onHover={onPropertyHover}
                                    className="col-span-1 h-full"
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
}

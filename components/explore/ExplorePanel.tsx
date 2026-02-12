'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface VibeFilters {
    surf: boolean;
    nightlife: boolean;
    silence: boolean;
    forest: boolean;
    beach: boolean;
}

interface Zone {
    id: string;
    name: string;
    description: string;
    vibes: VibeFilters;
    vibeScore: number;
}

interface SearchPropertyRow {
    id: number;
    title: string;
    price: number;
    currency: string;
    location_name?: string | null;
    location_slug?: string | null;
    main_image?: string | null;
    lifestyle_tags?: string[] | null;
    ranking_score?: number;
}

interface ExploreProperty {
    id: number;
    title: string;
    price: number;
    currency: string;
    location: string;
    image: string | null;
    lifestyleTags: string[];
    vibeMatch: number;
}

interface ExplorePanelProps {
    hoveredZone: string | null;
    selectedZone: string | null;
    activeFilters: VibeFilters;
    onSelectZone: (zone: string | null) => void;
}

const ZONES: Record<string, Zone> = {
    'la-barra': {
        id: 'la-barra',
        name: 'La Barra',
        description: 'Epicentro del surf y la vida nocturna. Playa con olas consistentes.',
        vibes: { surf: true, nightlife: true, silence: false, forest: false, beach: true },
        vibeScore: 82,
    },
    'jose-ignacio': {
        id: 'jose-ignacio',
        name: 'José Ignacio',
        description: 'Exclusivo y tranquilo. El refugio de celebridades.',
        vibes: { surf: true, nightlife: false, silence: true, forest: false, beach: true },
        vibeScore: 95,
    },
    'punta-centro': {
        id: 'punta-centro',
        name: 'Punta del Este Centro',
        description: 'El corazón de la península. Casinos y vida urbana.',
        vibes: { surf: false, nightlife: true, silence: false, forest: false, beach: true },
        vibeScore: 75,
    },
    'punta-ballena': {
        id: 'punta-ballena',
        name: 'Punta Ballena',
        description: 'Casapueblo y vistas épicas. Naturaleza y tranquilidad.',
        vibes: { surf: false, nightlife: false, silence: true, forest: true, beach: false },
        vibeScore: 88,
    },
    'manantiales': {
        id: 'manantiales',
        name: 'Manantiales',
        description: 'Equilibrio perfecto entre surf, gastronomía y vida nocturna.',
        vibes: { surf: true, nightlife: true, silence: false, forest: false, beach: true },
        vibeScore: 80,
    },
    'montoya': {
        id: 'montoya',
        name: 'Montoya',
        description: 'Surf local y atardeceres legendarios.',
        vibes: { surf: true, nightlife: false, silence: true, forest: false, beach: true },
        vibeScore: 85,
    },
    'bikini': {
        id: 'bikini',
        name: 'Bikini',
        description: 'Playa virgen y tranquilidad. El secreto mejor guardado.',
        vibes: { surf: true, nightlife: false, silence: true, forest: false, beach: true },
        vibeScore: 87,
    },
    'chihuahua': {
        id: 'chihuahua',
        name: 'Chihuahua',
        description: 'Bosques, lagos y aislamiento total.',
        vibes: { surf: false, nightlife: false, silence: true, forest: true, beach: false },
        vibeScore: 92,
    },
};

function formatPrice(price: number, currency: string) {
    if (price >= 1000000) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
            notation: 'compact',
            compactDisplay: 'short',
        }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

export default function ExplorePanel({
    hoveredZone,
    selectedZone,
    activeFilters,
    onSelectZone,
}: ExplorePanelProps) {
    const [properties, setProperties] = useState<ExploreProperty[]>([]);
    const [propertiesError, setPropertiesError] = useState<string | null>(null);
    const [resolvedZoneId, setResolvedZoneId] = useState<string | null>(null);
    const router = useRouter();

    const activeZoneId = selectedZone || hoveredZone;
    const activeZone = activeZoneId ? ZONES[activeZoneId] : null;
    const selectedFilterKeys = useMemo(
        () => Object.entries(activeFilters).filter(([, enabled]) => enabled).map(([key]) => key),
        [activeFilters]
    );
    const isLoadingProperties = Boolean(activeZoneId && resolvedZoneId !== activeZoneId);

    useEffect(() => {
        if (!activeZoneId) {
            return;
        }
        const zone = ZONES[activeZoneId];
        if (!zone) {
            return;
        }

        const controller = new AbortController();
        const zoneId = zone.id;

        const params = new URLSearchParams({
            q: zone.name,
            limit: '8',
            sort: 'relevance',
        });

        fetch(`/api/search/properties?${params.toString()}`, {
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async (res) => {
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(payload?.error || 'No se pudieron cargar propiedades de la zona');
                }
                return payload;
            })
            .then((payload) => {
                if (controller.signal.aborted) {
                    return;
                }
                const rows = Array.isArray(payload?.data) ? (payload.data as SearchPropertyRow[]) : [];
                setProperties(
                    rows.map((row) => ({
                        id: row.id,
                        title: row.title,
                        price: row.price,
                        currency: row.currency || 'USD',
                        location: row.location_name || row.location_slug || zone.name,
                        image: row.main_image || null,
                        lifestyleTags: Array.isArray(row.lifestyle_tags) ? row.lifestyle_tags : [],
                        vibeMatch: Math.max(0, Math.min(100, Math.round((row.ranking_score || 0) * 100))),
                    }))
                );
                setPropertiesError(null);
                setResolvedZoneId(zoneId);
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                const message = error instanceof Error ? error.message : 'No se pudieron cargar propiedades de la zona';
                setProperties([]);
                setPropertiesError(message);
                setResolvedZoneId(zoneId);
            });

        return () => controller.abort();
    }, [activeZoneId]);

    const visibleProperties = useMemo(() => {
        if (!activeZone || isLoadingProperties) return [];
        if (selectedFilterKeys.length === 0) return properties;
        return properties.filter((property) =>
            property.lifestyleTags.some((tag) => selectedFilterKeys.includes(tag))
        );
    }, [activeZone, isLoadingProperties, properties, selectedFilterKeys]);

    return (
        <div className="w-full lg:w-96 h-[40vh] lg:h-full bg-white dark:bg-neutral-900 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-serif text-xl font-bold text-neutral-900 dark:text-white">
                    {activeZone ? activeZone.name : 'Explorador de Barrios'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {activeZone ? activeZone.description : 'Haz hover o clic en una zona del mapa'}
                </p>
                {activeZone && (
                    <button
                        onClick={() => onSelectZone(null)}
                        className="mt-3 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline"
                    >
                        Limpiar selección
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {activeZone ? (
                        <motion.div
                            key={activeZone.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="p-4 space-y-6"
                        >
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 rounded-2xl">
                                <div>
                                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Vibe Score</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                            {activeZone.vibeScore}
                                        </span>
                                        <span className="text-sm text-amber-500">/100</span>
                                    </div>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                                    <span className="text-2xl">
                                        {activeZone.vibeScore >= 90 ? '🌟' : activeZone.vibeScore >= 80 ? '✨' : '💫'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {activeZone.vibes.surf && (
                                    <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">🏄 Surf Zone</span>
                                )}
                                {activeZone.vibes.nightlife && (
                                    <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">🌙 Vida Nocturna</span>
                                )}
                                {activeZone.vibes.silence && (
                                    <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">🧘 Silencio Total</span>
                                )}
                                {activeZone.vibes.forest && (
                                    <span className="px-3 py-1.5 rounded-full bg-lime-100 text-lime-700 text-sm font-medium">🌲 Bosque</span>
                                )}
                                {activeZone.vibes.beach && (
                                    <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">🏖️ Playa</span>
                                )}
                            </div>

                            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-sm text-neutral-500 dark:text-neutral-400">
                                Datos de locales y venues aún no integrados en producción para esta vista.
                            </div>

                            <div>
                                <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                                    Propiedades en {activeZone.name}
                                </h3>

                                {isLoadingProperties ? (
                                    <p className="text-sm text-neutral-500">Cargando propiedades reales...</p>
                                ) : null}

                                {!isLoadingProperties && propertiesError ? (
                                    <p className="text-sm text-red-500">{propertiesError}</p>
                                ) : null}

                                {!isLoadingProperties && !propertiesError && visibleProperties.length === 0 ? (
                                    <p className="text-sm text-neutral-500">
                                        No hay propiedades publicadas para esta zona con los filtros actuales.
                                    </p>
                                ) : null}

                                <div className="space-y-3">
                                    {visibleProperties.map((property) => (
                                        <button
                                            key={property.id}
                                            type="button"
                                            onClick={() => router.push(`/property/${property.id}`)}
                                            className="w-full text-left group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all duration-300"
                                        >
                                            <div className="relative h-32">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                <div className="absolute bottom-2 left-3 z-20">
                                                    <span className="text-white font-bold">
                                                        {formatPrice(property.price, property.currency)}
                                                    </span>
                                                </div>
                                                <div className="absolute top-2 right-2 z-20">
                                                    <span className="px-2 py-1 rounded-full bg-amber-500 text-white text-xs font-medium">
                                                        {property.vibeMatch}% Match
                                                    </span>
                                                </div>
                                                {property.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700" />
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h4 className="font-medium text-neutral-900 dark:text-white truncate">
                                                    {property.title}
                                                </h4>
                                                <p className="text-sm text-neutral-500">{property.location}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex items-center justify-center p-8"
                        >
                            <p className="text-sm text-neutral-500 text-center">
                                Selecciona una zona para ver propiedades reales publicadas.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

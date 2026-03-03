'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Scale, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompare } from '@/hooks/useCompare';
import { useAuth } from '@/hooks/useAuth';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import type { CompareResponseItem } from '@/types/domain';

type CadastreLookupDto = {
    padron: string | null;
    localidad: string | null;
    area_m2: number | null;
};

type AgencyValueScoreDto = {
    value_score: number;
    cost_score: number;
    transparency_score: number;
    operational_score: number;
};

function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

function parseIds(value: string | null) {
    if (!value) return [];
    return value
        .split(',')
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry > 0);
}

function ComparePageContent() {
    const searchParams = useSearchParams();
    const { featureFlags } = useAuth();
    const { compareIds, removeFromCompare, clearCompare } = useCompare();
    const [items, setItems] = useState<CompareResponseItem[]>([]);
    const [cadastreByPropertyId, setCadastreByPropertyId] = useState<Record<number, CadastreLookupDto | null>>({});
    const [valueScoreByPropertyId, setValueScoreByPropertyId] = useState<Record<number, AgencyValueScoreDto | null>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedIds = useMemo(() => {
        const queryIds = parseIds(searchParams.get('ids'));
        if (queryIds.length > 0) return [...new Set(queryIds)].slice(0, 4);
        return compareIds.slice(0, 4);
    }, [searchParams, compareIds]);

    useEffect(() => {
        if (!featureFlags.compare) return;
        void trackFunnelEvent('compare_opened', {
            metadata: {
                selected_properties: selectedIds.length,
                source: 'compare_page',
            },
        });
    }, [featureFlags.compare, selectedIds.length]);

    useEffect(() => {
        if (!featureFlags.compare) return;
        if (selectedIds.length < 2) {
            setItems([]);
            setError(null);
            return;
        }

        const fetchCompare = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/compare?ids=${selectedIds.join(',')}`, {
                    cache: 'no-store',
                });
                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.error || 'No se pudo cargar el comparador');
                }
                setItems(Array.isArray(payload.data) ? payload.data : []);
            } catch (nextError: unknown) {
                setError(nextError instanceof Error ? nextError.message : 'No se pudo cargar el comparador');
            } finally {
                setIsLoading(false);
            }
        };

        void fetchCompare();
    }, [featureFlags.compare, selectedIds]);

    useEffect(() => {
        if (!featureFlags.compare || items.length === 0) {
            setCadastreByPropertyId({});
            setValueScoreByPropertyId({});
            return;
        }

        let cancelled = false;

        const run = async () => {
            const cadastreEntries = await Promise.all(
                items.map(async (item) => {
                    if (!featureFlags.geocatastroLookup) return [item.id, null] as const;
                    try {
                        const params = new URLSearchParams({
                            address: item.location_name || '',
                            city: 'Maldonado',
                        });
                        const response = await fetch(`/api/geo/cadastre/lookup?${params.toString()}`, { cache: 'no-store' });
                        const payload = await response.json();
                        if (!response.ok) return [item.id, null] as const;
                        return [item.id, (payload.data || null) as CadastreLookupDto | null] as const;
                    } catch {
                        return [item.id, null] as const;
                    }
                })
            );

            const valueScoreEntries = await Promise.all(
                items.map(async (item) => {
                    if (!featureFlags.agencyValueScore || !item.agency_id) return [item.id, null] as const;
                    try {
                        const params = new URLSearchParams({
                            agencyId: String(item.agency_id),
                            propertyId: String(item.id),
                        });
                        const response = await fetch(`/api/agencies/value-score?${params.toString()}`, { cache: 'no-store' });
                        const payload = await response.json();
                        if (!response.ok) return [item.id, null] as const;
                        return [item.id, (payload.data || null) as AgencyValueScoreDto | null] as const;
                    } catch {
                        return [item.id, null] as const;
                    }
                })
            );

            if (cancelled) return;
            setCadastreByPropertyId(Object.fromEntries(cadastreEntries));
            setValueScoreByPropertyId(Object.fromEntries(valueScoreEntries));
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [featureFlags.agencyValueScore, featureFlags.compare, featureFlags.geocatastroLookup, items]);

    if (!featureFlags.compare) {
        return (
            <main className="container mx-auto px-6 py-20">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Comparador desactivado</h1>
                    <p className="mt-2 text-sm text-slate-600">Activa `FEATURE_COMPARE=true` para habilitar esta sección.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-6 py-12">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Comparador de Propiedades</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Selecciona entre 2 y 4 propiedades para comparar atributos clave.
                    </p>
                </div>
                <Button variant="outline" onClick={clearCompare}>
                    Limpiar comparador
                </Button>
            </div>

            {selectedIds.length < 2 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <Scale className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm text-slate-600">
                        Agrega al menos 2 propiedades desde búsqueda o ficha para comparar.
                    </p>
                    <Link href="/search" className="mt-4 inline-block text-sm font-semibold text-slate-900 underline">
                        Ir a búsqueda
                    </Link>
                </div>
            ) : null}

            {error ? (
                <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            ) : null}

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
                    ))}
                </div>
            ) : null}

            {!isLoading && items.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {items.map((item) => (
                        <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="relative aspect-[4/3] bg-slate-100">
                                {item.main_image ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={item.main_image} alt={item.title} className="h-full w-full object-cover" />
                                ) : null}
                                <button
                                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 hover:bg-white"
                                    onClick={() => removeFromCompare(item.id, 'compare')}
                                    aria-label="Quitar propiedad del comparador"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-2 p-4">
                                <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</h2>
                                <p className="text-xs text-slate-500">{item.location_name || 'Sin ubicación'}</p>
                                <p className="text-lg font-bold text-[#D4AF37]">{formatPrice(item.price, item.currency)}</p>
                                <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                    <div>
                                        <dt>Dormitorios</dt>
                                        <dd className="font-semibold text-slate-900">{item.bedrooms ?? '-'}</dd>
                                    </div>
                                    <div>
                                        <dt>Baños</dt>
                                        <dd className="font-semibold text-slate-900">{item.bathrooms ?? '-'}</dd>
                                    </div>
                                    <div>
                                        <dt>Área</dt>
                                        <dd className="font-semibold text-slate-900">{item.built_area ? `${item.built_area} m²` : '-'}</dd>
                                    </div>
                                    <div>
                                        <dt>Score</dt>
                                        <dd className="font-semibold text-slate-900">{item.ranking_score}</dd>
                                    </div>
                                    <div>
                                        <dt>Precisión</dt>
                                        <dd className="font-semibold text-slate-900">
                                            {item.coordinate_source === 'manual'
                                                ? 'Manual'
                                                : item.coordinate_source === 'geocoded'
                                                    ? 'Geocodificada'
                                                    : item.coordinate_source === 'centroid'
                                                        ? 'Centroide'
                                                        : item.coordinate_source === 'none'
                                                            ? 'Sin dato'
                                                            : 'No informado'}
                                        </dd>
                                    </div>
                                </dl>
                                {featureFlags.geocatastroLookup ? (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                                        <p className="font-semibold text-slate-800">Ficha catastral</p>
                                        {cadastreByPropertyId[item.id] ? (
                                            <p className="mt-1 text-slate-600">
                                                Padrón: {cadastreByPropertyId[item.id]?.padron || 's/d'} · Área:{' '}
                                                {cadastreByPropertyId[item.id]?.area_m2 !== null && cadastreByPropertyId[item.id]?.area_m2 !== undefined
                                                    ? `${cadastreByPropertyId[item.id]?.area_m2} m²`
                                                    : 's/d'}
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-slate-500">Sin dato catastral para esta propiedad.</p>
                                        )}
                                    </div>
                                ) : null}
                                {featureFlags.agencyValueScore ? (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                                        <p className="font-semibold text-slate-800">Value Score (agencia)</p>
                                        {valueScoreByPropertyId[item.id] ? (
                                            <p className="mt-1 text-slate-600">
                                                Total {valueScoreByPropertyId[item.id]?.value_score.toFixed(1)} · Costo{' '}
                                                {valueScoreByPropertyId[item.id]?.cost_score.toFixed(1)} · Transparencia{' '}
                                                {valueScoreByPropertyId[item.id]?.transparency_score.toFixed(1)}
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-slate-500">Sin score disponible.</p>
                                        )}
                                    </div>
                                ) : null}
                                <Link href={`/property/${item.slug || item.id}`} className="inline-block text-xs font-semibold text-slate-900 underline">
                                    Ver detalle
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            ) : null}
            <div className="mt-6 text-center">
                <Link href="/legal/comisiones-inmobiliarias" className="text-xs text-slate-600 underline">
                    Ver guía legal informativa sobre comisiones
                </Link>
            </div>
        </main>
    );
}

function ComparePageFallback() {
    return (
        <main className="container mx-auto px-6 py-12">
            <div className="mb-8 space-y-3">
                <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-96 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
                ))}
            </div>
        </main>
    );
}

export default function ComparePage() {
    return (
        <Suspense fallback={<ComparePageFallback />}>
            <ComparePageContent />
        </Suspense>
    );
}

"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Search,
    Map as MapIcon,
    List,
    Columns2,
    Filter,
    MapPinned,
    Loader2,
    Bell,
    TrendingUp,
    SlidersHorizontal,
    Scale,
    Heart,
    Compass,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { SearchFilters } from "@/components/search/SearchFilters"
import { PropertyCard } from "@/components/luxe/PropertyCard"
import { PropertyCardSkeleton } from "@/components/luxe/PropertyCardSkeleton"
import InteractiveMap from "@/components/features/interactive-map"
import { AuthCtas } from "@/components/layout/AuthCtas"

import { useSearchFilters } from "@/hooks/useSearchFilters"
import { usePropertySearch } from "@/hooks/usePropertySearch"
import { useMapBounds } from "@/hooks/useMapBounds"
import { useAuth } from "@/hooks/useAuth"
import { useCompare } from "@/hooks/useCompare"
import { useFavorites } from "@/hooks/useFavorites"
import { trackFunnelEvent } from "@/lib/analytics/funnel"

type ViewMode = "split" | "list" | "map"

type ZoneInsight = {
    zone: string
    vibe: {
        noise: number
        safety: number
        wind: number
    }
    funnel: {
        property_viewed: number
        whatsapp_clicked: number
        lead_form_submitted: number
        view_to_whatsapp: number
        view_to_lead: number
    }
}

function formatMoneyCompact(value: number | null | undefined) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
        notation: value >= 1000000 ? "compact" : "standard",
    }).format(value)
}

export default function SearchPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("split")
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const [alertsSheetOpen, setAlertsSheetOpen] = useState(false)
    const [alertName, setAlertName] = useState("")
    const [alertPhone, setAlertPhone] = useState("")
    const [alertConsent, setAlertConsent] = useState(false)
    const [alertStatus, setAlertStatus] = useState<string | null>(null)
    const [isSavingAlert, setIsSavingAlert] = useState(false)
    const [zoneInsights, setZoneInsights] = useState<ZoneInsight[]>([])
    const [isInsightsLoading, setIsInsightsLoading] = useState(false)
    const { user, featureFlags } = useAuth()
    const { compareCount } = useCompare()
    const { favorites } = useFavorites()

    const { filters, hasActiveFilters, setSortBy, isPending, setQuery, setPriceRange, setBedrooms, updateURL } = useSearchFilters()
    const {
        viewport,
        isSearchAsMove,
        highlightedPropertyId,
        updateBounds,
        toggleSearchAsMove,
        highlightProperty,
    } = useMapBounds()

    const { properties, isLoading, totalCount, queryMs } = usePropertySearch({
        filters,
        bounds: isSearchAsMove ? viewport.bounds : undefined,
    })

    const handlePropertyHover = useCallback((id: number | string | null) => {
        const numericId = typeof id === "string" ? Number(id) : id
        highlightProperty(numericId || null)
    }, [highlightProperty])

    const handleResultClick = useCallback((propertyId: number | string) => {
        const numericId = typeof propertyId === "string" ? Number(propertyId) : propertyId
        void trackFunnelEvent("search_result_clicked", {
            property_id: Number.isFinite(numericId) ? numericId : undefined,
            metadata: {
                query: filters.query || null,
                sort: filters.sortBy,
                has_active_filters: hasActiveFilters,
            },
        })
    }, [filters.query, filters.sortBy, hasActiveFilters])

    const applySmartSuggestion = useCallback((type: "expand_zone" | "plus_10_budget" | "minus_1_bedroom") => {
        if (type === "expand_zone") {
            updateURL({ query: "" })
            return
        }

        if (type === "plus_10_budget") {
            const currentMax = filters.priceMax ?? 10000000
            setPriceRange(filters.priceMin, Math.round(currentMax * 1.1))
            return
        }

        const nextBedrooms = filters.bedrooms && filters.bedrooms > 1 ? filters.bedrooms - 1 : null
        setBedrooms(nextBedrooms)
    }, [filters.priceMax, filters.priceMin, filters.bedrooms, setPriceRange, setBedrooms, updateURL])

    const savedSearchFilters = useMemo(() => ({
        query: filters.query,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
        propertyType: filters.propertyType,
        status: filters.status,
        features: filters.features,
        lifestyles: filters.lifestyles,
        sortBy: filters.sortBy,
    }), [filters])

    const activeFilterPills = useMemo(() => {
        const pills: string[] = []
        if (filters.query.trim()) pills.push(`Zona: ${filters.query.trim()}`)
        if (filters.status === "for_sale") pills.push("Venta")
        if (filters.status === "for_rent") pills.push("Alquiler")
        if (filters.priceMin !== null || filters.priceMax !== null) {
            pills.push(`Rango: ${formatMoneyCompact(filters.priceMin) || "Sin mín"} - ${formatMoneyCompact(filters.priceMax) || "Sin máx"}`)
        }
        if (filters.bedrooms !== null) pills.push(`${filters.bedrooms}+ dorm`)
        if (filters.bathrooms !== null) pills.push(`${filters.bathrooms}+ baños`)
        if (filters.propertyType) pills.push(`Tipo: ${filters.propertyType}`)
        if (filters.features.length > 0) pills.push(`Features: ${filters.features.length}`)
        if (filters.lifestyles.length > 0) pills.push(`Lifestyle: ${filters.lifestyles.length}`)
        return pills
    }, [filters])

    const filteredInsights = useMemo(() => {
        if (!filters.query.trim()) return zoneInsights.slice(0, 3)
        const query = filters.query.toLowerCase()
        const matches = zoneInsights.filter((entry) => entry.zone.toLowerCase().includes(query))
        return matches.slice(0, 3)
    }, [filters.query, zoneInsights])

    useEffect(() => {
        if (!featureFlags.zoneInsights) return
        let active = true

        const fetchInsights = async () => {
            setIsInsightsLoading(true)
            try {
                const response = await fetch("/api/insights/zones?days=30", { cache: "no-store" })
                const payload = await response.json()
                if (!response.ok || !active) return
                if (Array.isArray(payload.data)) setZoneInsights(payload.data)
            } finally {
                if (active) setIsInsightsLoading(false)
            }
        }

        void fetchInsights()
        return () => {
            active = false
        }
    }, [featureFlags.zoneInsights])

    const saveSearchAlert = useCallback(async () => {
        if (!featureFlags.savedSearch) return

        if (!user?.id) {
            setAlertStatus("Necesitas iniciar sesión para guardar alertas.")
            return
        }

        if (!alertConsent) {
            setAlertStatus("Debes aceptar el consentimiento de WhatsApp.")
            return
        }

        setIsSavingAlert(true)
        setAlertStatus(null)

        try {
            const response = await fetch("/api/alerts/saved-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: alertName.trim() || `Búsqueda ${new Date().toLocaleDateString("es-UY")}`,
                    filters: savedSearchFilters,
                    phone_e164: alertPhone.trim(),
                    consent_at: new Date().toISOString(),
                }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "No se pudo guardar la alerta")
            }
            setAlertStatus("Alerta guardada correctamente.")
            setAlertName("")
            setAlertPhone("")
            setAlertConsent(false)
        } catch (error: unknown) {
            setAlertStatus(error instanceof Error ? error.message : "No se pudo guardar la alerta")
        } finally {
            setIsSavingAlert(false)
        }
    }, [featureFlags.savedSearch, user?.id, alertConsent, alertName, alertPhone, savedSearchFilters])

    const showInsightsPanel = featureFlags.zoneInsights && viewMode !== "list"

    return (
        <div className="flex min-h-screen flex-col bg-editorial-layer text-ink-strong">
            <h1 className="sr-only">Buscar propiedades en Punta del Este y zonas premium</h1>

            <header className="sticky top-0 z-50 flex h-16 flex-none items-center border-b border-border/80 bg-surface-0/95 px-4 backdrop-blur-md md:px-6">
                <Link href="/" className="mr-4 flex items-center md:mr-8" aria-label="Volver al inicio de LuxeEstate">
                    <div className="font-serif text-xl font-bold tracking-tight text-ink-strong">
                        Luxe<span className="text-accent-gold-soft">Estate</span>
                    </div>
                </Link>

                <div className="hidden max-w-xl flex-1 items-center rounded-full border border-border/70 bg-surface-1/80 px-4 py-2 focus-within:border-accent-gold-soft/60 focus-within:bg-card md:flex">
                    {isPending || isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent-gold-soft" />
                    ) : (
                        <Search className="mr-2 h-4 w-4 text-ink-soft" />
                    )}
                    <input
                        type="text"
                        placeholder="La Barra, José Ignacio, Vista al Mar..."
                        defaultValue={filters.query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="flex-1 border-none bg-transparent text-sm text-ink-strong outline-none placeholder:text-ink-soft/90"
                        aria-label="Buscar por zona, barrio o título"
                    />
                </div>

                <AuthCtas
                    containerClassName="ml-auto"
                    hideLoginOnMobile
                    loginVariant="ghost"
                    publishVariant="default"
                    size="sm"
                    loginClassName="text-ink-soft hover:text-ink-strong"
                    publishClassName="rounded-full bg-ink-strong text-surface-0 hover:bg-ink-strong/90 text-sm"
                />
            </header>

            <div className="sticky top-16 z-40 flex h-14 flex-none items-center justify-between gap-3 border-b border-border/70 bg-surface-0/92 px-4 backdrop-blur-md md:px-6">
                <div className="flex items-center gap-3">
                    <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-8 rounded-full border-border text-xs text-ink-soft lg:hidden"
                            >
                                <Filter className="mr-2 h-3 w-3" />
                                Filtros
                                {hasActiveFilters ? (
                                    <span className="ml-1 h-2 w-2 rounded-full bg-accent-gold-soft" />
                                ) : null}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[320px] p-0 sm:w-[360px]">
                            <SearchFilters isSheet onClose={() => setMobileFiltersOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    <div className="flex items-center gap-2">
                        {isLoading || isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
                        ) : null}
                        <span className="text-sm font-medium text-ink-strong">{totalCount} propiedades</span>
                        {!isLoading && queryMs > 0 ? (
                            <span className="hidden text-xs text-ink-soft md:inline">{queryMs} ms</span>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {featureFlags.savedSearch ? (
                        <Sheet open={alertsSheetOpen} onOpenChange={setAlertsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="hidden rounded-full border-border text-xs text-ink-soft md:inline-flex">
                                    <Bell className="mr-2 h-3.5 w-3.5" />
                                    Guardar alerta
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[360px] bg-surface-0 sm:w-[420px]">
                                <div className="space-y-4 py-2">
                                    <h2 className="text-lg font-semibold text-ink-strong">Alerta de búsqueda</h2>
                                    <p className="text-sm text-ink-soft">
                                        Recibirás por WhatsApp nuevas propiedades que coincidan con estos filtros.
                                    </p>

                                    {!user?.id ? (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                            Debes iniciar sesión para activar alertas.
                                        </div>
                                    ) : null}

                                    <div className="space-y-2">
                                        <label htmlFor="alert-name" className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                                            Nombre de alerta
                                        </label>
                                        <input
                                            id="alert-name"
                                            value={alertName}
                                            onChange={(event) => setAlertName(event.target.value)}
                                            placeholder="Ej: Vista al mar premium"
                                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent-gold-soft"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="alert-phone" className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                                            WhatsApp (E.164)
                                        </label>
                                        <input
                                            id="alert-phone"
                                            value={alertPhone}
                                            onChange={(event) => setAlertPhone(event.target.value)}
                                            placeholder="+59899xxxxxx"
                                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent-gold-soft"
                                        />
                                    </div>

                                    <label className="flex items-start gap-2 text-xs text-ink-soft">
                                        <input
                                            type="checkbox"
                                            checked={alertConsent}
                                            onChange={(event) => setAlertConsent(event.target.checked)}
                                            className="mt-0.5"
                                        />
                                        Acepto recibir alertas por WhatsApp para esta búsqueda y autorizo el tratamiento de mis datos.
                                    </label>

                                    {alertStatus ? (
                                        <div className="rounded-lg border border-border bg-surface-1/80 px-3 py-2 text-xs text-ink-soft">
                                            {alertStatus}
                                        </div>
                                    ) : null}

                                    <Button
                                        type="button"
                                        className="w-full rounded-full bg-ink-strong text-surface-0 hover:bg-ink-strong/90"
                                        disabled={isSavingAlert}
                                        onClick={saveSearchAlert}
                                    >
                                        {isSavingAlert ? "Guardando..." : "Guardar alerta"}
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    ) : null}

                    {viewMode !== "list" ? (
                        <button
                            onClick={toggleSearchAsMove}
                            className={cn(
                                "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all md:flex",
                                isSearchAsMove
                                    ? "border-accent-gold-soft bg-accent-gold-soft text-surface-0"
                                    : "border-border text-ink-soft hover:border-accent-gold-soft"
                            )}
                        >
                            <MapPinned className="h-3 w-3" />
                            Buscar al mover
                        </button>
                    ) : null}

                    <select
                        value={filters.sortBy}
                        onChange={(event) => setSortBy(event.target.value as typeof filters.sortBy)}
                        className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs text-ink-soft outline-none focus:border-accent-gold-soft md:block"
                    >
                        <option value="relevance">Relevancia</option>
                        <option value="price_asc">Precio: Menor a Mayor</option>
                        <option value="price_desc">Precio: Mayor a Menor</option>
                        <option value="newest">Más Recientes</option>
                    </select>

                    <div className="hidden items-center overflow-hidden rounded-full border border-border md:flex">
                        <button
                            onClick={() => setViewMode("split")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "split" ? "bg-ink-strong text-surface-0" : "text-ink-soft hover:bg-surface-1"
                            )}
                            title="Vista dividida"
                            aria-label="Activar vista dividida"
                        >
                            <Columns2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "list" ? "bg-ink-strong text-surface-0" : "text-ink-soft hover:bg-surface-1"
                            )}
                            title="Solo lista"
                            aria-label="Activar vista lista"
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("map")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "map" ? "bg-ink-strong text-surface-0" : "text-ink-soft hover:bg-surface-1"
                            )}
                            title="Solo mapa"
                            aria-label="Activar vista mapa"
                        >
                            <MapIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative flex flex-1 items-start xl:mx-auto xl:w-full xl:max-w-[1600px]">
                <div className="hidden h-[calc(100vh-7.5rem)] flex-none pr-3 pt-4 lg:sticky lg:top-[7.5rem] lg:block lg:w-72 xl:w-80">
                    <SearchFilters className="h-full rounded-2xl border border-border/70 bg-surface-0/80 shadow-sm" />
                </div>

                {viewMode !== "map" ? (
                    <div
                        className={cn(
                            "min-w-0 p-4 md:p-6",
                            viewMode === "list" ? "w-full" : "w-full md:w-[58%] xl:w-[52%]"
                        )}
                    >
                        <section className="mb-5 grid gap-3 xl:grid-cols-[1.7fr_1fr]">
                            <article className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold-strong">
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    Resumen de filtros
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {activeFilterPills.length > 0 ? (
                                        activeFilterPills.map((pill) => (
                                            <span
                                                key={pill}
                                                className="rounded-full border border-accent-gold-soft/30 bg-accent-gold-soft/10 px-3 py-1 text-xs font-medium text-ink-strong"
                                            >
                                                {pill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="rounded-full border border-border bg-surface-1/75 px-3 py-1 text-xs text-ink-soft">
                                            Sin filtros activos. Usa los paneles para una búsqueda más precisa.
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-soft md:grid-cols-4">
                                    <div className="rounded-xl border border-border/70 bg-surface-1/70 p-2">
                                        <p className="uppercase tracking-wide">Resultados</p>
                                        <p className="mt-1 text-base font-semibold text-ink-strong">{totalCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-border/70 bg-surface-1/70 p-2">
                                        <p className="uppercase tracking-wide">Tiempo query</p>
                                        <p className="mt-1 text-base font-semibold text-ink-strong">{queryMs > 0 ? `${queryMs} ms` : "-"}</p>
                                    </div>
                                    <div className="rounded-xl border border-border/70 bg-surface-1/70 p-2">
                                        <p className="uppercase tracking-wide">Modo</p>
                                        <p className="mt-1 text-base font-semibold capitalize text-ink-strong">{viewMode}</p>
                                    </div>
                                    <div className="rounded-xl border border-border/70 bg-surface-1/70 p-2">
                                        <p className="uppercase tracking-wide">Orden</p>
                                        <p className="mt-1 text-base font-semibold text-ink-strong">{filters.sortBy}</p>
                                    </div>
                                </div>
                            </article>

                            <article className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold-strong">
                                    <Compass className="h-3.5 w-3.5" />
                                    Rail de decisión
                                </div>
                                <div className="mt-3 space-y-2 text-xs">
                                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-1/70 px-3 py-2">
                                        <span className="flex items-center gap-2 text-ink-soft"><Scale className="h-3.5 w-3.5" />Comparador</span>
                                        <span className="font-semibold text-ink-strong">{featureFlags.compare ? `${compareCount}/4` : "OFF"}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-1/70 px-3 py-2">
                                        <span className="flex items-center gap-2 text-ink-soft"><Heart className="h-3.5 w-3.5" />Favoritos</span>
                                        <span className="font-semibold text-ink-strong">{favorites.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-1/70 px-3 py-2">
                                        <span className="flex items-center gap-2 text-ink-soft"><Bell className="h-3.5 w-3.5" />Alertas</span>
                                        <span className="font-semibold text-ink-strong">
                                            {featureFlags.savedSearch ? (user?.id ? "Activas" : "Requiere login") : "OFF"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-1/70 px-3 py-2">
                                        <span className="flex items-center gap-2 text-ink-soft"><TrendingUp className="h-3.5 w-3.5" />Insights</span>
                                        <span className="font-semibold text-ink-strong">{featureFlags.zoneInsights ? "ON" : "OFF"}</span>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <div className={cn(
                            "grid gap-4 pb-20 md:gap-6",
                            viewMode === "list"
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                : "grid-cols-1 lg:grid-cols-2"
                        )}>
                            {showInsightsPanel ? (
                                <div className="col-span-full rounded-2xl border border-border/70 bg-gradient-to-r from-surface-1 to-card p-4">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-accent-gold-soft" />
                                        <h3 className="text-sm font-semibold text-ink-strong">Insight de zona</h3>
                                    </div>
                                    {isInsightsLoading ? (
                                        <p className="mt-2 text-xs text-ink-soft">Cargando insights...</p>
                                    ) : filteredInsights.length > 0 ? (
                                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                                            {filteredInsights.map((insight) => (
                                                <div key={insight.zone} className="rounded-xl border border-border/70 bg-card p-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{insight.zone}</p>
                                                    <p className="mt-1 text-xs text-ink-soft">
                                                        Seguridad {insight.vibe.safety} · Ruido {insight.vibe.noise}
                                                    </p>
                                                    <p className="text-xs text-ink-soft">
                                                        View→WA {insight.funnel.view_to_whatsapp}% · View→Lead {insight.funnel.view_to_lead}%
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-ink-soft">No hay insights disponibles para esta zona todavía.</p>
                                    )}
                                </div>
                            ) : null}

                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <PropertyCardSkeleton key={index} />
                                ))
                            ) : properties.length > 0 ? (
                                properties.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        property={property}
                                        onHover={(id) => handlePropertyHover(typeof id === "string" ? parseInt(id, 10) : id)}
                                        onClick={() => handleResultClick(property.id)}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full py-12">
                                    <div className="rounded-3xl border border-border/80 bg-card/80 p-8 text-center shadow-sm">
                                        <MapIcon className="mx-auto mb-4 h-12 w-12 text-ink-soft/60" />
                                        <h3 className="mb-2 text-lg font-semibold text-ink-strong">
                                            No encontramos propiedades con esta combinación
                                        </h3>
                                        <p className="mx-auto max-w-xl text-sm text-ink-soft">
                                            Ajusta uno o dos parámetros para abrir más inventario sin perder calidad de coincidencia.
                                        </p>

                                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                                            <button
                                                onClick={() => applySmartSuggestion("expand_zone")}
                                                className="rounded-2xl border border-border bg-surface-1/70 px-3 py-3 text-left transition-colors hover:border-accent-gold-soft"
                                            >
                                                <p className="text-xs font-semibold uppercase tracking-wide text-accent-gold-strong">Sugerencia 1</p>
                                                <p className="mt-1 text-sm font-medium text-ink-strong">Ampliar zona</p>
                                                <p className="mt-1 text-xs text-ink-soft">Quita la búsqueda puntual para detectar barrios cercanos.</p>
                                            </button>
                                            <button
                                                onClick={() => applySmartSuggestion("plus_10_budget")}
                                                className="rounded-2xl border border-border bg-surface-1/70 px-3 py-3 text-left transition-colors hover:border-accent-gold-soft"
                                            >
                                                <p className="text-xs font-semibold uppercase tracking-wide text-accent-gold-strong">Sugerencia 2</p>
                                                <p className="mt-1 text-sm font-medium text-ink-strong">Subir 10% presupuesto</p>
                                                <p className="mt-1 text-xs text-ink-soft">Mejora acceso a propiedades con amenities superiores.</p>
                                            </button>
                                            <button
                                                onClick={() => applySmartSuggestion("minus_1_bedroom")}
                                                className="rounded-2xl border border-border bg-surface-1/70 px-3 py-3 text-left transition-colors hover:border-accent-gold-soft"
                                            >
                                                <p className="text-xs font-semibold uppercase tracking-wide text-accent-gold-strong">Sugerencia 3</p>
                                                <p className="mt-1 text-sm font-medium text-ink-strong">Un dormitorio menos</p>
                                                <p className="mt-1 text-xs text-ink-soft">Puede desbloquear opciones mejor ubicadas.</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {viewMode !== "list" ? (
                    <div
                        className={cn(
                            "relative min-w-0",
                            viewMode === "map" ? "w-full p-4 md:p-6" : "hidden flex-1 p-4 md:block md:p-6"
                        )}
                    >
                        <div
                            className={cn(
                                "overflow-hidden rounded-2xl border border-border/80 bg-surface-1 shadow-sm",
                                viewMode === "map"
                                    ? "h-[70vh] md:sticky md:top-[7.5rem] md:h-[calc(100vh-9rem)]"
                                    : "sticky top-[7.5rem] h-[calc(100vh-9rem)]"
                            )}
                        >
                            <InteractiveMap
                                properties={properties}
                                highlightedPropertyId={highlightedPropertyId}
                                onBoundsChange={updateBounds}
                                onPropertyHover={handlePropertyHover}
                                isSearchAsMove={isSearchAsMove}
                                className="h-full w-full"
                            />
                        </div>
                    </div>
                ) : null}

                <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 md:hidden">
                    <Button
                        onClick={() => setViewMode(viewMode === "map" ? "split" : "map")}
                        className="rounded-full bg-ink-strong px-6 text-surface-0 shadow-2xl"
                    >
                        {viewMode === "map" ? (
                            <>
                                <List className="mr-2 h-4 w-4" /> Lista
                            </>
                        ) : (
                            <>
                                <MapIcon className="mr-2 h-4 w-4" /> Mapa
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Search,
    Home,
    Building,
    Castle,
    Warehouse,
    Waves,
    TreePine,
    Car,
    Dumbbell,
    Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchFilters } from "@/hooks/useSearchFilters"
import { motion, AnimatePresence } from "framer-motion"

const PROPERTY_TYPES = [
    { id: "casa", label: "Casa", icon: Home },
    { id: "apartamento", label: "Apartamento", icon: Building },
    { id: "chacra", label: "Chacra", icon: Castle },
    { id: "terreno", label: "Terreno", icon: Warehouse },
]

const FEATURES = [
    { id: "pool", label: "Piscina", icon: Waves },
    { id: "garden", label: "Jardín", icon: TreePine },
    { id: "garage", label: "Garage", icon: Car },
    { id: "gym", label: "Gimnasio", icon: Dumbbell },
    { id: "security", label: "Seguridad", icon: Shield },
]

const ROOM_OPTIONS = [
    { value: null, label: "Todos" },
    { value: 1, label: "1+" },
    { value: 2, label: "2+" },
    { value: 3, label: "3+" },
    { value: 4, label: "4+" },
    { value: 5, label: "5+" },
]

interface SearchFiltersProps {
    className?: string
    onClose?: () => void
    isSheet?: boolean
}

export function SearchFilters({ className, onClose, isSheet }: SearchFiltersProps) {
    const {
        filters,
        isPending,
        hasActiveFilters,
        setQuery,
        setPriceRange,
        setBedrooms,
        setBathrooms,
        setPropertyType,
        setStatus,
        toggleFeature,
        resetFilters,
    } = useSearchFilters()

    const [expandedSections, setExpandedSections] = useState({
        price: true,
        type: true,
        rooms: true,
        features: false,
    })

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
    }

    return (
        <aside
            className={cn(
                "relative flex flex-col border-r border-border/70 bg-surface-0/95",
                isSheet ? "h-full" : "h-full w-72 lg:w-80",
                className
            )}
        >
            <div className="flex items-center justify-between border-b border-border/70 p-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-ink-soft" />
                    <h2 className="font-semibold text-ink-strong">Filtros</h2>
                    {hasActiveFilters ? (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-accent-gold-soft" />
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    {hasActiveFilters ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="text-xs text-ink-soft hover:text-ink-strong"
                        >
                            Limpiar
                        </Button>
                    ) : null}
                    {onClose ? (
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar filtros">
                            <X className="h-4 w-4" />
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                        type="text"
                        placeholder="Buscar por ubicación o título..."
                        value={filters.query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="border-border bg-surface-1/70 pl-10 focus:bg-card"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(filters.status === "for_sale" ? null : "for_sale")}
                        className={cn(
                            "rounded-full transition-all",
                            filters.status === "for_sale"
                                ? "border-ink-strong bg-ink-strong text-surface-0"
                                : "border-border text-ink-soft"
                        )}
                    >
                        Venta
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(filters.status === "for_rent" ? null : "for_rent")}
                        className={cn(
                            "rounded-full transition-all",
                            filters.status === "for_rent"
                                ? "border-ink-strong bg-ink-strong text-surface-0"
                                : "border-border text-ink-soft"
                        )}
                    >
                        Alquiler
                    </Button>
                </div>

                <CollapsibleSection
                    title="Rango de Precio"
                    isExpanded={expandedSections.price}
                    onToggle={() => toggleSection("price")}
                >
                    <PriceRangeFields
                        key={`${filters.priceMin ?? 0}-${filters.priceMax ?? 10000000}`}
                        priceMin={filters.priceMin}
                        priceMax={filters.priceMax}
                        onCommit={setPriceRange}
                    />
                </CollapsibleSection>

                <CollapsibleSection
                    title="Tipo de Propiedad"
                    isExpanded={expandedSections.type}
                    onToggle={() => toggleSection("type")}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {PROPERTY_TYPES.map((type) => {
                            const Icon = type.icon
                            const isSelected = filters.propertyType === type.id
                            return (
                                <Button
                                    key={type.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPropertyType(isSelected ? null : type.id)}
                                    className={cn(
                                        "h-10 justify-start gap-2 transition-all",
                                        isSelected
                                            ? "border-ink-strong bg-ink-strong text-surface-0"
                                            : "border-border text-ink-soft hover:border-accent-gold-soft"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {type.label}
                                </Button>
                            )
                        })}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Dormitorios y Baños"
                    isExpanded={expandedSections.rooms}
                    onToggle={() => toggleSection("rooms")}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm text-ink-soft">Dormitorios</label>
                            <div className="flex gap-1">
                                {ROOM_OPTIONS.map((option) => (
                                    <Button
                                        key={`bed-${option.value}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setBedrooms(option.value)}
                                        className={cn(
                                            "flex-1 px-2 text-xs",
                                            filters.bedrooms === option.value
                                                ? "border-ink-strong bg-ink-strong text-surface-0"
                                                : "border-border text-ink-soft"
                                        )}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-ink-soft">Baños</label>
                            <div className="flex gap-1">
                                {ROOM_OPTIONS.map((option) => (
                                    <Button
                                        key={`bath-${option.value}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setBathrooms(option.value)}
                                        className={cn(
                                            "flex-1 px-2 text-xs",
                                            filters.bathrooms === option.value
                                                ? "border-ink-strong bg-ink-strong text-surface-0"
                                                : "border-border text-ink-soft"
                                        )}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Características"
                    isExpanded={expandedSections.features}
                    onToggle={() => toggleSection("features")}
                    badge={filters.features.length > 0 ? filters.features.length : undefined}
                >
                    <div className="flex flex-wrap gap-2">
                        {FEATURES.map((feature) => {
                            const Icon = feature.icon
                            const isSelected = filters.features.includes(feature.id)
                            return (
                                <Button
                                    key={feature.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleFeature(feature.id)}
                                    className={cn(
                                        "gap-1.5 rounded-full transition-all",
                                        isSelected
                                            ? "border-accent-gold-soft bg-accent-gold-soft text-surface-0"
                                            : "border-border text-ink-soft hover:border-accent-gold-soft"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {feature.label}
                                </Button>
                            )
                        })}
                    </div>
                </CollapsibleSection>
            </div>

            {isPending ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-0/60">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-gold-soft border-t-transparent" />
                </div>
            ) : null}
        </aside>
    )
}

interface PriceRangeFieldsProps {
    priceMin: number | null
    priceMax: number | null
    onCommit: (min: number | null, max: number | null) => void
}

function PriceRangeFields({ priceMin, priceMax, onCommit }: PriceRangeFieldsProps) {
    const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
        priceMin ?? 0,
        priceMax ?? 10000000,
    ])

    const formatPrice = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
        return `$${value}`
    }

    const handlePriceCommit = () => {
        onCommit(
            localPriceRange[0] > 0 ? localPriceRange[0] : null,
            localPriceRange[1] < 10000000 ? localPriceRange[1] : null
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between text-sm">
                <span className="text-ink-soft">{formatPrice(localPriceRange[0])}</span>
                <span className="text-ink-soft">{formatPrice(localPriceRange[1])}</span>
            </div>
            <Slider
                value={localPriceRange}
                min={0}
                max={10000000}
                step={50000}
                onValueChange={(value) => setLocalPriceRange(value as [number, number])}
                onValueCommit={handlePriceCommit}
                className="[&_[role=slider]]:border-accent-gold-soft [&_[role=slider]]:bg-accent-gold-soft"
            />
            <div className="flex gap-2">
                <Input
                    type="number"
                    placeholder="Mín"
                    value={localPriceRange[0] || ""}
                    onChange={(event) => setLocalPriceRange([Number(event.target.value), localPriceRange[1]])}
                    onBlur={handlePriceCommit}
                    className="text-sm"
                />
                <Input
                    type="number"
                    placeholder="Máx"
                    value={localPriceRange[1] || ""}
                    onChange={(event) => setLocalPriceRange([localPriceRange[0], Number(event.target.value)])}
                    onBlur={handlePriceCommit}
                    className="text-sm"
                />
            </div>
        </div>
    )
}

interface CollapsibleSectionProps {
    title: string
    isExpanded: boolean
    onToggle: () => void
    badge?: number
    children: React.ReactNode
}

function CollapsibleSection({ title, isExpanded, onToggle, badge, children }: CollapsibleSectionProps) {
    return (
        <div className="space-y-3">
            <button onClick={onToggle} className="group flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-strong">{title}</span>
                    {badge !== undefined ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold-soft text-xs text-surface-0">
                            {badge}
                        </span>
                    ) : null}
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-ink-soft group-hover:text-ink-strong" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-ink-soft group-hover:text-ink-strong" />
                )}
            </button>
            <AnimatePresence>
                {isExpanded ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    )
}

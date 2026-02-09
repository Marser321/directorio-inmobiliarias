"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
    Filter, X, ChevronDown, ChevronUp,
    Search, Home, Building, Castle, Warehouse,
    Waves, TreePine, Car, Dumbbell, Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchFilters, SearchFilters as SearchFiltersType } from "@/hooks/useSearchFilters"
import { motion, AnimatePresence } from "framer-motion"

// Property types with icons
const PROPERTY_TYPES = [
    { id: "casa", label: "Casa", icon: Home },
    { id: "apartamento", label: "Apartamento", icon: Building },
    { id: "chacra", label: "Chacra", icon: Castle },
    { id: "terreno", label: "Terreno", icon: Warehouse },
]

// Features with icons
const FEATURES = [
    { id: "pool", label: "Piscina", icon: Waves },
    { id: "garden", label: "Jardín", icon: TreePine },
    { id: "garage", label: "Garage", icon: Car },
    { id: "gym", label: "Gimnasio", icon: Dumbbell },
    { id: "security", label: "Seguridad", icon: Shield },
]

// Bedroom/Bathroom options
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
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    // Format price for display
    const formatPrice = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
        return `$${value}`
    }

    // Local price state for slider (to avoid constant URL updates)
    const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
        filters.priceMin || 0,
        filters.priceMax || 10000000,
    ])

    // Sync local price range with filters (e.g., when resetting)
    useEffect(() => {
        setLocalPriceRange([
            filters.priceMin || 0,
            filters.priceMax || 10000000,
        ])
    }, [filters.priceMin, filters.priceMax])

    const handlePriceCommit = () => {
        setPriceRange(
            localPriceRange[0] > 0 ? localPriceRange[0] : null,
            localPriceRange[1] < 10000000 ? localPriceRange[1] : null
        )
    }

    return (
        <aside
            className={cn(
                "bg-white border-r border-slate-100 flex flex-col",
                isSheet ? "h-full" : "w-72 lg:w-80 h-full",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <h2 className="font-semibold text-slate-900">Filtros</h2>
                    {hasActiveFilters && (
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="text-xs text-slate-500 hover:text-slate-900"
                        >
                            Limpiar
                        </Button>
                    )}
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Scrollable Filters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por ubicación o título..."
                        value={filters.query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                    />
                </div>

                {/* Transaction Type */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(filters.status === "for_sale" ? null : "for_sale")}
                        className={cn(
                            "flex-1 rounded-full transition-all",
                            filters.status === "for_sale"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "border-slate-200"
                        )}
                    >
                        Venta
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(filters.status === "for_rent" ? null : "for_rent")}
                        className={cn(
                            "flex-1 rounded-full transition-all",
                            filters.status === "for_rent"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "border-slate-200"
                        )}
                    >
                        Alquiler
                    </Button>
                </div>

                {/* Price Range Section */}
                <CollapsibleSection
                    title="Rango de Precio"
                    isExpanded={expandedSections.price}
                    onToggle={() => toggleSection("price")}
                >
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">{formatPrice(localPriceRange[0])}</span>
                            <span className="text-slate-600">{formatPrice(localPriceRange[1])}</span>
                        </div>
                        <Slider
                            value={localPriceRange}
                            min={0}
                            max={10000000}
                            step={50000}
                            onValueChange={(value) => setLocalPriceRange(value as [number, number])}
                            onValueCommit={handlePriceCommit}
                            className="[&_[role=slider]]:bg-[#D4AF37] [&_[role=slider]]:border-[#D4AF37]"
                        />
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="Mín"
                                value={localPriceRange[0] || ""}
                                onChange={(e) => setLocalPriceRange([Number(e.target.value), localPriceRange[1]])}
                                onBlur={handlePriceCommit}
                                className="text-sm"
                            />
                            <Input
                                type="number"
                                placeholder="Máx"
                                value={localPriceRange[1] || ""}
                                onChange={(e) => setLocalPriceRange([localPriceRange[0], Number(e.target.value)])}
                                onBlur={handlePriceCommit}
                                className="text-sm"
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Property Type Section */}
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
                                        "justify-start gap-2 h-10 transition-all",
                                        isSelected
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "border-slate-200 hover:border-[#D4AF37]"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {type.label}
                                </Button>
                            )
                        })}
                    </div>
                </CollapsibleSection>

                {/* Rooms Section */}
                <CollapsibleSection
                    title="Dormitorios y Baños"
                    isExpanded={expandedSections.rooms}
                    onToggle={() => toggleSection("rooms")}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-500 mb-2 block">Dormitorios</label>
                            <div className="flex gap-1">
                                {ROOM_OPTIONS.map((opt) => (
                                    <Button
                                        key={`bed-${opt.value}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setBedrooms(opt.value)}
                                        className={cn(
                                            "flex-1 text-xs px-2",
                                            filters.bedrooms === opt.value
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "border-slate-200"
                                        )}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-slate-500 mb-2 block">Baños</label>
                            <div className="flex gap-1">
                                {ROOM_OPTIONS.map((opt) => (
                                    <Button
                                        key={`bath-${opt.value}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setBathrooms(opt.value)}
                                        className={cn(
                                            "flex-1 text-xs px-2",
                                            filters.bathrooms === opt.value
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "border-slate-200"
                                        )}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Features Section */}
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
                                            ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                                            : "border-slate-200 hover:border-[#D4AF37]"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {feature.label}
                                </Button>
                            )
                        })}
                    </div>
                </CollapsibleSection>

            </div>

            {/* Loading Indicator */}
            {isPending && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </aside>
    )
}

// Collapsible Section Component
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
            <button
                onClick={onToggle}
                className="flex items-center justify-between w-full group"
            >
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{title}</span>
                    {badge !== undefined && (
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-white text-xs flex items-center justify-center">
                            {badge}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                )}
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

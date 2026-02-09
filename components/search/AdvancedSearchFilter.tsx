'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Search,
    SlidersHorizontal,
    X,
    ChevronDown,
    Home,
    Building2
} from 'lucide-react'

// Amenity options with icons
const AMENITIES = [
    { id: 'pool', label: 'Piscina', icon: '🏊' },
    { id: 'security', label: 'Seguridad 24h', icon: '🔒' },
    { id: 'gym', label: 'Gimnasio', icon: '💪' },
    { id: 'garden', label: 'Jardín', icon: '🌳' },
    { id: 'garage', label: 'Garage', icon: '🚗' },
    { id: 'bbq', label: 'Parrillero', icon: '🔥' },
    { id: 'sea_view', label: 'Vista Mar', icon: '🌊' },
    { id: 'terrace', label: 'Terraza', icon: '☀️' },
]

// Property types
const PROPERTY_TYPES = [
    { id: 'house', label: 'Casa', icon: Home },
    { id: 'apartment', label: 'Apartamento', icon: Building2 },
]

interface FilterState {
    minPrice: number
    maxPrice: number
    minBedrooms: number
    maxBedrooms: number
    amenities: string[]
    operationType: 'for_sale' | 'for_rent' | 'all'
    propertyType: string | null
    searchQuery: string
}

interface AdvancedSearchFilterProps {
    onFilterChange: (filters: FilterState) => void
    className?: string
}

/**
 * AdvancedSearchFilter - Premium filter sidebar
 * Features:
 * - Dual range slider for price
 * - Amenity chips (toggle buttons)
 * - Operation type toggle (Venta/Alquiler)
 * - URL sync for shareable searches
 * - Debounced filter updates
 */
export function AdvancedSearchFilter({ onFilterChange, className = '' }: AdvancedSearchFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize state from URL params
    const [filters, setFilters] = useState<FilterState>(() => ({
        minPrice: parseInt(searchParams.get('minPrice') || '0'),
        maxPrice: parseInt(searchParams.get('maxPrice') || '10000000'),
        minBedrooms: parseInt(searchParams.get('minBedrooms') || '0'),
        maxBedrooms: parseInt(searchParams.get('maxBedrooms') || '10'),
        amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
        operationType: (searchParams.get('operation') as 'for_sale' | 'for_rent') || 'all',
        propertyType: searchParams.get('type') || null,
        searchQuery: searchParams.get('q') || '',
    }))

    const [isExpanded, setIsExpanded] = useState(true)

    // Debounce filter changes and sync to URL
    useEffect(() => {
        const timer = setTimeout(() => {
            // Build URL params
            const params = new URLSearchParams()
            if (filters.minPrice > 0) params.set('minPrice', filters.minPrice.toString())
            if (filters.maxPrice < 10000000) params.set('maxPrice', filters.maxPrice.toString())
            if (filters.minBedrooms > 0) params.set('minBedrooms', filters.minBedrooms.toString())
            if (filters.amenities.length > 0) params.set('amenities', filters.amenities.join(','))
            if (filters.operationType !== 'all') params.set('operation', filters.operationType)
            if (filters.propertyType) params.set('type', filters.propertyType)
            if (filters.searchQuery) params.set('q', filters.searchQuery)

            // Update URL without reload
            const newUrl = `${window.location.pathname}?${params.toString()}`
            router.replace(newUrl, { scroll: false })

            // Notify parent
            onFilterChange(filters)
        }, 300) // 300ms debounce

        return () => clearTimeout(timer)
    }, [filters, router, onFilterChange])

    const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }, [])

    const toggleAmenity = useCallback((amenityId: string) => {
        setFilters(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenityId)
                ? prev.amenities.filter(id => id !== amenityId)
                : [...prev.amenities, amenityId]
        }))
    }, [])

    const clearFilters = useCallback(() => {
        setFilters({
            minPrice: 0,
            maxPrice: 10000000,
            minBedrooms: 0,
            maxBedrooms: 10,
            amenities: [],
            operationType: 'all',
            propertyType: null,
            searchQuery: '',
        })
    }, [])

    const formatPrice = (price: number) => {
        if (price >= 1000000) {
            return `$${(price / 1000000).toFixed(1)}M`
        }
        return `$${(price / 1000).toFixed(0)}K`
    }

    const activeFilterCount = [
        filters.minPrice > 0,
        filters.maxPrice < 10000000,
        filters.minBedrooms > 0,
        filters.amenities.length > 0,
        filters.operationType !== 'all',
        filters.propertyType !== null,
    ].filter(Boolean).length

    return (
        <motion.div
            className={`bg-card rounded-2xl border border-border shadow-lg overflow-hidden ${className}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-gold" />
                    <span className="font-semibold">Filtros</span>
                    {activeFilterCount > 0 && (
                        <span className="bg-gold text-black text-xs px-2 py-0.5 rounded-full font-medium">
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Collapsible Content */}
            <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0 }}
                className="overflow-hidden"
            >
                <div className="p-4 space-y-6">
                    {/* Search Query */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Buscar
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={filters.searchQuery}
                                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                                placeholder="Título, descripción..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Operation Type Toggle */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Operación
                        </label>
                        <div className="flex gap-2">
                            {[
                                { id: 'all', label: 'Todas' },
                                { id: 'for_sale', label: 'Venta' },
                                { id: 'for_rent', label: 'Alquiler' },
                            ].map(op => (
                                <button
                                    key={op.id}
                                    onClick={() => updateFilter('operationType', op.id as 'for_sale' | 'for_rent' | 'all')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${filters.operationType === op.id
                                            ? 'bg-gold text-black'
                                            : 'bg-muted hover:bg-muted/80 text-foreground'
                                        }`}
                                >
                                    {op.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Precio: {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)}
                        </label>
                        <div className="space-y-3">
                            <input
                                type="range"
                                min={0}
                                max={10000000}
                                step={50000}
                                value={filters.minPrice}
                                onChange={(e) => updateFilter('minPrice', Math.min(parseInt(e.target.value), filters.maxPrice - 50000))}
                                className="w-full accent-gold"
                            />
                            <input
                                type="range"
                                min={0}
                                max={10000000}
                                step={50000}
                                value={filters.maxPrice}
                                onChange={(e) => updateFilter('maxPrice', Math.max(parseInt(e.target.value), filters.minPrice + 50000))}
                                className="w-full accent-gold"
                            />
                        </div>
                    </div>

                    {/* Bedrooms */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Habitaciones: {filters.minBedrooms}+
                        </label>
                        <div className="flex gap-2">
                            {[0, 1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    onClick={() => updateFilter('minBedrooms', num)}
                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${filters.minBedrooms === num
                                            ? 'bg-gold text-black'
                                            : 'bg-muted hover:bg-muted/80 text-foreground'
                                        }`}
                                >
                                    {num === 0 ? 'Any' : num === 5 ? '5+' : num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Property Type */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Tipo de Propiedad
                        </label>
                        <div className="flex gap-2">
                            {PROPERTY_TYPES.map(type => {
                                const Icon = type.icon
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => updateFilter('propertyType',
                                            filters.propertyType === type.id ? null : type.id
                                        )}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${filters.propertyType === type.id
                                                ? 'bg-gold text-black'
                                                : 'bg-muted hover:bg-muted/80 text-foreground'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {type.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Amenities Chips */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Amenidades
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AMENITIES.map(amenity => (
                                <button
                                    key={amenity.id}
                                    onClick={() => toggleAmenity(amenity.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${filters.amenities.includes(amenity.id)
                                            ? 'bg-gold text-black'
                                            : 'bg-muted hover:bg-muted/80 text-foreground'
                                        }`}
                                >
                                    <span>{amenity.icon}</span>
                                    <span>{amenity.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clear Filters Button */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}

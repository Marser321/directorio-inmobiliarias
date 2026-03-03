"use client"

import * as React from "react"
import { Command } from "cmdk"
import { Search, Home, MapPin, Loader2, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

type SearchResultRow = {
    id: number
    title: string
    location_name?: string | null
    location_slug?: string | null
    price: number
    currency?: string | null
}

type PropertyResult = {
    id: number
    title: string
    location: string
    priceLabel: string
}

function formatPrice(price: number, currency: string | null | undefined) {
    const safeCurrency = typeof currency === 'string' && currency.trim().length > 0 ? currency : 'USD'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(price || 0))
}

function normalizeSearchResult(row: SearchResultRow): PropertyResult {
    return {
        id: row.id,
        title: row.title,
        location: row.location_name || row.location_slug || 'Ubicación no especificada',
        priceLabel: formatPrice(row.price, row.currency),
    }
}

export function SearchDialog() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [results, setResults] = React.useState<PropertyResult[]>([])
    const router = useRouter()
    const abortRef = React.useRef<AbortController | null>(null)
    const requestIdRef = React.useRef(0)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((current) => !current)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const handleSearch = React.useCallback(async (value: string) => {
        setQuery(value)
        const trimmed = value.trim()
        if (trimmed.length < 3) {
            abortRef.current?.abort()
            setLoading(false)
            setResults([])
            return
        }

        const requestId = requestIdRef.current + 1
        requestIdRef.current = requestId

        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setLoading(true)

        try {
            const params = new URLSearchParams({
                q: trimmed,
                limit: '8',
                sort: 'relevance',
            })

            const response = await fetch(`/api/search/properties?${params.toString()}`, {
                cache: 'no-store',
                signal: controller.signal,
            })

            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(payload?.error || 'No se pudo ejecutar la búsqueda')
            }

            if (requestId !== requestIdRef.current) return

            const rows = Array.isArray(payload?.data) ? (payload.data as SearchResultRow[]) : []
            setResults(rows.map(normalizeSearchResult))
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
            if (requestId === requestIdRef.current) {
                setResults([])
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false)
            }
        }
    }, [])

    React.useEffect(() => {
        return () => {
            abortRef.current?.abort()
        }
    }, [])

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 md:pt-[20vh] px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:bg-black/80 dark:border-white/10"
                    >
                        <Command className="bg-transparent" label="Buscador Inteligente">
                            <div className="flex items-center border-b border-white/10 px-4">
                                <Search className="mr-2 h-5 w-5 text-white/50" />
                                <Command.Input
                                    value={query}
                                    onValueChange={(nextValue) => {
                                        void handleSearch(nextValue)
                                    }}
                                    placeholder="Busca 'apartamento con vista al mar'..."
                                    className="flex h-14 w-full bg-transparent py-3 text-lg text-white outline-none placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                                    autoFocus
                                />
                                <div className="flex items-center gap-1">
                                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/70 opacity-100">
                                        <span className="text-xs">ESC</span>
                                    </kbd>
                                </div>
                            </div>

                            <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
                                {!loading && results.length === 0 && query.trim().length >= 3 && (
                                    <div className="py-14 text-center text-sm text-white/60">
                                        <p>No encontramos propiedades exactas.</p>
                                        <p className="mt-1 text-xs text-white/40">Prueba con &quot;Casa en José Ignacio&quot;</p>
                                    </div>
                                )}

                                {loading && (
                                    <div className="flex items-center justify-center py-14">
                                        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                                    </div>
                                )}

                                {results.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="px-2 py-1.5 text-xs font-semibold text-white/40">Resultados Sugeridos</div>
                                        {results.map((item) => (
                                            <Command.Item
                                                key={item.id}
                                                value={`${item.title} ${item.location}`}
                                                onSelect={() => {
                                                    setOpen(false)
                                                    router.push(`/property/${item.id}`)
                                                }}
                                                className="group relative flex cursor-pointer select-none items-center rounded-lg p-3 text-sm text-white/90 outline-none data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                                            >
                                                <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                                                    <Home className="h-5 w-5 text-white/70" />
                                                </div>
                                                <div className="flex flex-1 flex-col gap-1">
                                                    <span className="font-medium text-white">{item.title}</span>
                                                    <span className="flex items-center text-xs text-white/60">
                                                        <MapPin className="mr-1 h-3 w-3" />
                                                        {item.location}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-semibold text-brand-gold">{item.priceLabel}</span>
                                                    <ArrowRight className="h-4 w-4 opacity-0 transition-all group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-1" />
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </div>
                                )}

                                {!query && !loading && (
                                    <div className="px-2 py-4">
                                        <div className="mb-2 text-xs font-semibold text-white/40">Búsquedas Populares</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {["Penthouse en La Barra", "Casa de Campo", "Frente al Mar", "Oportunidades de Inversión"].map((term) => (
                                                <button
                                                    key={term}
                                                    onClick={() => {
                                                        void handleSearch(term)
                                                    }}
                                                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                                >
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Command.List>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

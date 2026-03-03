'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
    AlertTriangle,
    Search,
    Target,
    CheckCircle2,
    XCircle,
    RefreshCw,
    MapPin,
    Lightbulb,
    Activity,
    Clock,
    ChevronRight,
    MessageCircle,
} from 'lucide-react'
import { createClient as createBrowserClient } from '@/utils/supabase/client'

const supabase = createBrowserClient()
const FUNNEL_DAY_OPTIONS = [7, 14, 30] as const
type FunnelDayWindow = (typeof FUNNEL_DAY_OPTIONS)[number]

interface CoverageGap {
    neighborhood: string
    zone: string
    property_category: string
    property_count: number
    priority: 'urgent' | 'high' | 'medium'
}

interface InnovationSuggestion {
    query: string
    search_count: number
    suggested_category: string
}

interface QualityLog {
    id: string
    created_at: string
    entity_type: string
    check_type: string
    is_discrepancy: boolean
    status: string
}

interface FunnelSummary {
    totals: {
        hero_search_submitted: number
        search_results_loaded: number
        search_result_clicked: number
        property_viewed: number
        whatsapp_clicked: number
        lead_form_submitted: number
    }
    conversion: {
        search_to_click: number
        click_to_view: number
        view_to_whatsapp: number
        view_to_lead: number
    }
    byCoordinateSource?: {
        source: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown'
        total_events: number
        property_viewed: number
        whatsapp_clicked: number
        lead_form_submitted: number
        view_to_whatsapp: number
        view_to_lead: number
    }[]
    periodDays?: number
}

// Stat Card Component
function StatCard({
    icon: Icon,
    label,
    value,
    sublabel,
    color = 'gold'
}: {
    icon: React.ElementType
    label: string
    value: string | number
    sublabel?: string
    color?: 'gold' | 'red' | 'green' | 'blue'
}) {
    const colorClasses = {
        gold: 'from-gold/20 to-gold/5 border-gold/20 text-gold',
        red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-500',
        green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500',
        blue: 'from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-500',
    }

    return (
        <div className={`rounded-xl border bg-gradient-to-br ${colorClasses[color]} p-5`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {sublabel && (
                        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
                    )}
                </div>
                <div className={`p-2 rounded-lg bg-background/50`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

// Priority Badge Component
function PriorityBadge({ priority }: { priority: string }) {
    const colors = {
        urgent: 'bg-red-500/20 text-red-500 border-red-500/30',
        high: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
        medium: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
    }
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[priority as keyof typeof colors] || colors.medium}`}>
            {priority.toUpperCase()}
        </span>
    )
}

function getCoordinateSourceLabel(source: string) {
    if (source === 'manual') return 'Manual'
    if (source === 'geocoded') return 'Geocodificada'
    if (source === 'centroid') return 'Centroide de zona'
    if (source === 'none') return 'Sin coordenadas'
    return 'No informado'
}

function getCoordinateSourceBadgeClass(source: string) {
    if (source === 'manual') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (source === 'geocoded') return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    if (source === 'centroid') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    if (source === 'none') return 'bg-red-500/20 text-red-400 border-red-500/30'
    return 'bg-muted/40 text-muted-foreground border-border/60'
}

export default function ManagerDashboardPage() {
    const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([])
    const [suggestions, setSuggestions] = useState<InnovationSuggestion[]>([])
    const [qualityLogs, setQualityLogs] = useState<QualityLog[]>([])
    const [funnelSummary, setFunnelSummary] = useState<FunnelSummary | null>(null)
    const [isRefreshingAll, setIsRefreshingAll] = useState(false)
    const [isFunnelLoading, setIsFunnelLoading] = useState(false)
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const [selectedFunnelDays, setSelectedFunnelDays] = useState<FunnelDayWindow>(7)
    const funnelAbortRef = useRef<AbortController | null>(null)
    const funnelRequestIdRef = useRef(0)

    const fetchCoreData = useCallback(async () => {
        try {
            // Fetch coverage gaps
            const { data: gaps } = await supabase.rpc('get_coverage_gaps')
            if (gaps) setCoverageGaps(gaps)

            // Fetch innovation suggestions
            const { data: innovationData } = await supabase.rpc('get_innovation_suggestions', { days_back: 7 })
            if (innovationData) setSuggestions(innovationData)

            // Fetch recent quality logs
            const { data: logs } = await supabase
                .from('data_quality_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)
            if (logs) setQualityLogs(logs)
            setLastRefresh(new Date())
        } catch (error) {
            console.error('[ManagerDashboard] Error fetching data:', error)
        }
    }, [])

    const fetchFunnelData = useCallback(async (days: FunnelDayWindow) => {
        const requestId = funnelRequestIdRef.current + 1
        funnelRequestIdRef.current = requestId
        funnelAbortRef.current?.abort()
        const controller = new AbortController()
        funnelAbortRef.current = controller

        setIsFunnelLoading(true)
        try {
            const funnelResponse = await fetch(`/api/manager/funnel/summary?days=${days}`, {
                cache: 'no-store',
                signal: controller.signal,
            })
            if (funnelResponse.ok) {
                const payload = await funnelResponse.json()
                if (requestId === funnelRequestIdRef.current) {
                    setFunnelSummary((payload?.data || null) as FunnelSummary | null)
                }
            }
            if (requestId === funnelRequestIdRef.current) {
                setLastRefresh(new Date())
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return
            }
            console.error('[ManagerDashboard] Error fetching funnel summary:', error)
        } finally {
            if (requestId === funnelRequestIdRef.current) {
                setIsFunnelLoading(false)
            }
        }
    }, [])

    const refreshAllData = useCallback(async () => {
        setIsRefreshingAll(true)
        try {
            await Promise.all([fetchCoreData(), fetchFunnelData(selectedFunnelDays)])
        } finally {
            setIsRefreshingAll(false)
        }
    }, [fetchCoreData, fetchFunnelData, selectedFunnelDays])

    // Fetch data from Supabase
    useEffect(() => {
        void fetchCoreData()
    }, [fetchCoreData])

    useEffect(() => {
        void fetchFunnelData(selectedFunnelDays)
    }, [fetchFunnelData, selectedFunnelDays])

    useEffect(() => {
        return () => {
            funnelAbortRef.current?.abort()
        }
    }, [])

    const urgentGaps = coverageGaps.filter(g => g.priority === 'urgent').length
    const totalGaps = coverageGaps.length
    const discrepancies = qualityLogs.filter(l => l.is_discrepancy).length
    const coordinateSourceRows = [...(funnelSummary?.byCoordinateSource || [])]
        .sort((a, b) => {
            if (b.view_to_whatsapp !== a.view_to_whatsapp) return b.view_to_whatsapp - a.view_to_whatsapp
            if (b.property_viewed !== a.property_viewed) return b.property_viewed - a.property_viewed
            return b.total_events - a.total_events
        })
    const topCoordinateSource = coordinateSourceRows[0] || null

    return (
        <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-3">
                            <span className="text-3xl">🧠</span>
                            Manager Agent
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Sistema de Mejora Continua • Health Check Dashboard
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Última actualización: {lastRefresh.toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background/70 p-1">
                            {FUNNEL_DAY_OPTIONS.map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => setSelectedFunnelDays(days)}
                                    disabled={isFunnelLoading || isRefreshingAll}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${selectedFunnelDays === days
                                        ? 'bg-gold text-black'
                                        : 'text-muted-foreground hover:bg-muted/60'
                                        }`}
                                >
                                    {days}d
                                </button>
                            ))}
                        </div>
                        {isFunnelLoading ? (
                            <span className="text-xs text-sky-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Actualizando funnel...
                            </span>
                        ) : null}
                        <button
                            onClick={() => {
                                void refreshAllData()
                            }}
                            disabled={isRefreshingAll}
                            className="btn-luxe py-2 px-4 rounded-xl text-white font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
                            {isRefreshingAll ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <StatCard
                        icon={AlertTriangle}
                        label="Gaps Críticos"
                        value={urgentGaps}
                        sublabel={`de ${totalGaps} zonas detectadas`}
                        color={urgentGaps > 0 ? 'red' : 'green'}
                    />
                    <StatCard
                        icon={Search}
                        label="Búsquedas Fallidas"
                        value={suggestions.reduce((acc, s) => acc + s.search_count, 0)}
                        sublabel="últimos 7 días"
                        color="blue"
                    />
                    <StatCard
                        icon={Activity}
                        label="Perfiles Verificados"
                        value={qualityLogs.length}
                        sublabel={`${discrepancies} discrepancias detectadas`}
                        color={discrepancies > 0 ? 'gold' : 'green'}
                    />
                    <StatCard
                        icon={Lightbulb}
                        label="Categorías Sugeridas"
                        value={new Set(suggestions.map(s => s.suggested_category)).size}
                        sublabel="basado en búsquedas"
                        color="gold"
                    />
                </motion.div>

                {funnelSummary ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${isFunnelLoading ? 'opacity-75' : 'opacity-100'
                            }`}
                    >
                        <StatCard
                            icon={Search}
                            label="Search -> Click"
                            value={`${funnelSummary.conversion.search_to_click}%`}
                            sublabel={`${funnelSummary.totals.search_result_clicked} clics sobre ${funnelSummary.totals.search_results_loaded} resultados`}
                            color="blue"
                        />
                        <StatCard
                            icon={Activity}
                            label="Click -> Ficha"
                            value={`${funnelSummary.conversion.click_to_view}%`}
                            sublabel={`${funnelSummary.totals.property_viewed} vistas de ficha`}
                            color="gold"
                        />
                        <StatCard
                            icon={MessageCircle}
                            label="Ficha -> WhatsApp"
                            value={`${funnelSummary.conversion.view_to_whatsapp}%`}
                            sublabel={`${funnelSummary.totals.whatsapp_clicked} clics WhatsApp`}
                            color="green"
                        />
                        <StatCard
                            icon={Target}
                            label="Ficha -> Lead"
                            value={`${funnelSummary.conversion.view_to_lead}%`}
                            sublabel={`${funnelSummary.totals.lead_form_submitted} leads internos`}
                            color="gold"
                        />
                    </motion.div>
                ) : null}

                {funnelSummary?.byCoordinateSource && funnelSummary.byCoordinateSource.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        className={`glass-card rounded-xl overflow-hidden transition-opacity ${isFunnelLoading ? 'opacity-75' : 'opacity-100'
                            }`}
                    >
                        <div className="p-5 border-b border-border/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-gold" />
                                Impacto por Origen de Coordenadas
                            </h2>
                            <div className="flex items-center gap-2">
                                {isFunnelLoading ? (
                                    <span className="text-xs text-sky-400 flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        Actualizando...
                                    </span>
                                ) : null}
                                <span className="text-xs text-muted-foreground">
                                    Ventana {funnelSummary.periodDays || 7} días
                                </span>
                            </div>
                        </div>
                        {topCoordinateSource ? (
                            <div className="px-5 py-3 border-b border-border/40 bg-muted/20 text-sm text-muted-foreground">
                                Mejor fuente a WhatsApp:
                                <span className="text-foreground font-semibold ml-1">
                                    {getCoordinateSourceLabel(topCoordinateSource.source)}
                                </span>
                                <span className="ml-2">
                                    ({topCoordinateSource.view_to_whatsapp}% con {topCoordinateSource.property_viewed} vistas)
                                </span>
                            </div>
                        ) : null}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30">
                                    <tr className="text-left text-xs text-muted-foreground">
                                        <th className="p-3 font-medium">Origen</th>
                                        <th className="p-3 font-medium">Eventos (alta intención)</th>
                                        <th className="p-3 font-medium">Vista → WhatsApp</th>
                                        <th className="p-3 font-medium">Vista → Lead</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {coordinateSourceRows.map((row) => (
                                        <tr key={row.source} className="hover:bg-gold/5 transition-colors">
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${getCoordinateSourceBadgeClass(row.source)}`}>
                                                    {getCoordinateSourceLabel(row.source)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-foreground">
                                                <span className="font-semibold">{row.total_events}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({row.property_viewed} vistas, {row.whatsapp_clicked} WA)
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-foreground font-medium">
                                                {row.view_to_whatsapp}%
                                                {row.property_viewed < 5 ? (
                                                    <span className="ml-2 text-xs font-normal text-amber-400">
                                                        muestra baja
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="p-3 text-sm text-foreground font-medium">
                                                {row.view_to_lead}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : null}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Coverage Gaps */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card rounded-xl overflow-hidden"
                    >
                        <div className="p-5 border-b border-border/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-500" />
                                Gaps de Cobertura
                            </h2>
                            <span className="text-xs text-muted-foreground">Zonas con {'<'}3 propiedades</span>
                        </div>
                        <div className="divide-y divide-border/30">
                            {coverageGaps.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                                    <p>¡Excelente! No hay gaps críticos</p>
                                </div>
                            ) : (
                                coverageGaps.slice(0, 5).map((gap, i) => (
                                    <div key={i} className="p-4 hover:bg-gold/5 transition-colors flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-foreground">{gap.neighborhood}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {gap.zone} • {gap.property_category.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {gap.property_count} props
                                            </span>
                                            <PriorityBadge priority={gap.priority} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {coverageGaps.length > 5 && (
                            <div className="p-3 border-t border-border/50 text-center">
                                <button className="text-sm text-gold hover:underline flex items-center gap-1 mx-auto">
                                    Ver todos ({coverageGaps.length})
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Innovation Suggestions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card rounded-xl overflow-hidden"
                    >
                        <div className="p-5 border-b border-border/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-gold" />
                                Sugerencias de Innovación
                            </h2>
                            <span className="text-xs text-muted-foreground">Búsquedas sin resultados</span>
                        </div>
                        <div className="divide-y divide-border/30">
                            {suggestions.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No hay suficientes búsquedas para sugerir</p>
                                </div>
                            ) : (
                                suggestions.map((suggestion, i) => (
                                    <div key={i} className="p-4 hover:bg-gold/5 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-foreground">&quot;{suggestion.query}&quot;</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {suggestion.search_count} búsquedas • Sugerencia:
                                                    <span className="text-gold ml-1 font-medium">
                                                        {suggestion.suggested_category.replace('_', ' ')}
                                                    </span>
                                                </p>
                                            </div>
                                            <button className="text-xs text-gold hover:underline whitespace-nowrap">
                                                Agregar categoría
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Quality Audit Log */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card rounded-xl overflow-hidden"
                >
                    <div className="p-5 border-b border-border/50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            Historial de Control de Calidad
                        </h2>
                        <span className="text-xs text-muted-foreground">Últimas verificaciones de IA</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30">
                                <tr className="text-left text-xs text-muted-foreground">
                                    <th className="p-3 font-medium">Fecha</th>
                                    <th className="p-3 font-medium">Entidad</th>
                                    <th className="p-3 font-medium">Tipo de Check</th>
                                    <th className="p-3 font-medium">Discrepancia</th>
                                    <th className="p-3 font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {qualityLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            No hay registros de auditoría
                                        </td>
                                    </tr>
                                ) : (
                                    qualityLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gold/5 transition-colors">
                                            <td className="p-3 text-sm text-muted-foreground">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 text-sm font-medium text-foreground capitalize">
                                                {log.entity_type}
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground capitalize">
                                                {log.check_type}
                                            </td>
                                            <td className="p-3">
                                                {log.is_discrepancy ? (
                                                    <span className="flex items-center gap-1 text-amber-500 text-sm">
                                                        <XCircle className="w-4 h-4" /> Sí
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                                                        <CheckCircle2 className="w-4 h-4" /> No
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'updated'
                                                        ? 'bg-emerald-500/20 text-emerald-500'
                                                        : 'bg-amber-500/20 text-amber-500'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

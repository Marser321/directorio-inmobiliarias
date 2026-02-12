"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { TrendingUp, DollarSign, Percent, BarChart3, Loader2 } from "lucide-react"

type SearchPropertyRow = {
    id: number
    price: number
    built_area: number | null
    created_at: string
}

type ChartPoint = {
    year: string
    value: number
}

interface InvestmentPotentialProps {
    locationQuery?: string
}

const CountUp = ({ value, duration = 2, suffix = "" }: { value: number, duration?: number, suffix?: string }) => {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    const inView = useInView(ref, { once: true })

    useEffect(() => {
        if (inView) {
            const end = value
            const totalDuration = duration * 1000

            let startTime: number;
            const animate = (time: number) => {
                if (!startTime) startTime = time;
                const progress = time - startTime;
                const percentage = Math.min(progress / totalDuration, 1);
                const ease = 1 - Math.pow(1 - percentage, 4);

                setCount(Math.floor(ease * end));

                if (progress < totalDuration) {
                    requestAnimationFrame(animate);
                } else {
                    setCount(end);
                }
            };
            requestAnimationFrame(animate);
        }
    }, [inView, value, duration])

    return <span ref={ref}>{count}{suffix}</span>
}

function toYear(input: string) {
    const date = new Date(input)
    if (Number.isNaN(date.getTime())) return null
    return String(date.getUTCFullYear())
}

export function InvestmentPotential({ locationQuery }: InvestmentPotentialProps) {
    const [chartData, setChartData] = useState<ChartPoint[]>([])
    const [comparablesCount, setComparablesCount] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const queryKey = locationQuery?.trim() || ''
    const [resolvedQueryKey, setResolvedQueryKey] = useState<string | null>(null)
    const isLoading = resolvedQueryKey !== queryKey

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams({
            limit: '80',
            sort: 'newest',
        })
        if (queryKey) {
            params.set('q', queryKey)
        }

        fetch(`/api/search/properties?${params.toString()}`, {
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(payload?.error || 'No se pudieron cargar comparables')
                }

                const rows = Array.isArray(payload?.data) ? (payload.data as SearchPropertyRow[]) : []
                setComparablesCount(rows.length)

                const yearly = new Map<string, { total: number; count: number }>()
                for (const row of rows) {
                    if (!row?.created_at || !row?.price) continue
                    if (!row.built_area || row.built_area <= 0) continue

                    const year = toYear(row.created_at)
                    if (!year) continue

                    const valuePerM2 = row.price / row.built_area
                    const previous = yearly.get(year) || { total: 0, count: 0 }
                    yearly.set(year, {
                        total: previous.total + valuePerM2,
                        count: previous.count + 1,
                    })
                }

                const points = [...yearly.entries()]
                    .map(([year, entry]) => ({
                        year,
                        value: Math.round(entry.total / Math.max(entry.count, 1)),
                    }))
                    .sort((a, b) => Number(a.year) - Number(b.year))
                    .slice(-7)

                setChartData(points)
                setErrorMessage(null)
                setResolvedQueryKey(queryKey)
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') return
                const message = error instanceof Error ? error.message : 'No se pudieron cargar comparables'
                setChartData([])
                setComparablesCount(0)
                setErrorMessage(message)
                setResolvedQueryKey(queryKey)
            })

        return () => controller.abort()
    }, [queryKey])

    const latestPoint = chartData[chartData.length - 1] || null
    const previousPoint = chartData.length > 1 ? chartData[chartData.length - 2] : null
    const yearlyVariation = useMemo(() => {
        if (!latestPoint || !previousPoint || previousPoint.value <= 0) return 0
        return Number((((latestPoint.value - previousPoint.value) / previousPoint.value) * 100).toFixed(1))
    }, [latestPoint, previousPoint])

    return (
        <section className="py-12">
            <div className="mb-8">
                <h3 className="text-2xl font-serif font-bold text-foreground flex items-center gap-3">
                    <TrendingUp className="text-[#D4AF37]" />
                    Potencial de Inversión
                </h3>
                <p className="text-muted-foreground mt-2">
                    Basado en comparables reales {locationQuery ? `de ${locationQuery}` : 'de la zona'}.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-muted/30 border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-semibold text-lg">Evolución histórica (USD/m²)</h4>
                        <div className="flex items-center gap-2 text-sm text-[#D4AF37] font-medium bg-[#D4AF37]/10 px-3 py-1 rounded-full">
                            <TrendingUp className="w-4 h-4" />
                            {chartData.length > 1 ? `${yearlyVariation}% interanual` : 'Sin histórico suficiente'}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando comparables reales...
                        </div>
                    ) : null}

                    {!isLoading && errorMessage ? (
                        <div className="h-[300px] w-full flex items-center justify-center text-sm text-red-500">
                            {errorMessage}
                        </div>
                    ) : null}

                    {!isLoading && !errorMessage && chartData.length < 2 ? (
                        <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
                            No hay suficientes datos históricos para estimar tendencia.
                        </div>
                    ) : null}

                    {!isLoading && !errorMessage && chartData.length >= 2 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.2)" />
                                    <XAxis
                                        dataKey="year"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#888', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#888', fontSize: 12 }}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--background)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        formatter={(value: number | string | undefined) => [`$${value}`, 'Valor m²']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#D4AF37"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-4">
                    <MetricCard
                        label="Variación Interanual"
                        value={Math.abs(Math.round(yearlyVariation))}
                        suffix="%"
                        icon={Percent}
                        subtext={chartData.length > 1 ? 'Calculada sobre comparables reales' : 'Sin datos suficientes'}
                    />
                    <MetricCard
                        label="Valor Promedio m²"
                        value={latestPoint ? latestPoint.value : 0}
                        prefix="$"
                        icon={DollarSign}
                        subtext={latestPoint ? `Último período: ${latestPoint.year}` : 'No disponible'}
                    />
                    <MetricCard
                        label="Comparables Analizados"
                        value={comparablesCount}
                        icon={BarChart3}
                        subtext="Propiedades reales consideradas"
                    />
                </div>
            </div>
        </section>
    )
}

interface MetricCardProps {
    label: string
    value: number
    suffix?: string
    prefix?: string
    icon: React.ElementType
    subtext?: string
}

function MetricCard({ label, value, suffix = "", prefix = "", icon: Icon, subtext }: MetricCardProps) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <div className="p-2 bg-[#D4AF37]/10 rounded-lg text-[#D4AF37]">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
                {prefix && <span className="text-2xl font-bold">{prefix}</span>}
                <span className="text-3xl font-serif font-bold tracking-tight">
                    <CountUp value={Math.max(0, value)} suffix={suffix} />
                </span>
            </div>
            {subtext && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{subtext}</p>}
        </motion.div>
    )
}

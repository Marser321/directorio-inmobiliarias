'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Building2,
    Eye,
    TrendingUp,
    Plus,
    Star,
    ExternalLink,
    Home,
    DollarSign,
    Target,
    Zap,
    CheckCircle2,
} from 'lucide-react'
import { PropertiesTable } from '@/components/partners/PropertiesTable'
import { useUserAgency, useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { DashboardSkeleton } from '@/components/partners/DashboardSkeleton'
import { WelcomeOnboarding } from '@/components/partners/WelcomeOnboarding'
import { ProfileProgress } from '@/components/partners/ProfileProgress'
import DashboardManager from '@/components/partners/DashboardManager'

// Property type for the table
interface PropertyRow {
    id: number
    title: string
    slug: string
    main_image: string | null // Derived from property_images join
    price: number
    currency: 'USD' | 'UYU'
    status: 'for_sale' | 'for_rent' | 'sold' | 'rented'
    is_featured: boolean
    bedrooms: number | null
    bathrooms: number | null
    view_count: number
    property_images?: { url: string }[]
}

// Stats Card Component
function StatCard({
    icon: Icon,
    label,
    value,
    trend,
    color = 'gold'
}: {
    icon: React.ElementType
    label: string
    value: string | number
    trend?: string
    color?: 'gold' | 'green' | 'blue'
}) {
    const colorClasses = {
        gold: 'from-gold/20 to-gold/5 border-gold/20',
        green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
        blue: 'from-sky-500/20 to-sky-500/5 border-sky-500/20',
    }
    const iconColors = {
        gold: 'text-gold',
        green: 'text-emerald-500',
        blue: 'text-sky-500',
    }

    return (
        <div className={`rounded-xl border bg-gradient-to-br ${colorClasses[color]} p-5`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {trend && (
                        <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-2 rounded-lg bg-background/50 ${iconColors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const showCreatedToast = searchParams.get('created') === 'true'

    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const { user, loading: authLoading } = useAuth()
    const { agency, loading: agencyLoading } = useUserAgency()

    const [properties, setProperties] = useState<PropertyRow[]>([])
    const [loading, setLoading] = useState(true)

    // New Toast System
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(
        showCreatedToast ? { message: '¡Propiedad creada exitosamente!', type: 'success' } : null
    )

    // Fetch properties from Supabase
    // Fetch properties from Supabase
    useEffect(() => {
        if (agencyLoading) return

        if (!agency) {
            setLoading(false)
            return
        }

        const fetchProperties = async () => {
            // MOCK PROPERTIES FOR VISUAL REVIEW
            if (agency.id === 1) {
                setProperties([
                    {
                        id: 101,
                        title: 'Villa Marítima Exclusiva',
                        slug: 'villa-maritima',
                        status: 'for_sale',
                        price: 2500000,
                        currency: 'USD',
                        main_image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop',
                        view_count: 1245,
                        bedrooms: 5,
                        bathrooms: 6,
                        is_featured: true,
                        created_at: new Date().toISOString()
                    } as any,
                    {
                        id: 102,
                        title: 'Penthouse en La Barra',
                        slug: 'penthouse-barra',
                        status: 'for_rent',
                        price: 850000,
                        currency: 'USD',
                        main_image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2670&auto=format&fit=crop',
                        view_count: 56,
                        bedrooms: 3,
                        bathrooms: 3,
                        is_featured: false,
                        created_at: new Date().toISOString()
                    } as any,
                ])
                setLoading(false)
                return
            }

            const supabase = getSupabaseBrowserClient()
            const { data, error } = await supabase
                .from('properties')
                .select('id, title, slug, price, currency, status, is_featured, bedrooms, bathrooms, view_count, property_images(url)')
                .eq('agency_id', agency.id)
                .order('created_at', { ascending: false })

            if (!error && data) {
                // Map first image to main_image for compatibility with sub-components
                const formattedData = (data as any[]).map(prop => ({
                    ...prop,
                    main_image: prop.property_images?.[0]?.url || null
                }))
                setProperties(formattedData as PropertyRow[])
            }
            setLoading(false)
        }

        fetchProperties()
    }, [agency, agencyLoading])

    // Hide toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null)
                // Remove query param if it was the created toast
                if (showCreatedToast && toast.type === 'success') {
                    router.replace('/partners/dashboard', { scroll: false })
                }
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [toast, router, showCreatedToast])

    const handleComingSoon = () => {
        setToast({ message: 'Funcionalidad próximamente disponible', type: 'info' })
    }

    const handleToggleFeatured = async (propertyId: number) => {
        const property = properties.find(p => p.id === propertyId)
        if (!property) return

        // If already features, just toggle off
        if (property.is_featured) {
            setProperties(prev => prev.map(p =>
                p.id === propertyId ? { ...p, is_featured: false } : p
            ))
            const supabase = getSupabaseBrowserClient()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('properties')
                .update({ is_featured: false })
                .eq('id', propertyId)
            return
        }

        // Feature the property via Stripe checkout API (simulation mode)
        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId,
                    propertyTitle: property.title
                }),
            })

            const data = await response.json()

            if (data.mode === 'simulation' && data.success) {
                // Simulation mode - update UI immediately
                setProperties(prev => prev.map(p =>
                    p.id === propertyId ? { ...p, is_featured: true } : p
                ))
                setToast({ message: '¡Propiedad destacada exitosamente!', type: 'success' })
            } else if (data.url) {
                // Live mode - redirect to Stripe
                window.location.href = data.url
            }
        } catch (error) {
            console.error('Failed to feature property:', error)
        }
    }


    const handleEdit = (propertyId: number) => {
        router.push(`/partners/dashboard/edit/${propertyId}`)
    }

    // Calculate stats
    const totalValue = properties.reduce((sum, p) => {
        const priceUsd = p.currency === 'UYU' ? p.price / 42 : p.price
        return sum + priceUsd
    }, 0)

    const formatTotalValue = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
        return `$${(value / 1000).toFixed(0)}K`
    }

    // Loading state
    if (!isMounted || authLoading || agencyLoading || loading) {
        return <DashboardSkeleton />
    }

    // No agency state
    if (!agency) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        No tienes una agencia asociada
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        Para acceder al dashboard, primero debes registrar tu inmobiliaria.
                    </p>
                    <div className="flex flex-col gap-3">
                        <a
                            href="/partners/registro"
                            className="btn-luxe py-3 px-6 rounded-xl text-white font-medium inline-flex items-center justify-center gap-2"
                        >
                            Registrar Inmobiliaria
                        </a>
                        {(user as any)?.is_admin || (user?.email?.includes('admin') ?? false) ? (
                            <a
                                href="/admin"
                                className="py-3 px-6 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <Target className="w-4 h-4" />
                                Panel de Administración
                            </a>
                        ) : null}
                    </div>
                </div>
            </div>
        )
    }

    const hasProperties = properties.length > 0

    return (
        <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
            {/* Generic Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                >
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    {toast.message}
                </motion.div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-2"
                    >
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                            Bienvenido, <span className="text-gold">{agency.name}</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            {hasProperties
                                ? 'Gestiona tus propiedades y analiza su rendimiento en tiempo real.'
                                : 'Tu portal de crecimiento está listo. Comienza tu trayectoria de éxito hoy.'}
                        </p>
                        {hasProperties && (
                            <div className="mt-6">
                                <a
                                    href="/partners/dashboard/new"
                                    className="btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center gap-2 w-fit"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Propiedad
                                </a>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <ProfileProgress agency={{ ...agency, has_properties: hasProperties }} />
                    </motion.div>
                </div>

                {!hasProperties ? (
                    <WelcomeOnboarding />
                ) : (
                    <>
                        <DashboardManager
                            role={(user as any)?.role}
                            agency={agency}
                            properties={properties}
                        />

                        {/* Properties Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-xl overflow-hidden shadow-2xl shadow-gold/5 mt-8"
                        >
                            <div className="p-5 border-b border-border/50 bg-background/50 backdrop-blur-md">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Mis Propiedades Activas
                                    </h2>
                                    <a
                                        href={`/agencia/${agency.slug}`}
                                        className="text-sm text-gold hover:underline flex items-center gap-1 group"
                                    >
                                        Ver perfil público
                                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </a>
                                </div>
                            </div>

                            <PropertiesTable
                                properties={properties}
                                onToggleFeatured={handleToggleFeatured}
                                onEdit={handleEdit}
                            />
                        </motion.div>
                    </>
                )}

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <button
                        onClick={handleComingSoon}
                        className="p-4 rounded-xl border border-border hover:border-gold/50 bg-background/50 text-left group transition-all"
                    >
                        <Building2 className="w-8 h-8 text-gold mb-3" />
                        <h3 className="font-medium text-foreground group-hover:text-gold transition-colors">
                            Editar Perfil de Agencia
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Actualiza logo, descripción y contacto
                        </p>
                    </button>
                    <button
                        onClick={handleComingSoon}
                        className="p-4 rounded-xl border border-border hover:border-gold/50 bg-background/50 text-left group transition-all"
                    >
                        <TrendingUp className="w-8 h-8 text-gold mb-3" />
                        <h3 className="font-medium text-foreground group-hover:text-gold transition-colors">
                            Analíticas Avanzadas
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Ver métricas detalladas de rendimiento
                        </p>
                    </button>
                    <a
                        href="/partners/dashboard/sniper"
                        className="p-4 rounded-xl border border-gold/30 hover:border-gold bg-gradient-to-br from-gold/10 to-transparent text-left group transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <Target className="w-8 h-8 text-gold" />
                            <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-gold transition-colors">
                            Motor de Crecimiento
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sniper de propiedades activo. Ver leads.
                        </p>
                    </a>
                    <a
                        href="/partners/dashboard/marketing"
                        className="p-4 rounded-xl border border-indigo-500/30 hover:border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-transparent text-left group transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <Zap className="w-8 h-8 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">NEW</span>
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-indigo-400 transition-colors">
                            Agencia de Contenido
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Solicita fotos, videos y copy con IA.
                        </p>
                    </a>
                    <a
                        href="/partners/dashboard/manager"
                        className="p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-transparent text-left group transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <TrendingUp className="w-8 h-8 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">AI</span>
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                            Manager Agent
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Health Check y métricas del sistema.
                        </p>
                    </a>
                </motion.div>
            </div>
        </div>
    )
}

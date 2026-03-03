'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Building2,
    TrendingUp,
    Plus,
    ExternalLink,
    Target,
    Zap,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react'
import { PropertiesTable } from '@/components/partners/PropertiesTable'
import { useUserAgency, useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { DashboardSkeleton } from '@/components/partners/DashboardSkeleton'
import { WelcomeOnboarding } from '@/components/partners/WelcomeOnboarding'
import { ProfileProgress } from '@/components/partners/ProfileProgress'
import DashboardManager from '@/components/partners/DashboardManager'
import { LuxeStudioRail } from '@/components/partners/LuxeStudioRail'

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
    publication_status?: 'draft' | 'pending_review' | 'published' | 'archived' | null
    property_images?: { url: string }[]
    created_at?: string
}

export default function DashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const showCreatedToast = searchParams.get('created') === 'true'

    const { user, role, isAdmin, featureFlags, integrityWarnings, loading: authLoading } = useAuth()
    const { agency, loading: agencyLoading } = useUserAgency()

    const [properties, setProperties] = useState<PropertyRow[]>([])
    const [loading, setLoading] = useState(true)

    // New Toast System
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(
        showCreatedToast ? { message: '¡Propiedad creada exitosamente!', type: 'success' } : null
    )

    const isPlatformAdmin = isAdmin || (user?.email?.includes('admin') ?? false)
    const propertiesEnabled = featureFlags.properties
    const scraperEnabled = featureFlags.scraper
    const marketingEnabled = featureFlags.marketing
    const managerEnabled = featureFlags.manager
    const hasIntegrityWarnings = integrityWarnings.length > 0
    const missingProfileWarning = integrityWarnings.some((warning) => warning.code === 'MISSING_PROFILE')
    const missingMembershipWarning = integrityWarnings.some((warning) => warning.code === 'MISSING_AGENCY_MEMBERSHIP')

    // Fetch properties from Supabase
    // Fetch properties from Supabase
    useEffect(() => {
        if (agencyLoading) return

        if (!agency) {
            queueMicrotask(() => {
                setLoading(false)
            })
            return
        }

        interface SupabasePropertyRow {
            id: number
            title: string
            slug: string
            price: number
            currency: 'USD' | 'UYU'
            status: 'for_sale' | 'for_rent' | 'sold' | 'rented'
            is_featured: boolean
            bedrooms: number | null
            bathrooms: number | null
            view_count: number
            publication_status?: 'draft' | 'pending_review' | 'published' | 'archived' | null
            main_image: string | null
            property_images?: { url: string; display_order?: number }[]
            created_at: string
        }

        const fetchProperties = async () => {
            const supabase = getSupabaseBrowserClient()
            const selectWithPublication = 'id, title, slug, price, currency, status, is_featured, bedrooms, bathrooms, view_count, publication_status, created_at, main_image, property_images(url, display_order)'
            const selectWithoutPublication = 'id, title, slug, price, currency, status, is_featured, bedrooms, bathrooms, view_count, created_at, main_image, property_images(url, display_order)'

            let { data, error } = await supabase
                .from('properties')
                .select(selectWithPublication)
                .eq('agency_id', agency.id)
                .order('created_at', { ascending: false })

            if (error?.message?.toLowerCase().includes('publication_status')) {
                const fallbackResult = await supabase
                    .from('properties')
                    .select(selectWithoutPublication)
                    .eq('agency_id', agency.id)
                    .order('created_at', { ascending: false })

                data = fallbackResult.data
                error = fallbackResult.error
            }

            if (!error && data) {
                // Prefer explicit main_image; fallback to first image row.
                const formattedData = (data as SupabasePropertyRow[]).map(prop => ({
                    ...prop,
                    main_image: prop.main_image || prop.property_images?.[0]?.url || null
                }))
                setProperties(formattedData)
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

    const handleToggleFeatured = async (propertyId: number) => {
        const property = properties.find(p => p.id === propertyId)
        if (!property) return

        // If already features, just toggle off
        if (property.is_featured) {
            try {
                const response = await fetch(`/api/partners/properties/${propertyId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_featured: false }),
                })

                if (!response.ok) {
                    const payload = await response.json()
                    throw new Error(payload?.error || 'No se pudo actualizar la propiedad')
                }

                setProperties(prev => prev.map(p =>
                    p.id === propertyId ? { ...p, is_featured: false } : p
                ))
            } catch (error) {
                console.error('Failed to unfeature property:', error)
                setToast({ message: 'No se pudo quitar el destacado', type: 'info' })
            }
            return
        }

        // Feature the property via Stripe checkout API (simulation mode)
        try {
            const response = await fetch('/api/stripe/checkout/featured', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId,
                    propertyTitle: property.title
                }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo iniciar checkout')
            }

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
            setToast({ message: 'No se pudo iniciar el checkout de destacado', type: 'info' })
        }
    }


    const handleEdit = (propertyId: number) => {
        router.push(`/partners/dashboard/edit/${propertyId}`)
    }

    // Loading state
    if (authLoading || agencyLoading || loading) {
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
                    {hasIntegrityWarnings ? (
                        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left">
                            <p className="text-amber-200 font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Inconsistencia de integridad detectada en tu sesión
                            </p>
                            <p className="text-amber-100/90 text-sm mt-2">
                                {missingMembershipWarning
                                    ? 'Tu usuario está logueado, pero no tiene vínculo en agency_memberships para cargar el contexto de inmobiliaria.'
                                    : 'Tu usuario está logueado, pero faltan datos de perfil o vinculación para resolver el contexto de inmobiliaria.'}
                            </p>
                            {missingProfileWarning ? (
                                <p className="text-amber-100/80 text-xs mt-2">
                                    Falta perfil en `public.profiles` para este usuario.
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-muted-foreground mb-6">
                            Para acceder al dashboard, primero debes registrar tu inmobiliaria.
                        </p>
                    )}
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/partners/registro"
                            className="btn-luxe py-3 px-6 rounded-xl text-white font-medium inline-flex items-center justify-center gap-2"
                        >
                            Registrar Inmobiliaria
                        </Link>
                        {isPlatformAdmin ? (
                            <Link
                                href="/admin"
                                className="py-3 px-6 rounded-xl border border-accent-gold-soft/35 text-accent-gold-strong hover:bg-accent-gold-soft/10 font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <Target className="w-4 h-4" />
                                Panel de Administración
                            </Link>
                        ) : null}
                    </div>
                </div>
            </div>
        )
    }

    const hasProperties = properties.length > 0
    const incompleteDrafts = properties.filter((property) => property.publication_status === 'draft')
    const firstDraftId = incompleteDrafts[0]?.id

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
                            Bienvenido, <span className="text-accent-gold-strong">{agency.name}</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            {hasProperties
                                ? 'Gestiona tus propiedades y analiza su rendimiento en tiempo real.'
                                : 'Tu portal de crecimiento está listo. Comienza tu trayectoria de éxito hoy.'}
                        </p>
                        {hasProperties && propertiesEnabled && (
                            <div className="mt-6">
                                <Link
                                    href="/partners/dashboard/new"
                                    className="btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center gap-2 w-fit"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Propiedad
                                </Link>
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
                    <WelcomeOnboarding propertiesEnabled={propertiesEnabled} />
                ) : (
                    <>
                        {featureFlags.partnerDraftFlow && incompleteDrafts.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Borradores incompletos
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Tienes {incompleteDrafts.length} propiedad{incompleteDrafts.length !== 1 ? 'es' : ''} en borrador. Completar y publicar mejora tu visibilidad.
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {incompleteDrafts.slice(0, 3).map((draft) => (
                                                <span key={draft.id} className="text-xs px-2 py-1 rounded-md bg-background/70 border border-border">
                                                    {draft.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {firstDraftId ? (
                                            <Link
                                                href={`/partners/dashboard/edit/${firstDraftId}`}
                                                className="py-2 px-4 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
                                            >
                                                Completar y publicar
                                            </Link>
                                        ) : null}
                                        <Link
                                            href="/partners/dashboard/new"
                                            className="py-2 px-4 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                                        >
                                            Crear borrador
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}

                        <DashboardManager
                            role={role}
                            agency={agency}
                            properties={properties}
                        />

                        {/* Properties Table */}
                        <motion.div
                            id="properties"
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
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href="/partners/dashboard/properties"
                                            className="text-sm text-accent-gold-strong hover:underline flex items-center gap-1 group"
                                        >
                                            Abrir workspace
                                            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </Link>
                                        <Link
                                            href={`/agencies/${agency.slug}`}
                                            className="text-sm text-accent-gold-strong hover:underline flex items-center gap-1 group"
                                        >
                                            Ver perfil público
                                            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <PropertiesTable
                                properties={properties}
                                onToggleFeatured={handleToggleFeatured}
                                onEdit={handleEdit}
                            />
                        </motion.div>

                        <LuxeStudioRail
                            source="partners_dashboard_overview"
                            className="mt-6"
                        />
                    </>
                )}

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
                >
                    <Link
                        href="/partners/dashboard/properties"
                        className="p-4 rounded-xl border border-border hover:border-accent-gold-soft/45 bg-background/50 text-left group transition-all"
                    >
                        <Building2 className="w-8 h-8 text-accent-gold-strong mb-3" />
                        <h3 className="font-medium text-foreground group-hover:text-accent-gold-strong transition-colors">
                            Workspace de Propiedades
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Control de fotos, video, tour 360 y salud de assets por ficha.
                        </p>
                    </Link>
                    <Link
                        href="/partners/dashboard/settings"
                        className="p-4 rounded-xl border border-border hover:border-accent-gold-soft/45 bg-background/50 text-left group transition-all"
                    >
                        <Building2 className="w-8 h-8 text-accent-gold-strong mb-3" />
                        <h3 className="font-medium text-foreground group-hover:text-accent-gold-strong transition-colors">
                            Editar Perfil de Agencia
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Actualiza logo, redes, contenido y datos de contacto
                        </p>
                    </Link>
                    <Link
                        href="/partners/dashboard/leads"
                        className="p-4 rounded-xl border border-border hover:border-accent-gold-soft/45 bg-background/50 text-left group transition-all"
                    >
                        <Target className="w-8 h-8 text-accent-gold-strong mb-3" />
                        <h3 className="font-medium text-foreground group-hover:text-accent-gold-strong transition-colors">
                            Leads Center
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Pipeline por etapa, acciones rápidas y secuencia de contacto
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Estado del motor: {scraperEnabled ? 'Activo' : 'Manual'}
                        </p>
                    </Link>
                    {marketingEnabled ? (
                        <Link
                            href="/partners/dashboard/marketing"
                            className="p-4 rounded-xl border border-indigo-500/30 hover:border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-transparent text-left group transition-all"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <Zap className="w-8 h-8 text-indigo-400" />
                                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">ACTIVO</span>
                            </div>
                            <h3 className="font-medium text-foreground group-hover:text-indigo-400 transition-colors">
                                Marketing
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Solicitudes de contenido, planes y estado de entregas
                            </p>
                        </Link>
                    ) : (
                        <div className="p-4 rounded-xl border border-border bg-background/50 text-left transition-all opacity-70">
                            <Zap className="w-8 h-8 text-indigo-400 mb-3" />
                            <h3 className="font-medium text-foreground">
                                Marketing
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Activa `FEATURE_INSFORGE_MARKETING=true` para habilitar este módulo.
                            </p>
                        </div>
                    )}

                    {managerEnabled ? (
                        <Link
                            href="/partners/dashboard/manager"
                            className="p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-transparent text-left group transition-all"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <TrendingUp className="w-8 h-8 text-emerald-400" />
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">AI</span>
                            </div>
                            <h3 className="font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                                Manager
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Health check y métricas de conversión por embudo
                            </p>
                        </Link>
                    ) : (
                        <div className="p-4 rounded-xl border border-border bg-background/50 text-left transition-all opacity-70">
                            <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
                            <h3 className="font-medium text-foreground">
                                Manager
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Activa `FEATURE_INSFORGE_MANAGER=true` para habilitar este módulo.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Home, Eye } from 'lucide-react'
import { PropertiesTable } from '@/components/partners/PropertiesTable'
import type { PropertyRow as OwnerDashboardProperty } from '@/components/partners/PropertiesTable'

interface OwnerDashboardProps {
    properties: OwnerDashboardProperty[]
    onToggleFeatured: (id: number) => void
    onEdit: (id: number) => void
}

export function OwnerDashboard({ properties, onToggleFeatured, onEdit }: OwnerDashboardProps) {
    const activeProperties = properties.filter(p => p.status === 'for_sale' || p.status === 'for_rent').length
    const totalViews = properties.reduce((sum, p) => sum + (p.view_count || 0), 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif font-bold text-foreground">
                    Panel de <span className="text-gold">Propietario</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                    Administra tus propiedades y visualiza su rendimiento.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-xl border border-gold/10 bg-gold/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gold/80 font-medium">Propiedades Activas</p>
                            <h3 className="text-3xl font-bold text-foreground mt-2">{activeProperties}</h3>
                        </div>
                        <Home className="w-6 h-6 text-gold" />
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-indigo-400 font-medium">Visitas Totales</p>
                            <h3 className="text-3xl font-bold text-foreground mt-2">{totalViews}</h3>
                        </div>
                        <Eye className="w-6 h-6 text-indigo-400" />
                    </div>
                </div>

                <Link
                    href="/partners/dashboard/new"
                    className="group glass-card p-6 rounded-xl border border-dashed border-border hover:border-gold/50 flex flex-col items-center justify-center text-center transition-colors cursor-pointer"
                >
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/20 transition-colors">
                        <Plus className="w-6 h-6 text-gold" />
                    </div>
                    <p className="font-medium text-foreground">Vender/Alquilar Propiedad</p>
                    <p className="text-xs text-muted-foreground mt-1">Publica gratis en 2 minutos</p>
                </Link>
            </div>

            {/* Properties List */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl overflow-hidden shadow-2xl shadow-gold/5"
            >
                <div className="p-5 border-b border-border/50 bg-background/50 backdrop-blur-md">
                    <h2 className="text-lg font-semibold text-foreground">Mis Propiedades</h2>
                </div>
                <PropertiesTable
                    properties={properties}
                    onToggleFeatured={onToggleFeatured}
                    onEdit={onEdit}
                />
            </motion.div>
        </div>
    )
}

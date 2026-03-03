'use client'

import {
    TrendingUp,
    Eye,
    Target,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    ArrowUpRight
} from 'lucide-react'
import type { UserRole } from '@/types/domain'
import type { ElementType } from 'react'

interface DashboardViewProps {
    agency: DashboardAgency
    properties: DashboardProperty[]
}

interface AgentDashboardViewProps {
    properties: DashboardProperty[]
}

interface DashboardAgency {
    name: string
    tier_subscription?: string | null
}

interface DashboardProperty {
    id?: number | string
    is_featured?: boolean
    property_images?: { url: string }[]
    view_count?: number
    main_image?: string | null
    bedrooms?: number | null
    bathrooms?: number | null
    price?: number | null
}

// ------------------------------------------------------------------
// OWNER / INVESTOR VIEW
// ------------------------------------------------------------------
export function InvestorDashboardView({ properties }: DashboardViewProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-accent-gold-soft/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-accent-gold-strong" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Visibilidad Total</h3>
                    <p className="text-3xl font-bold text-foreground">
                        {properties.reduce((acc, p) => acc + (p.view_count || 0), 0).toLocaleString()}
                        <span className="text-xs text-emerald-500 ml-2">Total</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Impacto acumulado de tus propiedades</p>
                </div>

                <div className="glass-card p-6 border-accent-gold-soft/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-16 h-16 text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Estado de Inversión</h3>
                    <div className="flex items-center gap-2">
                        {(() => {
                            const withImages = properties.filter(p => (p.property_images?.length || 0) > 0).length
                            const total = properties.length || 1
                            const pct = Math.round((withImages / total) * 100)
                            return (
                                <>
                                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-accent-gold-soft" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs font-medium text-accent-gold-strong">{pct}% Optimizado</span>
                                </>
                            )
                        })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {properties.filter(p => (p.property_images?.length || 0) > 0).length} de tus propiedades tienen fotos
                    </p>
                </div>

                <div className="glass-card p-6 border-accent-gold-soft/20 bg-gradient-to-br from-accent-gold-soft/10 to-transparent">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Impulsa tu Portafolio</h3>
                    <div className="space-y-3">
                        <button className="w-full py-2 px-4 rounded-lg bg-accent-gold-soft/10 border border-accent-gold-soft/30 text-accent-gold-strong text-sm font-medium hover:bg-accent-gold-soft/15 transition-colors flex items-center justify-between group">
                            Destacar Propiedad
                            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                        <button className="w-full py-2 px-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors flex items-center justify-between group">
                            Generar Reporte IA
                            <Zap className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 border-accent-gold-soft/20">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-accent-gold-strong" />
                        Próximos Pasos Recomendados
                    </h3>
                </div>
                <div className="space-y-4">
                    {[
                        { title: 'Actualizar precios', desc: 'El mercado en La Barra subió un 5% esta semana.', icon: TrendingUp, color: 'text-emerald-500' },
                        { title: 'Completar descripción', desc: 'Tu propiedad #1024 no tiene etiquetas de estilo de vida.', icon: AlertTriangle, color: 'text-amber-500' },
                    ].map((step, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/50">
                            <div className={`p-2 rounded-lg bg-background ${step.color}`}>
                                <step.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-foreground">{step.title}</h4>
                                <p className="text-sm text-muted-foreground">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// AGENT VIEW
// ------------------------------------------------------------------
export function AgentDashboardView({ properties }: AgentDashboardViewProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardSmall icon={Eye} label="Clicks en Teléfono" value="84" color="text-emerald-500" />
                <StatCardSmall icon={Target} label="Leads Técnicos" value="12" color="text-accent-gold-strong" />
                <StatCardSmall icon={CheckCircle2} label="Visitas Agendadas" value="3" color="text-sky-500" />
                <StatCardSmall icon={ArrowUpRight} label="Share Rate" value="4.2%" color="text-indigo-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 border-accent-gold-soft/20">
                    <h3 className="text-lg font-semibold mb-4">Actividad Reciente</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
                                <div className="w-10 h-10 rounded-full bg-accent-gold-soft/10 flex items-center justify-center text-accent-gold-strong font-bold">J</div>
                                <div className="flex-1 text-sm">
                                    <p className="text-foreground"><span className="font-bold">Juan Pérez</span> consultó por <span className="text-accent-gold-strong italic">&quot;Mansion Del Este&quot;</span></p>
                                    <p className="text-muted-foreground text-xs mt-1">Hace 2 horas via WhatsApp</p>
                                </div>
                                <button className="text-accent-gold-strong hover:underline text-xs">Responder</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-card p-6 border-accent-gold-soft/20 bg-accent-gold-soft/10">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-accent-gold-strong" />
                        AI Agent Tip
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                        {properties.length} propiedades monitoreadas por tu agente.
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                        &quot;He detectado que las propiedades con etiquetas &apos;Golf Life&apos; están recibiendo un 20% más de interés esta semana. Te sugiero añadirla a tus propiedades en El Pinar.&quot;
                    </p>
                    <button className="mt-4 w-full py-2 bg-accent-gold-soft text-black rounded-lg text-sm font-bold hover:bg-accent-gold-soft/80 transition-all">
                        Aplicar optimización sugerida
                    </button>
                </div>
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// MANAGER / ADMIN VIEW
// ------------------------------------------------------------------
export function ManagerDashboardView({ agency, properties }: DashboardViewProps) {
    return (
        <div className="space-y-6">
            <div className="glass-card p-8 border-accent-gold-soft/30 bg-gradient-to-br from-accent-gold-soft/10 to-transparent">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="w-20 h-20 rounded-2xl bg-accent-gold-soft/15 border-2 border-accent-gold-soft/35 flex items-center justify-center text-3xl">
                            {agency.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{agency.name}</h2>
                            <p className="text-muted-foreground">Manager Panel • Suscripción {(agency.tier_subscription ?? 'basic').toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-xl bg-background/50 border border-border text-center">
                            <p className="text-xs text-muted-foreground uppercase">Propiedades</p>
                            <p className="text-xl font-bold">{properties.length}</p>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-background/50 border border-border text-center">
                            <p className="text-xs text-muted-foreground uppercase">Vistas</p>
                            <p className="text-xl font-bold text-accent-gold-strong">
                                {properties.reduce((acc, p) => acc + (p.view_count || 0), 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-accent-gold-soft/20">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-accent-gold-strong" />
                        Performance de Ventas
                    </h3>
                    <div className="h-40 flex items-end gap-2 px-2">
                        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                            <div key={i} className="flex-1 bg-accent-gold-soft/15 rounded-t-sm hover:bg-accent-gold-soft transition-all cursor-pointer" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase tracking-tighter">
                        <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
                    </div>
                </div>

                <div className="glass-card p-6 border-accent-gold-soft/20">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Health Check (IA)
                    </h3>
                    <div className="space-y-3">
                        {(() => {
                            const withoutImages = properties.filter(p => !p.main_image).length
                            const lowInfo = properties.filter(p => !p.bedrooms || !p.bathrooms || !p.price).length

                            return (
                                <>
                                    <div className={`text-sm p-3 rounded-lg flex items-center gap-3 border ${withoutImages > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                        {withoutImages > 0 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        <span>Propiedades sin imagen: {withoutImages}</span>
                                    </div>
                                    <div className="text-sm p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <span>Fichas incompletas detectadas: {lowInfo}</span>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>

                <div className="glass-card p-6 border-accent-gold-soft/20 bg-indigo-500/5">
                    <h3 className="font-semibold mb-4 text-indigo-400">Marketing Toolkit</h3>
                    <p className="text-sm text-muted-foreground mb-4">Crea campañas de email masivas para este mes en un click.</p>
                    <button className="w-full py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20">
                        Abrir Campaign Builder
                    </button>
                </div>
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// HELPER COMPONENTS
// ------------------------------------------------------------------
function StatCardSmall({ icon: Icon, label, value, color }: { icon: ElementType; label: string; value: string; color: string }) {
    return (
        <div className="glass-card p-4 border-white/5 flex items-center gap-4">
            <div className={`p-2 rounded-lg bg-background ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">{label}</p>
                <p className="text-lg font-bold text-foreground leading-none">{value}</p>
            </div>
        </div>
    )
}

// ------------------------------------------------------------------
// MAIN MANAGER
// ------------------------------------------------------------------
export default function DashboardManager({ role, agency, properties }: { role: UserRole | null; agency: DashboardAgency; properties: DashboardProperty[] }) {
    if (role === 'platform_admin' || role === 'agency_admin') {
        return <ManagerDashboardView agency={agency} properties={properties} />
    }

    if (role === 'agent') {
        return <AgentDashboardView properties={properties} />
    }

    // Default to Owner/Investor view
    return <InvestorDashboardView agency={agency} properties={properties} />
}

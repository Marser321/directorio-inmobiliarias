'use client'

import { motion } from 'framer-motion'
import { Home, UserCheck, Compass, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'

interface ActionCardProps {
    icon: typeof Home
    title: string
    description: string
    href: string
    color: 'gold' | 'indigo' | 'emerald'
    delay: number
}

function ActionCard({ icon: Icon, title, description, href, color, delay }: ActionCardProps) {
    const colors = {
        gold: 'border-gold/20 hover:border-gold/50 from-gold/10 to-transparent text-gold',
        indigo: 'border-indigo-500/20 hover:border-indigo-500/50 from-indigo-500/10 to-transparent text-indigo-400',
        emerald: 'border-emerald-500/20 hover:border-emerald-500/50 from-emerald-500/10 to-transparent text-emerald-400',
    }

    const glowColors = {
        gold: 'bg-gold/20',
        indigo: 'bg-indigo-500/20',
        emerald: 'bg-emerald-500/20',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: "backOut" }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="relative group h-full"
        >
            <Link href={href} className={`block p-6 h-full rounded-2xl border bg-gradient-to-br ${colors[color]} backdrop-blur-sm transition-all duration-300 relative overflow-hidden`}>
                {/* Shine Effect */}
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />

                <div className="flex flex-col h-full relative z-20">
                    <div className={`mb-4 p-3 rounded-xl bg-background/50 w-fit group-hover:scale-110 transition-transform duration-300 ${glowColors[color]} backdrop-blur-md`}>
                        <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-current transition-colors">
                        {title}
                    </h3>
                    <p className="text-muted-foreground text-sm flex-grow">
                        {description}
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                        Empezar ahora <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

export function WelcomeOnboarding({ propertiesEnabled = true }: { propertiesEnabled?: boolean }) {
    return (
        <div className="space-y-8 py-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-2xl mx-auto space-y-4"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-bold tracking-wider uppercase">
                    ✨ ¡Bienvenido a la Élite!
                </div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                    Tu Dashboard está listo, <br />
                    <span className="text-gold">comencemos a crecer</span>
                </h2>
                <p className="text-muted-foreground text-lg">
                    Sigue estos pasos para activar tu presencia y empezar a recibir leads cualificados.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {propertiesEnabled ? (
                    <ActionCard
                        icon={Plus}
                        title="Publicar mi primera propiedad"
                        description="Sube tu primer inmueble y hazlo visible para miles de inversores."
                        href="/partners/dashboard/new"
                        color="gold"
                        delay={0.2}
                    />
                ) : (
                    <ActionCard
                        icon={Plus}
                        title="Módulo de propiedades"
                        description="Esta opción está desactivada temporalmente para tu cuenta."
                        href="/partners/dashboard"
                        color="gold"
                        delay={0.2}
                    />
                )}
                <ActionCard
                    icon={UserCheck}
                    title="Completar perfil de agente"
                    description="Genera confianza completando todos los datos de tu agencia."
                    href="/partners/dashboard"
                    color="indigo"
                    delay={0.3}
                />
                <ActionCard
                    icon={Compass}
                    title="Explorar tendencias del mercado"
                    description="Descubre qué buscan los inversores y optimiza tu oferta."
                    href="/explore"
                    color="emerald"
                    delay={0.4}
                />
            </div>
        </div>
    )
}

'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Trophy } from 'lucide-react'

interface ProfileProgressProps {
    agency: {
        logo_url?: string | null
        name?: string
        slug?: string
        [key: string]: unknown
    }
}

export function ProfileProgress({ agency }: ProfileProgressProps) {
    const steps = [
        { label: 'Registro de Agencia', completed: true },
        { label: 'Logo / Identidad', completed: !!agency.logo_url },
        { label: 'Descripción / Bio', completed: !!agency.description },
        { label: 'Contacto Verificado', completed: !!agency.phone },
        { label: 'Primera Propiedad', completed: !!agency.has_properties },
    ]

    const completedCount = steps.filter(s => s.completed).length
    const percentage = Math.round((completedCount / steps.length) * 100)

    // Find next incomplete step
    const nextStep = steps.find(s => !s.completed)

    return (
        <div className="glass-card p-6 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent relative overflow-hidden group">
            {/* Decorative Background Blob */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-gold/10 transition-colors duration-500" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gold" />
                        Nivel de Agencia
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        {nextStep
                            ? <span>Siguiente objetivo: <span className="text-gold font-medium">{nextStep.label}</span></span>
                            : "¡Perfil completado al 100%!"}
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-3xl font-serif font-bold text-gold tabular-nums">
                        {percentage}%
                    </div>
                </div>
            </div>

            <div className="relative h-2 w-full bg-muted/50 rounded-full overflow-hidden mb-6">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-gold to-yellow-300 shadow-[0_0_15px_rgba(212,175,55,0.6)]"
                >
                    {percentage < 100 && (
                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                    )}
                </motion.div>
            </div>

            <div className="space-y-3 relative z-10">
                {steps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 text-sm"
                    >
                        {step.completed ? (
                            <div className="bg-emerald-500/10 p-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            </div>
                        ) : (
                            <div className="bg-muted p-1 rounded-full">
                                <Circle className="w-3 h-3 text-muted-foreground" />
                            </div>
                        )}
                        <span className={`transition-colors duration-300 ${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {step.label}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

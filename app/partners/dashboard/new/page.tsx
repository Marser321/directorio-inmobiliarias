'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PropertyWizard } from '@/components/partners/PropertyWizard'
import { useUserAgency } from '@/hooks/useAuth'

export default function NewPropertyPage() {
    const router = useRouter()
    const { agency, loading } = useUserAgency()

    const handleSuccess = () => {
        router.push('/partners/dashboard?created=true')
    }

    const handleCancel = () => {
        router.push('/partners/dashboard')
    }

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
        )
    }

    if (!agency) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">No tienes una agencia asociada</p>
                    <Link href="/partners/registro" className="text-gold hover:underline">
                        Registra tu inmobiliaria
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Dashboard
                    </button>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                        Nueva <span className="text-gold">Propiedad</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Completa los 4 pasos para publicar tu propiedad
                    </p>
                </motion.div>

                {/* Wizard */}
                <PropertyWizard
                    agencyId={agency.id}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    )
}

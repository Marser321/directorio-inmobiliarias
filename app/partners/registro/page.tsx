'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, User, Upload, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient as createSupabaseClient } from '@/utils/supabase/client'
import { setClientAccessToken } from '@/lib/insforge/client-token'

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
    const steps = [
        { id: 1, label: 'Inmobiliaria', icon: Building2 },
        { id: 2, label: 'Administrador', icon: User },
    ]

    return (
        <div className="flex items-center justify-center gap-4 mb-8">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    <div
                        className={`
                            flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                            ${currentStep >= step.id
                                ? 'bg-gold border-gold text-white'
                                : 'border-border text-muted-foreground'
                            }
                        `}
                    >
                        {currentStep > step.id ? (
                            <Check className="w-5 h-5" />
                        ) : (
                            <step.icon className="w-5 h-5" />
                        )}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                    </span>
                    {index < steps.length - 1 && (
                        <div className={`w-12 h-0.5 mx-4 transition-colors duration-300 ${currentStep > step.id ? 'bg-gold' : 'bg-border'}`} />
                    )}
                </div>
            ))}
        </div>
    )
}

// Logo uploader with drag & drop
function LogoUploader({ value, onChange }: { value: File | null; onChange: (file: File | null) => void }) {
    const [isDragging, setIsDragging] = useState(false)
    const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview)
        }
    }, [preview])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
            onChange(file)
        }
    }, [onChange])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onChange(file)
        }
    }

    return (
        <div
            className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
                ${isDragging ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50'}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('logo-input')?.click()}
        >
            <input
                id="logo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
            {preview ? (
                <div className="flex flex-col items-center gap-3">
                    <Image
                        src={preview}
                        alt="Logo preview"
                        width={96}
                        height={96}
                        className="w-24 h-24 object-contain rounded-lg"
                        unoptimized
                    />
                    <p className="text-sm text-muted-foreground">Haz clic para cambiar</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">Arrastra tu logo aquí</p>
                        <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// Form data types
interface AgencyData {
    name: string
    slug: string
    description: string
    city: string
    logo: File | null
}

interface AdminData {
    email: string
    password: string
    confirmPassword: string
    fullName: string
}

export default function RegistroPage() {
    const router = useRouter()
    const { user, loading: authLoading, refresh } = useAuth()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
    const [otpCode, setOtpCode] = useState('')
    const [pendingEmail, setPendingEmail] = useState('')
    const [needsOtpVerification, setNeedsOtpVerification] = useState(false)
    const [agencyData, setAgencyData] = useState<AgencyData>({
        name: '',
        slug: '',
        description: '',
        city: '',
        logo: null,
    })
    const [adminData, setAdminData] = useState<AdminData>({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
    })

    // Determine if we are in "Complete Profile" mode (logged in but no agency)
    const isCompleteProfileMode = !!user;

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
        setAgencyData({ ...agencyData, name, slug })
    }

    const handleNext = () => {
        if (step === 1 && agencyData.name && agencyData.city) {
            // If in complete profile mode, we submit directly from step 1
            if (isCompleteProfileMode) {
                handleSubmit()
            } else {
                setStep(2)
            }
        }
    }

    const handleBack = () => {
        if (step > 1) setStep(step - 1)
    }

    const uploadAgencyLogo = useCallback(async (): Promise<string | null> => {
        if (!agencyData.logo) return null

        const supabase = createSupabaseClient()
        const ext = agencyData.logo.name.split('.').pop()?.toLowerCase() || 'png'
        const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'png'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
        const filePath = `agencies/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('agency-logos')
            .upload(filePath, agencyData.logo)

        if (uploadError) {
            throw new Error('No se pudo subir el logo')
        }

        const { data } = supabase.storage.from('agency-logos').getPublicUrl(filePath)
        return data.publicUrl
    }, [agencyData.logo])

    const runOnboarding = useCallback(async (logoKey: string | null = null) => {
        const onboardingResponse = await fetch('/api/partners/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agencyName: agencyData.name,
                agencySlug: agencyData.slug,
                city: agencyData.city,
                description: agencyData.description,
                logoKey,
            }),
        })

        const onboardingData = await onboardingResponse.json()
        if (!onboardingResponse.ok) {
            throw new Error(onboardingData.error || 'No se pudo completar onboarding')
        }

        return onboardingData
    }, [agencyData.city, agencyData.description, agencyData.name, agencyData.slug])

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()

        if (!isCompleteProfileMode && adminData.password !== adminData.confirmPassword) {
            alert('Las contraseñas no coinciden')
            return
        }

        setIsSubmitting(true)

        try {
            let response

            if (isCompleteProfileMode) {
                // Mode: Create Agency for Existing User
                const logoKey = await uploadAgencyLogo()
                await runOnboarding(logoKey)
                await refresh()
                window.location.href = '/partners/dashboard?created=true'
                return
            } else {
                // Mode: Full Registration (User + Agency)
                response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: adminData.email,
                        password: adminData.password,
                        name: adminData.fullName,
                    }),
                })
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al procesar solicitud')
            }

            setPendingEmail(adminData.email)
            setNeedsOtpVerification(Boolean(data.requireEmailVerification ?? true))

            if (!data.requireEmailVerification) {
                if (data.accessToken) {
                    setClientAccessToken(data.accessToken)
                } else {
                    const signInResponse = await fetch('/api/auth/signin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: adminData.email,
                            password: adminData.password,
                        }),
                    })

                    if (!signInResponse.ok) {
                        throw new Error('No se pudo iniciar sesión tras el registro')
                    }

                    const signInData = await signInResponse.json()
                    if (signInData?.accessToken) {
                        setClientAccessToken(signInData.accessToken)
                    }
                }

                const logoKey = await uploadAgencyLogo()
                await runOnboarding(logoKey)

                await refresh()
                window.location.href = '/partners/dashboard?created=true'
            }

        } catch (error: unknown) {
            console.error('Registration error:', error)
            const message = error instanceof Error ? error.message : 'Error al conectar con el servidor'
            alert(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
        )
    }

    if (needsOtpVerification && !isCompleteProfileMode) {
        const handleVerifyOtp = async (e: React.FormEvent) => {
            e.preventDefault()
            setIsVerifyingOtp(true)

            try {
                const verifyResponse = await fetch('/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: pendingEmail,
                        otp: otpCode,
                    }),
                })

                const verifyData = await verifyResponse.json()
                if (!verifyResponse.ok) {
                    throw new Error(verifyData.error || 'OTP inválido')
                }

                setClientAccessToken(verifyData.accessToken)

                const logoKey = await uploadAgencyLogo()
                await runOnboarding(logoKey)

                await refresh()
                router.push('/partners/dashboard?created=true')
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Error verificando OTP'
                alert(message)
            } finally {
                setIsVerifyingOtp(false)
            }
        }

        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
                <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                        Verifica tu <span className="text-gold">correo</span>
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        Ingresa el código OTP enviado a {pendingEmail || adminData.email}.
                    </p>

                    <form className="space-y-4" onSubmit={handleVerifyOtp}>
                        <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Código de 6 dígitos"
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                            required
                        />

                        <button
                            type="submit"
                            disabled={isVerifyingOtp || otpCode.length < 6}
                            className="w-full btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isVerifyingOtp ? 'Verificando...' : 'Verificar y continuar'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl"
            >
                {/* Glassmorphism card */}
                <div className="glass-card rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                            {isCompleteProfileMode ? (
                                <>Completa tu <span className="text-gold">Perfil de Agencia</span></>
                            ) : (
                                <>Únete a <span className="text-gold">Luxe Estate</span></>
                            )}
                        </h1>
                        <p className="text-muted-foreground">
                            {isCompleteProfileMode
                                ? 'Solo un paso más para publicar tus propiedades'
                                : 'Registra tu inmobiliaria y comienza a publicar propiedades'
                            }
                        </p>
                    </div>

                    {!isCompleteProfileMode && <StepIndicator currentStep={step} />}

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-5"
                                >
                                    {/* Agency Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Nombre de la Inmobiliaria *
                                        </label>
                                        <input
                                            type="text"
                                            value={agencyData.name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                            placeholder="Ej: Premium Real Estate"
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                            required
                                        />
                                        {agencyData.slug && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                URL: luxe-estate.com/agencies/<span className="text-gold">{agencyData.slug}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Ciudad *
                                        </label>
                                        <input
                                            type="text"
                                            value={agencyData.city}
                                            onChange={(e) => setAgencyData({ ...agencyData, city: e.target.value })}
                                            placeholder="Ej: Punta del Este"
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Logo Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Logo de la empresa
                                        </label>
                                        <LogoUploader
                                            value={agencyData.logo}
                                            onChange={(logo) => setAgencyData({ ...agencyData, logo })}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Descripción
                                        </label>
                                        <textarea
                                            value={agencyData.description}
                                            onChange={(e) => setAgencyData({ ...agencyData, description: e.target.value })}
                                            placeholder="Cuéntanos sobre tu inmobiliaria..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        disabled={!agencyData.name || !agencyData.city || isSubmitting}
                                        className="w-full btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCompleteProfileMode ? (
                                            isSubmitting ? 'Creando Agencia...' : 'Finalizar y Crear Agencia'
                                        ) : (
                                            <>Continuar <ArrowRight className="w-4 h-4" /></>
                                        )}
                                    </button>
                                </motion.div>
                            )}

                            {step === 2 && !isCompleteProfileMode && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5"
                                >
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Nombre Completo *
                                        </label>
                                        <input
                                            type="text"
                                            value={adminData.fullName}
                                            onChange={(e) => setAdminData({ ...adminData, fullName: e.target.value })}
                                            placeholder="Tu nombre completo"
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={adminData.email}
                                            onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                                            placeholder="correo@tuinmobiliaria.com"
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Contraseña *
                                        </label>
                                        <input
                                            type="password"
                                            value={adminData.password}
                                            onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                                            placeholder="Mínimo 8 caracteres"
                                            minLength={8}
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Confirmar Contraseña *
                                        </label>
                                        <input
                                            type="password"
                                            value={adminData.confirmPassword}
                                            onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                                            placeholder="Repite tu contraseña"
                                            minLength={8}
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                            required
                                        />
                                        {adminData.confirmPassword && adminData.password !== adminData.confirmPassword && (
                                            <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="flex-1 py-3 px-6 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Atrás
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !adminData.email || !adminData.password || !adminData.fullName || adminData.password !== adminData.confirmPassword}
                                            className="flex-1 btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Creando...
                                                </>
                                            ) : (
                                                <>
                                                    Crear Cuenta
                                                    <Check className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    {!isCompleteProfileMode && (
                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/partners/login" className="text-gold hover:underline">
                                Inicia sesión
                            </Link>
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

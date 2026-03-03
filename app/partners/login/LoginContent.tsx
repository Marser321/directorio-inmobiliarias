'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { setClientAccessToken } from '@/lib/insforge/client-token'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/partners/dashboard'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : data.error)
                return
            }

            setClientAccessToken(data.accessToken)

            // Redirect to dashboard or intended page
            window.location.href = data.redirectTo || redirectTo
        } catch {
            toast.error('Error al iniciar sesión. Intenta de nuevo.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="glass-card rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                            Bienvenido de <span className="text-gold">vuelta</span>
                        </h1>
                        <p className="text-muted-foreground">
                            Ingresa a tu portal de Partners
                        </p>
                    </div>



                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@tuinmobiliaria.com"
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                <>
                                    Ingresar
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border text-center">
                        <p className="text-sm text-muted-foreground">
                            ¿No tienes cuenta?{' '}
                            <Link href="/partners/registro" className="text-gold hover:underline">
                                Registra tu inmobiliaria
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

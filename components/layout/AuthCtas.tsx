"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

type ButtonProps = ComponentProps<typeof Button>

interface AuthCtasProps {
    containerClassName?: string
    loginClassName?: string
    publishClassName?: string
    loginVariant?: ButtonProps["variant"]
    publishVariant?: ButtonProps["variant"]
    size?: ButtonProps["size"]
    hideLoginOnMobile?: boolean
}

export function AuthCtas({
    containerClassName,
    loginClassName,
    publishClassName,
    loginVariant = "ghost",
    publishVariant = "default",
    size = "sm",
    hideLoginOnMobile = false,
}: AuthCtasProps) {
    const { user, agencyContext } = useAuth()

    const hasSession = Boolean(user)
    const canManageProperties = agencyContext?.permissions.canManageProperties === true

    const accessHref = hasSession ? "/partners/dashboard" : "/partners/login"
    const accessLabel = hasSession ? "Dashboard" : "Ingresar"

    const publishHref = hasSession && canManageProperties ? "/partners/dashboard/new" : "/partners/registro"

    const accessAriaLabel = hasSession
        ? "Ir al dashboard de inmobiliarias"
        : "Ingresar al portal de inmobiliarias"
    const publishAriaLabel = hasSession && canManageProperties
        ? "Publicar una nueva propiedad"
        : "Registrar inmobiliaria para publicar propiedades"

    return (
        <div className={cn("flex items-center gap-2 md:gap-4", containerClassName)}>
            <Button
                asChild
                variant={loginVariant}
                size={size}
                className={cn(
                    hideLoginOnMobile ? "hidden md:inline-flex" : "inline-flex",
                    "focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2",
                    loginClassName
                )}
            >
                <Link href={accessHref} aria-label={accessAriaLabel}>
                    {accessLabel}
                </Link>
            </Button>

            <Button
                asChild
                variant={publishVariant}
                size={size}
                className={cn(
                    "focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2",
                    publishClassName
                )}
            >
                <Link href={publishHref} aria-label={publishAriaLabel}>
                    Publicar
                </Link>
            </Button>
        </div>
    )
}

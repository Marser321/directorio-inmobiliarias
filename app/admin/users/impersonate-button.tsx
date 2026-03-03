'use client'

import { Button } from '@/components/ui/button'
import { Ban } from 'lucide-react'

interface ImpersonateButtonProps {
    userId: string
    userName: string
}

export function ImpersonateButton({ userId, userName }: ImpersonateButtonProps) {
    void userId
    void userName
    return (
        <Button
            variant="outline"
            size="sm"
            disabled
            className="flex items-center gap-2"
            title="Impersonación desactivada por hardening de seguridad"
        >
            <Ban className="h-4 w-4" />
            Impersonación desactivada
        </Button>
    )
}

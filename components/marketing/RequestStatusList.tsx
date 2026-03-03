'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle2, Film, Image as ImageIcon, FileText, AlertCircle, Loader2 } from 'lucide-react'

const statusConfig = {
    pending: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
    in_progress: { label: 'En Proceso', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: LoaderIcon },
    completed: { label: 'Entregado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
    delivered: { label: 'Entregado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
    review: { label: 'En Revisión', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: LoaderIcon },
    rejected: { label: 'Rechazado', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
}

const typeConfig = {
    property_photos: { label: 'Fotos IA', icon: ImageIcon },
    video_tour: { label: 'Video Tour', icon: Film },
    copywriting: { label: 'Copywriting', icon: FileText },
    social_media: { label: 'Social Media', icon: Film },
}

interface RequestRow {
    id: string
    type: string
    status: string
    date?: string
    created_at?: string
    details?: Record<string, unknown>
}

function LoaderIcon(props: React.ComponentProps<typeof Clock>) {
    return <Clock className="animate-pulse" {...props} />
}

export function RequestStatusList() {
    const [requests, setRequests] = useState<RequestRow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/marketing/requests', { cache: 'no-store' })
            .then(async (res) => {
                const payload = await res.json()
                if (!res.ok) {
                    throw new Error(payload?.error || 'No se pudo cargar el estado de pedidos')
                }
                return payload
            })
            .then((payload) => {
                if (Array.isArray(payload.data)) {
                    setRequests(payload.data as RequestRow[])
                }
                setErrorMessage(null)
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'No se pudo cargar el estado de pedidos'
                setRequests([])
                setErrorMessage(message)
            })
            .finally(() => setIsLoading(false))
    }, [])

    return (
        <Card className="glass-card border-border/50">
            <CardHeader>
                <CardTitle>Estado de Pedidos</CardTitle>
                <CardDescription>Sigue el progreso de tus packs de contenido.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="py-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando pedidos...
                        </div>
                    ) : null}

                    {!isLoading && errorMessage ? (
                        <div className="py-6 text-sm text-red-400">
                            {errorMessage}
                        </div>
                    ) : null}

                    {!isLoading && !errorMessage && requests.length === 0 ? (
                        <div className="py-6 text-sm text-muted-foreground">
                            Aún no hay pedidos registrados para esta agencia.
                        </div>
                    ) : null}

                    {!isLoading && !errorMessage && requests.map((req) => {
                        const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || Clock
                        const TypeIcon = typeConfig[req.type as keyof typeof typeConfig]?.icon || FileText

                        return (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-background/80 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-muted">
                                        <TypeIcon className="w-4 h-4 text-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-foreground">
                                            {typeConfig[req.type as keyof typeof typeConfig]?.label || req.type}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : req.date}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline" className={statusConfig[req.status as keyof typeof statusConfig]?.color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig[req.status as keyof typeof statusConfig]?.label}
                                </Badge>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { LuxeStudioContext, LuxeStudioRequestType } from '@/types/domain'

const SERVICE_TYPES: LuxeStudioRequestType[] = ['property_photos', 'video_tour', 'copywriting', 'social_media']

const SERVICE_LABELS: Record<LuxeStudioRequestType, string> = {
  property_photos: 'Fotos de propiedad',
  video_tour: 'Video tour',
  copywriting: 'Copywriting',
  social_media: 'Pack social media',
}

interface ServiceRequestFormProps {
  context?: LuxeStudioContext | null
}

function isServiceType(value: string): value is LuxeStudioRequestType {
  return SERVICE_TYPES.includes(value as LuxeStudioRequestType)
}

export function ServiceRequestForm({ context = null }: ServiceRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [requestType, setRequestType] = useState<LuxeStudioRequestType | ''>('')
  const [propertyUrl, setPropertyUrl] = useState('')
  const [instructions, setInstructions] = useState('')

  const prefillService = context?.service && isServiceType(context.service) ? context.service : null
  const prefillPropertyId = typeof context?.propertyId === 'number' && context.propertyId > 0 ? context.propertyId : null
  const prefillSource = context?.source?.trim() || 'marketing_dashboard'

  useEffect(() => {
    if (prefillService) {
      setRequestType(prefillService)
    }
  }, [prefillService])

  useEffect(() => {
    if (!prefillPropertyId) return
    if (propertyUrl.trim().length > 0) return
    if (typeof window === 'undefined') return
    setPropertyUrl(`${window.location.origin}/property/${prefillPropertyId}`)
  }, [prefillPropertyId, propertyUrl])

  const contextLabel = useMemo(() => {
    if (!prefillPropertyId) return null
    return `Propiedad #${prefillPropertyId}`
  }, [prefillPropertyId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!requestType) {
      toast.error('Selecciona un servicio para continuar.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/marketing/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: requestType,
          details: {
            property_id: prefillPropertyId,
            property_url: propertyUrl.trim() || null,
            source: prefillSource,
            instructions: instructions.trim() || null,
          },
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo enviar la solicitud')
      }

      toast.success('Solicitud enviada a Luxe Studio.')
      setInstructions('')
      if (!prefillPropertyId) {
        setPropertyUrl('')
      }
      if (!prefillService) {
        setRequestType('')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al enviar la solicitud'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-accent-gold-soft/20 bg-card/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink-strong">
          <Sparkles className="h-5 w-5 text-accent-gold-strong" />
          Solicitar a Luxe Studio
        </CardTitle>
        <CardDescription>
          Activa producción de fotos, video, copy y social media con contexto de propiedad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-type">Tipo de servicio</Label>
            <Select value={requestType || undefined} onValueChange={(value) => setRequestType(isServiceType(value) ? value : '')}>
              <SelectTrigger id="service-type">
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((service) => (
                  <SelectItem key={service} value={service}>
                    {SERVICE_LABELS[service]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-url">URL de la propiedad (opcional)</Label>
            <Input
              id="property-url"
              placeholder="https://luxe-estate.com/property/123"
              value={propertyUrl}
              onChange={(event) => setPropertyUrl(event.target.value)}
            />
            {contextLabel ? (
              <p className="text-xs text-muted-foreground">
                Contexto detectado: {contextLabel} ({prefillSource})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Origen de solicitud: {prefillSource}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instrucciones</Label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              className="min-h-[92px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ej: priorizar planos de living, balcón y cocina; tono sobrio premium."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando solicitud...
              </>
            ) : (
              'Crear solicitud'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

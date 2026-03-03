'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'

interface PropertyAgency {
    name?: string
}

interface PropertyRow {
    id: number | string
    title: string
    currency?: string
    price?: number
    neighborhood?: string
    city?: string
    agencies?: PropertyAgency | null
    status?: string
    quality_score?: number
    boost_level?: number
    featured_until?: string | null
}

interface AgencyOption {
    id: number | string
    name: string
}

interface PropertyTableProps {
    properties: PropertyRow[]
    agencies: AgencyOption[]
}

export function PropertyTable({ properties, agencies }: PropertyTableProps) {
    const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null)
    const [newAgencyId, setNewAgencyId] = useState<string>('')
    const [boostLevel, setBoostLevel] = useState<string>('1')
    const [featuredUntil, setFeaturedUntil] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [promoteOpen, setPromoteOpen] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleAssign = async () => {
        if (!selectedProperty || !newAgencyId) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .update({ agency_id: newAgencyId })
                .eq('id', selectedProperty.id)

            if (error) throw error

            toast.success('Propiedad asignada con éxito')
            setOpen(false)
            router.refresh()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error inesperado'
            toast.error('Error al asignar propiedad: ' + message)
        } finally {
            setLoading(false)
        }
    }

    const handlePromote = async () => {
        if (!selectedProperty) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .update({
                    boost_level: parseInt(boostLevel),
                    featured_until: featuredUntil ? new Date(featuredUntil).toISOString() : null,
                    is_featured: parseInt(boostLevel) > 1
                })
                .eq('id', selectedProperty.id)

            if (error) throw error

            toast.success('Propiedad promocionada con éxito')
            setPromoteOpen(false)
            router.refresh()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error inesperado'
            toast.error('Error al promocionar: ' + message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Agencia Actual</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Calidad</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {properties.map((property) => (
                        <TableRow key={property.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                                {property.title}
                            </TableCell>
                            <TableCell>
                                {property.currency} {property.price?.toLocaleString()}
                            </TableCell>
                            <TableCell>{property.neighborhood}, {property.city}</TableCell>
                            <TableCell>
                                {property.agencies?.name ? (
                                    <Badge variant="secondary">{property.agencies.name}</Badge>
                                ) : (
                                    <span className="text-slate-400 text-sm">Sin asignar</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{property.status}</Badge>
                            </TableCell>
                            <TableCell>
                                {property.quality_score ? (
                                    <Badge variant={property.quality_score >= 80 ? 'default' : property.quality_score >= 50 ? 'secondary' : 'destructive'}>
                                        {property.quality_score}%
                                    </Badge>
                                ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/admin/properties/${property.id}/edit`}>
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Editar
                                    </Link>
                                </Button>
                                <Dialog open={open && selectedProperty?.id === property.id} onOpenChange={(isOpen) => {
                                    setOpen(isOpen)
                                    if (isOpen) setSelectedProperty(property)
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedProperty(property)}>
                                            Asignar
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Asignar Propiedad</DialogTitle>
                                            <DialogDescription>
                                                Mueve esta propiedad a otra agencia.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <h4 className="font-medium mb-2">{property.title}</h4>
                                            <Select onValueChange={setNewAgencyId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar nueva agencia" />
                                                </SelectTrigger>
                                                    <SelectContent>
                                                        {agencies.map((agency) => (
                                                        <SelectItem key={agency.id} value={String(agency.id)}>
                                                            {agency.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleAssign} disabled={loading || !newAgencyId}>
                                                {loading ? 'Asignando...' : 'Confirmar Asignación'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={promoteOpen && selectedProperty?.id === property.id} onOpenChange={(isOpen) => {
                                    setPromoteOpen(isOpen)
                                    if (isOpen) {
                                        setSelectedProperty(property)
                                        setBoostLevel(property.boost_level?.toString() || '1')
                                        setFeaturedUntil(property.featured_until ? property.featured_until.split('T')[0] : '')
                                    }
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => setSelectedProperty(property)} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                                            Promocionar
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Promocionar Propiedad</DialogTitle>
                                            <DialogDescription>
                                                Aumenta la visibilidad de esta propiedad en el directorio.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <h4 className="font-medium">{property.title}</h4>

                                            <div className="space-y-2">
                                                <Label>Nivel de Visibilidad</Label>
                                                <Select value={boostLevel} onValueChange={setBoostLevel}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">Normal (Básico)</SelectItem>
                                                        <SelectItem value="2">Gold (Destacado + Borde Dorado)</SelectItem>
                                                        <SelectItem value="3">Platinum (Top of Page)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Destacado Hasta</Label>
                                                <Input
                                                    type="date"
                                                    value={featuredUntil}
                                                    onChange={(e) => setFeaturedUntil(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handlePromote} disabled={loading}>
                                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </TableCell>
                        </TableRow>
                    ))}
                    {properties.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No hay propiedades registradas.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

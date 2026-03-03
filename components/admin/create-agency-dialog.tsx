'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function CreateAgencyDialog({ onAgencyCreated }: { onAgencyCreated?: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        logo_url: '',
        plan: 'free',
        status: 'active'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase
                .from('agencies')
                .insert([formData])

            if (error) throw error

            toast.success('Inmobiliaria creada con éxito')
            setOpen(false)
            setFormData({
                name: '',
                slug: '',
                logo_url: '',
                plan: 'free',
                status: 'active'
            })
            router.refresh()
            onAgencyCreated?.()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error inesperado'
            toast.error('Error al crear inmobiliaria: ' + message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                    Nueva Inmobiliaria
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Nueva Inmobiliaria</DialogTitle>
                    <DialogDescription>
                        Añade una nueva agencia al sistema manualmente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nombre
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="slug" className="text-right">
                            Slug
                        </Label>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="logo" className="text-right">
                            Logo URL
                        </Label>
                        <Input
                            id="logo"
                            value={formData.logo_url}
                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                            className="col-span-3"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan" className="text-right">
                            Plan
                        </Label>
                        <Select
                            value={formData.plan}
                            onValueChange={(value) => setFormData({ ...formData, plan: value })}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="free">Gratis</SelectItem>
                                <SelectItem value="basic">Básico</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Agencia'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

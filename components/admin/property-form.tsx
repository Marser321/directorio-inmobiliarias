'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import { createPropertyAction } from '@/app/actions/create-property-action'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'

export function PropertyForm() {
    const router = useRouter()
    const supabase = createClient()

    // State
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [locations, setLocations] = useState<any[]>([])
    const [agencies, setAgencies] = useState<any[]>([])
    const [uploadedImages, setUploadedImages] = useState<string[]>([])

    // Load dependencies (Locations, Agencies)
    useEffect(() => {
        const loadData = async () => {
            const { data: locs } = await supabase.from('locations').select('id, name, type').order('name')
            const { data: ags } = await supabase.from('agencies').select('id, name').order('name')
            if (locs) setLocations(locs)
            if (ags) setAgencies(ags)
        }
        loadData()
    }, [supabase])

    // Handle Image Upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const files = Array.from(e.target.files)
        const newUrls: string[] = []

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${fileName}`

                // Try uploading to 'properties' bucket
                const { error: uploadError } = await supabase.storage
                    .from('properties')
                    .upload(filePath, file)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw uploadError
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('properties')
                    .getPublicUrl(filePath)

                newUrls.push(publicUrl)
            }
            setUploadedImages([...uploadedImages, ...newUrls])
            toast.success('Imágenes subidas')
        } catch (error: any) {
            toast.error('Error subiendo imágenes: Asegúrate que el bucket "properties" exista y sea público.')
        } finally {
            setUploading(false)
        }
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        // Add images
        formData.set('images_urls', uploadedImages.join(','))

        const result = await createPropertyAction(formData)

        setLoading(false)
        if (result.success) {
            toast.success('Propiedad creada!')
            router.push('/admin/properties')
            router.refresh()
        } else {
            toast.error('Error: ' + result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl shadow-sm border">
            <div className="space-y-2">
                <Label htmlFor="title">Título de la Propiedad</Label>
                <Input id="title" name="title" placeholder="Ej: Villa en La Barra" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Precio</Label>
                    <Input id="price" name="price" type="number" placeholder="0" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select name="currency" defaultValue="USD">
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="UYU">UYU</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Select name="location_id" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id.toString()}>
                                    {loc.name} ({loc.type})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="agency">Agencia (Opcional)</Label>
                    <Select name="agency_id">
                        <SelectTrigger>
                            <SelectValue placeholder="Asignar a..." />
                        </SelectTrigger>
                        <SelectContent>
                            {agencies.map((ag) => (
                                <SelectItem key={ag.id} value={ag.id.toString()}>
                                    {ag.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Imágenes</Label>
                <div className="flex items-center gap-4">
                    <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                    {uploading && <Loader2 className="animate-spin h-5 w-5" />}
                </div>

                {/* Preview */}
                {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {uploadedImages.map((url, i) => (
                            <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-slate-100">
                                <img src={url} alt="Uploaded" className="object-cover w-full h-full" />
                                <button
                                    type="button"
                                    onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" placeholder="Detalles de la propiedad..." rows={5} />
            </div>

            <Button type="submit" disabled={loading || uploading} className="w-full bg-slate-900 text-white">
                {loading ? 'Guardando...' : 'Crear Propiedad'}
            </Button>
        </form>
    )
}

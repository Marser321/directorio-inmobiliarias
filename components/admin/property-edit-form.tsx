'use client'

import { useState } from 'react'
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
import { updatePropertyAction } from '@/app/actions/update-property-action'
import { toast } from 'sonner'
import { Loader2, Upload, X, Home, MapPin, DollarSign } from 'lucide-react'

interface Property {
    id: number
    title: string
    slug: string
    description?: string
    price: number
    currency: string
    status: string
    location_id: number
    agency_id?: number | null
    images?: string[]
    location?: { id: number; name: string }
    agency?: { id: number; name: string }
}

interface PropertyEditFormProps {
    property: Property
    locations: { id: number; name: string; type: string }[]
    agencies: { id: number; name: string }[]
}

export function PropertyEditForm({ property, locations, agencies }: PropertyEditFormProps) {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadedImages, setUploadedImages] = useState<string[]>(property.images || [])

    const [formData, setFormData] = useState({
        title: property.title || '',
        description: property.description || '',
        price: property.price || 0,
        currency: property.currency || 'USD',
        status: property.status || 'for_sale',
        location_id: property.location_id || 0,
        agency_id: property.agency_id || null,
    })

    // Handle Image Upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const files = Array.from(e.target.files)
        const newUrls: string[] = []

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('properties')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('properties')
                    .getPublicUrl(filePath)

                newUrls.push(publicUrl)
            }
            setUploadedImages([...uploadedImages, ...newUrls])
            toast.success('Imágenes agregadas')
        } catch (error: any) {
            toast.error('Error subiendo imágenes: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updatePropertyAction(property.id, {
            ...formData,
            images: uploadedImages
        })

        setLoading(false)
        if (result.success) {
            toast.success(result.message)
            router.push('/admin/properties')
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información Básica */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Información Básica
                </h2>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={5}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="for_sale">En Venta</SelectItem>
                                <SelectItem value="for_rent">En Alquiler</SelectItem>
                                <SelectItem value="sold">Vendida</SelectItem>
                                <SelectItem value="rented">Alquilada</SelectItem>
                                <SelectItem value="reserved">Reservada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            {/* Precio */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Precio
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="price">Precio *</Label>
                        <Input
                            id="price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select
                            value={formData.currency}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                        >
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
            </section>

            {/* Ubicación y Agencia */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Ubicación y Agencia
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Ubicación *</Label>
                        <Select
                            value={formData.location_id.toString()}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, location_id: Number(v) }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
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
                        <Label>Agencia</Label>
                        <Select
                            value={formData.agency_id?.toString() || ''}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, agency_id: v ? Number(v) : null }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sin agencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin agencia</SelectItem>
                                {agencies.map((ag) => (
                                    <SelectItem key={ag.id} value={ag.id.toString()}>
                                        {ag.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            {/* Imágenes */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6">Imágenes</h2>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                {uploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Upload className="w-5 h-5" />
                                )}
                                <span>Agregar Imágenes</span>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                            {uploadedImages.map((url, i) => (
                                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                                    <img src={url} alt={`Image ${i + 1}`} className="object-cover w-full h-full" />
                                    <button
                                        type="button"
                                        onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading || uploading}
                    className="bg-slate-900 hover:bg-slate-800 text-white min-w-[160px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        'Guardar Cambios'
                    )}
                </Button>
            </div>
        </form>
    )
}

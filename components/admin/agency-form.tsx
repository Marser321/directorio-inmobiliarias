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
import { createAgencyAction } from '@/app/actions/agency-actions'
import { toast } from 'sonner'
import {
    Loader2, Upload, X, Building2, Phone, ImageIcon,
    Instagram, Facebook, Linkedin, Youtube, Globe,
    MapPin, Mail, Award, Tag, Calendar, MessageCircle
} from 'lucide-react'

const CITIES = ['Punta del Este', 'Maldonado', 'José Ignacio', 'La Barra', 'Manantiales', 'Punta Ballena']

export function AgencyForm() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form data with strings for arrays to simplify input
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        tagline: '',
        description: '',

        contact_email: '',
        contact_phone: '',
        whatsapp: '',
        website: '',
        address: '',
        city: '',

        social_instagram: '',
        social_facebook: '',
        social_linkedin: '',
        social_youtube: '',
        social_tiktok: '',

        year_established: '',
        languages: 'Español',
        specialties: '',
        certifications: '',

        logo_url: '',
        cover_image_url: '',

        meta_description: '',
        tier_subscription: 'basic' as 'basic' | 'pro' | 'enterprise',
    })

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        }))
    }

    // Handle Image Upload (Logo or Cover)
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'cover_image_url') => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `logos/${fileName}` // Using logos folder for both for simplicity

            const { error: uploadError } = await supabase.storage
                .from('agency-logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('agency-logos')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, [field]: publicUrl }))
            toast.success('Imagen subida correctamente')
        } catch (error: any) {
            toast.error('Error subiendo imagen: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Convert string inputs to arrays/numbers
        const submissionData = {
            ...formData,
            year_established: formData.year_established ? parseInt(formData.year_established) : undefined,
            languages: formData.languages.split(',').map(s => s.trim()).filter(Boolean),
            specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
            certifications: formData.certifications.split(',').map(s => s.trim()).filter(Boolean),
        }

        const result = await createAgencyAction(submissionData)

        setLoading(false)
        if (result.success) {
            toast.success(result.message)
            router.push('/admin/agencies')
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
            {/* Información Básica */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Información Básica
                </h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Inmobiliaria *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Ej: Luxury Punta Realty"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">URL Slug *</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 whitespace-nowrap">/agencies/</span>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                    placeholder="luxury-punta-realty"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tagline">Eslogan / Tagline</Label>
                        <Input
                            id="tagline"
                            value={formData.tagline}
                            onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                            placeholder="Ej: Expertos en propiedades de lujo"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción de la Agencia</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Cuéntanos sobre la agencia, su historia, enfoque y valores..."
                            rows={4}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nivel de Suscripción</Label>
                            <Select
                                value={formData.tier_subscription}
                                onValueChange={(v: 'basic' | 'pro' | 'enterprise') => setFormData(prev => ({ ...prev, tier_subscription: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basic">🥉 Basic</SelectItem>
                                    <SelectItem value="pro">🥈 Pro</SelectItem>
                                    <SelectItem value="enterprise">🥇 Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year_established">Año de Fundación</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    id="year_established"
                                    type="number"
                                    value={formData.year_established}
                                    onChange={(e) => setFormData(prev => ({ ...prev, year_established: e.target.value }))}
                                    placeholder="Ej: 2010"
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contacto */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Información de Contacto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="contact_email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="contact_email"
                                type="email"
                                value={formData.contact_email}
                                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact_phone">Teléfono</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="contact_phone"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <div className="relative">
                            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="whatsapp"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Sitio Web</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="website"
                                value={formData.website}
                                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                className="pl-10"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Dirección</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Ciudad</Label>
                        <Select
                            value={formData.city}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, city: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {CITIES.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            {/* Redes Sociales */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Redes Sociales
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <div className="relative">
                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="instagram"
                                value={formData.social_instagram}
                                onChange={(e) => setFormData(prev => ({ ...prev, social_instagram: e.target.value }))}
                                className="pl-10"
                                placeholder="@usuario o URL"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="facebook">Facebook</Label>
                        <div className="relative">
                            <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="facebook"
                                value={formData.social_facebook}
                                onChange={(e) => setFormData(prev => ({ ...prev, social_facebook: e.target.value }))}
                                className="pl-10"
                                placeholder="URL perfil/página"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <div className="relative">
                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="linkedin"
                                value={formData.social_linkedin}
                                onChange={(e) => setFormData(prev => ({ ...prev, social_linkedin: e.target.value }))}
                                className="pl-10"
                                placeholder="URL perfil empresa"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="youtube">YouTube</Label>
                        <div className="relative">
                            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="youtube"
                                value={formData.social_youtube}
                                onChange={(e) => setFormData(prev => ({ ...prev, social_youtube: e.target.value }))}
                                className="pl-10"
                                placeholder="URL canal"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Detalles Profesionales */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Detalles Profesionales
                </h2>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="languages">Idiomas (separados por coma)</Label>
                        <Input
                            id="languages"
                            value={formData.languages}
                            onChange={(e) => setFormData(prev => ({ ...prev, languages: e.target.value }))}
                            placeholder="Español, Inglés, Portugués..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="specialties">Especialidades (separadas por coma)</Label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="specialties"
                                value={formData.specialties}
                                onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value }))}
                                className="pl-10"
                                placeholder="Venta de Lujo, Alquiler de temporada, Chacras..."
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="certifications">Certificaciones (separadas por coma)</Label>
                        <Input
                            id="certifications"
                            value={formData.certifications}
                            onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
                            placeholder="Operador Inmobiliario Registrado, CIU..."
                        />
                    </div>
                </div>
            </section>

            {/* Media */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Imágenes de Marca
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logo */}
                    <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="flex items-center gap-4">
                            {formData.logo_url ? (
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-slate-100 border">
                                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="w-32 h-32 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors bg-slate-50">
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-slate-400" />
                                            <span className="text-xs text-slate-500 mt-2">Subir Logo</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} disabled={uploading} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Cover */}
                    <div className="space-y-2">
                        <Label>Imagen de Portada (Cover)</Label>
                        <div className="flex items-center gap-4">
                            {formData.cover_image_url ? (
                                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 border">
                                    <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, cover_image_url: '' }))}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="w-full h-32 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors bg-slate-50">
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-8 h-8 text-slate-400" />
                                            <span className="text-sm text-slate-500 mt-2">Subir Portada (1200x400)</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover_image_url')} disabled={uploading} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO */}
            <section className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    SEO
                </h2>
                <div className="space-y-2">
                    <Label htmlFor="meta_description">Meta Description (Google)</Label>
                    <Textarea
                        id="meta_description"
                        value={formData.meta_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                        placeholder="Descripción breve para resultados de búsqueda (máx 160 caracteres)"
                        rows={2}
                    />
                    <p className="text-xs text-slate-500 text-right">
                        {formData.meta_description.length}/160
                    </p>
                </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-4 sticky bottom-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading || uploading}
                    className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        'Crear Agencia Completa'
                    )}
                </Button>
            </div>
        </form>
    )
}

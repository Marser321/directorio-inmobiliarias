'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface AgencyFormData {
    // Básico
    name: string
    slug: string
    tagline?: string
    description?: string

    // Contacto
    contact_email?: string
    contact_phone?: string
    whatsapp?: string
    website?: string
    address?: string
    city?: string

    // Redes Sociales (JSONB)
    social_instagram?: string
    social_facebook?: string
    social_linkedin?: string
    social_youtube?: string
    social_tiktok?: string

    // Profesional
    year_established?: number
    languages?: string[]
    specialties?: string[]
    certifications?: string[]

    // Media
    logo_url?: string
    cover_image_url?: string
    gallery_images?: string[]

    // SEO
    meta_description?: string

    // Suscripción
    tier_subscription?: 'basic' | 'pro' | 'enterprise'
}

export async function createAgencyAction(data: AgencyFormData) {
    const supabase = await createClient()

    // Validaciones
    if (!data.name || data.name.trim().length < 3) {
        return { success: false, message: 'El nombre de la agencia debe tener al menos 3 caracteres' }
    }

    if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
        return { success: false, message: 'El slug solo puede contener letras minúsculas, números y guiones' }
    }

    // Construct social_links JSON
    const social_links = {
        instagram: data.social_instagram || null,
        facebook: data.social_facebook || null,
        linkedin: data.social_linkedin || null,
        youtube: data.social_youtube || null,
        tiktok: data.social_tiktok || null
    }

    try {
        const { data: agency, error } = await supabase
            .from('agencies')
            .insert({
                name: data.name.trim(),
                slug: data.slug.toLowerCase().trim(),
                tagline: data.tagline || null,
                description: data.description || null,

                contact_email: data.contact_email || null,
                contact_phone: data.contact_phone || null,
                whatsapp: data.whatsapp || null,
                website: data.website || null,
                address: data.address || null,
                city: data.city || null,

                social_links: social_links,
                year_established: data.year_established || null,
                languages: data.languages || ['Spanish'],
                specialties: data.specialties || [],
                certifications: data.certifications || [],

                logo_url: data.logo_url || null,
                cover_image_url: data.cover_image_url || null,
                gallery_images: data.gallery_images || [],

                meta_description: data.meta_description || null,
                tier_subscription: data.tier_subscription || 'basic',

                is_verified: false,
                total_properties: 0,
                total_views: 0
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return { success: false, message: 'Ya existe una agencia con ese slug. Por favor, elige otro.' }
            }
            throw error
        }

        revalidatePath('/admin/agencies')
        return {
            success: true,
            message: 'Agencia creada correctamente',
            agencyId: agency?.id
        }

    } catch (error: any) {
        console.error('Create Agency Error:', error)
        return { success: false, message: error.message || 'Error al crear la agencia' }
    }
}

export async function updateAgencyAction(id: number | string, data: Partial<AgencyFormData>) {
    const supabase = await createClient()

    // Construct social_links JSON if any social field is present
    let updateData: any = { ...data };

    // Remove individual social fields from updateData
    delete updateData.social_instagram;
    delete updateData.social_facebook;
    delete updateData.social_linkedin;
    delete updateData.social_youtube;
    delete updateData.social_tiktok;

    // We need to fetch existing social links if we are doing a partial update?
    // For now, let's assume the form sends all or nothing for simpler logic, 
    // or we can construct formatting here.

    if (
        data.social_instagram !== undefined ||
        data.social_facebook !== undefined ||
        data.social_linkedin !== undefined ||
        data.social_youtube !== undefined ||
        data.social_tiktok !== undefined
    ) {
        updateData.social_links = {
            instagram: data.social_instagram,
            facebook: data.social_facebook,
            linkedin: data.social_linkedin,
            youtube: data.social_youtube,
            tiktok: data.social_tiktok
        }
    }

    try {
        const { error } = await supabase
            .from('agencies')
            .update(updateData)
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/agencies')
        revalidatePath(`/agencies/${data.slug}`) // Revalidate public page
        return { success: true, message: 'Agencia actualizada correctamente' }

    } catch (error: any) {
        console.error('Update Agency Error:', error)
        return { success: false, message: error.message || 'Error al actualizar la agencia' }
    }
}

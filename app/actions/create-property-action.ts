'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPropertyAction(formData: FormData) {
    const supabase = await createClient()

    // 1. Extract Data
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const price = parseFloat(formData.get('price') as string)
    const currency = formData.get('currency') as string
    const locationId = formData.get('location_id') as string // ID
    const agencyId = formData.get('agency_id') as string // ID
    const status = formData.get('status') as string || 'for_sale'

    // Images are passed as comma-separated URLs from the client (who handled the upload)
    const imagesStr = formData.get('images_urls') as string
    const images = imagesStr ? imagesStr.split(',') : []
    const mainImage = images.length > 0 ? images[0] : null

    // Validations
    if (!title || !price || !locationId) {
        return { success: false, message: 'Faltan campos obligatorios (Título, Precio, Ubicación)' }
    }

    try {
        // Generate a slug
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(7)

        const { error } = await supabase
            .from('properties')
            .insert({
                title,
                slug,
                description,
                price,
                currency,
                location_id: Number(locationId),
                agency_id: agencyId ? Number(agencyId) : undefined,
                status,
                images,
                // Default JSONBs
                features: {},
                lifestyle_tags: []
            } as any)

        if (error) throw error

        revalidatePath('/admin/properties')
        return { success: true, message: 'Propiedad creada correctamente' }

    } catch (error: any) {
        console.error('Create Property Error:', error)
        return { success: false, message: error.message }
    }
}

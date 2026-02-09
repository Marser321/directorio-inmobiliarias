'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface PropertyUpdateData {
    title?: string
    description?: string
    price?: number
    currency?: string
    status?: string
    location_id?: number
    agency_id?: number | null
    images?: string[]
}

export async function updatePropertyAction(id: number | string, data: PropertyUpdateData) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('properties')
            .update(data as any)
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/properties')
        return { success: true, message: 'Propiedad actualizada correctamente' }

    } catch (error: any) {
        console.error('Update Property Error:', error)
        return { success: false, message: error.message || 'Error al actualizar la propiedad' }
    }
}

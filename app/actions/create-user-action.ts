'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createUserAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string
    const phone = formData.get('phone') as string
    const agencyId = formData.get('agency_id') as string

    if (!email || !password || !fullName || !role) {
        return { success: false, message: 'Faltan campos obligatorios' }
    }

    const supabase = createAdminClient()

    try {
        // 1. Create Auth User
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role
            }
        })

        if (authError) throw authError
        if (!authUser.user) throw new Error('No se pudo crear el usuario')

        // 2. Create Profile (Trigger might handle this, but let's ensure update)
        // Check if profile exists (from trigger) or insert
        // Usually schema has a trigger on auth.users -> public.profiles
        // If so, we just update it. If not, we insert.
        // Let's try upserting by ID.

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authUser.user.id,
                full_name: fullName,
                role: role as 'admin' | 'agent' | 'user',
                phone: phone,
                updated_at: new Date().toISOString()
            })

        if (profileError) throw profileError

        // 3. (Optional) Link to Agency if provided
        if (agencyId) {
            const { error: agencyError } = await supabase
                .from('agency_users')
                .insert({
                    agency_id: Number(agencyId), // bigint
                    user_id: authUser.user.id,
                    role: 'member'
                })

            if (agencyError) throw agencyError
        }

        revalidatePath('/admin/users')
        return { success: true, message: 'Usuario creado correctamente' }

    } catch (error: any) {
        console.error('Error creating user:', error)
        return { success: false, message: error.message }
    }
}

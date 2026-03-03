'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import { asCompatDatabase } from '@/lib/insforge/compat'

type DbUserRole = 'owner' | 'agent' | 'agency_admin' | 'platform_admin'

function mapRoleToDatabase(role: string): DbUserRole {
    switch (role) {
        case 'admin':
            return 'platform_admin'
        case 'agent':
            return 'agent'
        case 'agency_admin':
            return 'agency_admin'
        case 'user':
        default:
            return 'owner'
    }
}

function safeRevalidate(path: string) {
    try {
        revalidatePath(path)
    } catch (error) {
        console.warn(`Revalidate skipped for ${path}:`, error)
    }
}

export async function createUserAction(formData: FormData) {
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const password = formData.get('password') as string
    const fullName = (formData.get('full_name') as string)?.trim()
    const role = formData.get('role') as string
    const phone = (formData.get('phone') as string)?.trim()
    const agencyId = formData.get('agency_id') as string

    if (!email || !password || !fullName || !role) {
        return { success: false, message: 'Faltan campos obligatorios' }
    }

    if (password.length < 8) {
        return { success: false, message: 'La contraseña debe tener al menos 8 caracteres.' }
    }

    if (agencyId && !Number.isFinite(Number(agencyId))) {
        return { success: false, message: 'La agencia seleccionada no es válida.' }
    }

    const client = await createInsforgeServerClient()
    const database = asCompatDatabase(client.database)

    try {
        const authClient = createAdminClient()
        const { user: currentUser } = await getServerUser()
        if (!currentUser?.id) {
            return { success: false, message: 'Sesión inválida. Iniciá sesión nuevamente.' }
        }

        const { data: currentProfile, error: currentProfileError } = await database
            .from('profiles')
            .select('is_admin, role')
            .eq('id', currentUser.id)
            .maybeSingle<{ is_admin?: boolean; role?: string }>()

        const canManageUsers = Boolean(currentProfile?.is_admin || currentProfile?.role === 'platform_admin')
        if (currentProfileError || !canManageUsers) {
            return { success: false, message: 'No tenés permisos para crear usuarios.' }
        }

        const dbRole = mapRoleToDatabase(role)
        const isAdmin = dbRole === 'platform_admin'

        // 1. Create Auth User (fallback to signUp when admin API is unavailable)
        let createdUserId: string | null = null
        let requiresEmailVerification = false

        const { data: authUser, error: authError } = await authClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: dbRole
            }
        })

        if (!authError && authUser?.user?.id) {
            createdUserId = authUser.user.id
        } else {
            const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
                email,
                password,
                name: fullName,
            })

            if (signUpError) {
                const message = signUpError.message || 'No se pudo crear el usuario'
                throw new Error(message)
            }

            const signUpUser = (signUpData as { user?: { id?: string } | null } | null)?.user
            requiresEmailVerification = Boolean(
                (signUpData as { requireEmailVerification?: boolean } | null)?.requireEmailVerification
            )

            if (signUpUser?.id) {
                createdUserId = signUpUser.id
            } else if (!requiresEmailVerification) {
                throw new Error('No se pudo crear el usuario')
            }
        }

        // If signup requires verification and the SDK did not return user.id,
        // resolve the id from profiles created by auth trigger.
        if (!createdUserId) {
            const { data: profileByEmail } = await database
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle<{ id: string }>()

            createdUserId = profileByEmail?.id ?? null
        }

        if (!createdUserId && requiresEmailVerification) {
            safeRevalidate('/admin/users')
            return {
                success: true,
                message: 'Usuario creado. Debe verificar su email para completar el alta.'
            }
        }

        if (!createdUserId) {
            throw new Error('No se pudo crear el usuario')
        }

        // 2. Create Profile (if we already have user id)

        const { error: profileError } = await database
            .from('profiles')
            .upsert({
                id: createdUserId,
                email,
                full_name: fullName,
                role: dbRole,
                is_admin: isAdmin,
                phone: phone || null,
                updated_at: new Date().toISOString()
            })

        if (profileError) throw profileError

        // 3. (Optional) Link to Agency if provided
        if (agencyId) {
            const membershipRole = dbRole === 'agency_admin' ? 'admin' : 'member'
            const { error: agencyError } = await database
                    .from('agency_memberships')
                    .upsert({
                        agency_id: Number(agencyId), // bigint
                        user_id: createdUserId,
                        role: membershipRole
                    }, { onConflict: 'user_id' })

            if (agencyError) throw agencyError

            const { error: profileAgencyError } = await database
                .from('profiles')
                .update({
                    agency_id: Number(agencyId),
                    updated_at: new Date().toISOString()
                })
                .eq('id', createdUserId)

            if (profileAgencyError) throw profileAgencyError
        }

        safeRevalidate('/admin/users')
        return {
            success: true,
            message: requiresEmailVerification
                ? 'Usuario creado. Debe verificar su email antes de iniciar sesión.'
                : 'Usuario creado correctamente'
        }

    } catch (error: unknown) {
        console.error('Error creating user:', error)
        const message = error instanceof Error ? error.message : 'Error al crear usuario'
        return { success: false, message }
    }
}

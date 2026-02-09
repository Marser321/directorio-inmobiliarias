'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    isAdmin: boolean
    role: 'admin' | 'agent' | 'agency' | 'owner' | 'user' | null
}

/**
 * Hook to get current auth state and subscribe to changes.
 * Use this in client components that need user info.
 */
export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
        isAdmin: false,
        role: null,
    })

    useEffect(() => {
        // Use FRESH client to avoid singleton state issues
        const supabase = createSupabaseBrowserClient()
        let mounted = true

        const fetchProfileData = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_admin, role')
                    .eq('id', userId)
                    .single()

                if (error) throw error
                return {
                    isAdmin: !!data?.is_admin,
                    role: (data?.role as any) ?? 'user'
                }
            } catch (err) {
                console.error('Error fetching profile data:', err)
                return { isAdmin: false, role: 'user' as any }
            } finally {
                console.log('fetchProfileData: Finished')
            }
        }

        const initializeAuth = async () => {


            let session = null
            let sessionError = null

            try {
                // RACE CONDITION: Timeout after 5 seconds to prevent indefinite hang
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                const sessionPromise = supabase.auth.getSession()

                const result = await Promise.race([sessionPromise, timeoutPromise]) as any
                session = result.data.session
                sessionError = result.error
            } catch (err) {
                console.error('useAuth: getSession TIMED OUT or Failed. Falling back to getUser().', err)
                // Fallback to getUser which validates with server
                try {
                    const { data: { user }, error: userError } = await supabase.auth.getUser()
                    if (user) {
                        session = { user } as any // Partial session
                    } else {
                        console.error('useAuth: getUser also failed', userError)
                    }
                } catch (e2) {
                    console.error('useAuth: getUser exception', e2)
                }
            }


            let profileInfo = { isAdmin: false, role: null as any }
            if (session?.user) {
                profileInfo = await fetchProfileData(session.user.id)
            }

            if (mounted) {
                setAuthState({
                    user: session?.user ?? null,
                    session,
                    loading: false,
                    isAdmin: profileInfo.isAdmin,
                    role: profileInfo.role,
                })
            }
        }

        initializeAuth()

        return () => {
            mounted = false
            // Auth subscription temporarily disabled to prevent client-side hangs
        }
    }, [])

    return authState
}

/**
 * Hook to get the user's agency data.
 * Returns null if user is not associated with any agency.
 */
export function useUserAgency() {
    const { user, loading: authLoading } = useAuth()
    const [agency, setAgency] = useState<{
        id: number
        name: string
        slug: string
        logo_url: string | null
        tier_subscription: string
        total_properties: number
        total_views: number
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            setAgency(null)
            setLoading(false)
            return
        }

        // MOCK AGENCY REMOVED FOR REAL DATA


        // Use FRESH client here too
        const supabase = createSupabaseBrowserClient()

        // Get user's agency via agency_users junction table
        supabase
            .from('agency_users')
            .select(`
        agency_id,
        agencies (
          id,
          name,
          slug,
          logo_url,
          tier_subscription,
          total_properties,
          total_views
        )
      `)
            .eq('user_id', user.id)
            .single()
            .then(({ data, error }: any) => {
                if (error) {
                    console.error('useUserAgency: Error fetching agency:', error)
                    setAgency(null)
                } else if (!data) {
                    console.warn('useUserAgency: No agency data found for user:', user.id)
                    setAgency(null)
                } else {
                    // Type assertion for Supabase join result
                    const agencyData = (data as { agencies: typeof agency }).agencies
                    setAgency(agencyData)
                }
                setLoading(false)
            })
    }, [user, authLoading])

    return { agency, loading: loading || authLoading }
}

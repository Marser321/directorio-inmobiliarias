import { createServerClient } from '@/lib/insforge/compat-ssr'
import { cookies } from 'next/headers'
import { AgencyTable } from '@/components/admin/agency-table'
import { CreateAgencyDialog } from '@/components/admin/create-agency-dialog'
import { SearchFilters } from '@/components/admin/search-filters'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function AdminAgenciesPage({ searchParams }: PageProps) {
    const params = await searchParams
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
        process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    // Build query with filters
    let query = supabase.from('agencies').select('*')

    // Search filter
    if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,city.ilike.%${params.search}%`)
    }

    // Tier filter
    if (params.tier && params.tier !== 'all') {
        query = query.eq('tier_subscription', params.tier)
    }

    // Verified filter
    if (params.verified === 'true') {
        query = query.eq('is_verified', true)
    } else if (params.verified === 'false') {
        query = query.eq('is_verified', false)
    }

    const { data: agencies } = await query.order('created_at', { ascending: false })

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inmobiliarias</h1>
                    <p className="text-slate-500 mt-2">
                        Gestiona las agencias registradas en la plataforma.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <CreateAgencyDialog />
                    <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white">
                        <Link href="/admin/agencies/create">
                            <Plus className="w-4 h-4 mr-2" />
                            Perfil Completo
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <SearchFilters
                searchPlaceholder="Buscar por nombre o ciudad..."
                filterOptions={[
                    {
                        name: 'tier',
                        label: 'Plan',
                        options: [
                            { value: 'basic', label: '🥉 Basic' },
                            { value: 'pro', label: '🥈 Pro' },
                            { value: 'enterprise', label: '🥇 Enterprise' },
                        ]
                    },
                    {
                        name: 'verified',
                        label: 'Estado',
                        options: [
                            { value: 'true', label: '✅ Verificadas' },
                            { value: 'false', label: '⏳ Sin verificar' },
                        ]
                    }
                ]}
            />

            <AgencyTable agencies={agencies || []} />
        </div>
    )
}

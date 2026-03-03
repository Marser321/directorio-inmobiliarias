import { createServerClient } from '@/lib/insforge/compat-ssr'
import { cookies } from 'next/headers'
import { PropertyTable } from '@/components/admin/property-table'
import { SearchFilters } from '@/components/admin/search-filters'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function AdminPropertiesPage({ searchParams }: PageProps) {
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
    let query = supabase.from('properties').select(`
        *,
        agencies (
            id,
            name
        )
    `)

    // Search filter
    if (params.search) {
        query = query.or(`title.ilike.%${params.search}%,slug.ilike.%${params.search}%`)
    }

    // Status filter
    if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status)
    }

    // Price range filter
    if (params.min_price) {
        query = query.gte('price', parseInt(params.min_price))
    }
    if (params.max_price) {
        query = query.lte('price', parseInt(params.max_price))
    }

    const { data: properties } = await query.order('created_at', { ascending: false })

    // Fetch agencies for assignment dropdown
    const { data: agencies } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name')

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Propiedades</h1>
                    <p className="text-slate-500 mt-2">
                        Visualiza y reasigna propiedades entre agencias.
                    </p>
                </div>
                <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Link href="/admin/properties/create">
                        Nueva Propiedad
                    </Link>
                </Button>
            </div>

            {/* Search & Filters */}
            <SearchFilters
                searchPlaceholder="Buscar por título..."
                filterOptions={[
                    {
                        name: 'status',
                        label: 'Estado',
                        options: [
                            { value: 'for_sale', label: 'En Venta' },
                            { value: 'for_rent', label: 'En Alquiler' },
                            { value: 'sold', label: 'Vendida' },
                            { value: 'rented', label: 'Alquilada' },
                            { value: 'reserved', label: 'Reservada' },
                        ]
                    }
                ]}
            />

            <PropertyTable
                properties={properties || []}
                agencies={agencies || []}
            />
        </div>
    )
}

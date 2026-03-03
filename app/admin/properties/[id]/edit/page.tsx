import { createServerClient } from '@/lib/insforge/compat-ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { PropertyEditForm } from "@/components/admin/property-edit-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPropertyPage({ params }: PageProps) {
    const { id } = await params
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

    const { data: property, error } = await supabase
        .from('properties')
        .select('*, location:locations(id, name), agency:agencies(id, name)')
        .eq('id', id)
        .single()

    if (error || !property) {
        notFound()
    }

    // Fetch locations and agencies for selects
    const { data: locations } = await supabase
        .from('locations')
        .select('id, name, type, center_lat, center_lng')
        .order('name')
    const { data: agencies } = await supabase.from('agencies').select('id, name').order('name')

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/properties">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Editar: {property.title}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Modifica los datos de la propiedad.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <PropertyEditForm
                    property={property}
                    locations={locations || []}
                    agencies={agencies || []}
                />
            </div>
        </div>
    )
}

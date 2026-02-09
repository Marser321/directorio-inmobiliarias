import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { AgencyEditForm } from "@/components/admin/agency-edit-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditAgencyPage({ params }: PageProps) {
    const { id } = await params
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: agency, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !agency) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/agencies">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Editar: {agency.name}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Modifica los datos de la inmobiliaria.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <AgencyEditForm agencyData={agency} />
            </div>
        </div>
    )
}

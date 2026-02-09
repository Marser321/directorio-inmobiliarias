import { AgencyForm } from "@/components/admin/agency-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateAgencyPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/agencies">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nueva Inmobiliaria</h1>
                        <p className="text-slate-500 mt-1">
                            Completa el perfil de la agencia para que aparezca en el directorio.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <AgencyForm />
            </div>
        </div>
    )
}

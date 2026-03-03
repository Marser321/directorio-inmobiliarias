import { PropertyForm } from "@/components/admin/property-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreatePropertyPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/properties">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nueva Propiedad</h1>
                    <p className="text-slate-500 mt-2">
                        Ingresa los detalles de la nueva propiedad.
                    </p>
                </div>
            </div>

            <PropertyForm />
        </div>
    )
}

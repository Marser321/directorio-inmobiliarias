import { GeneratorForm } from "@/components/demo-generator/GeneratorForm";

export const metadata = {
    title: 'Demo Generator',
    robots: {
        index: false,
        follow: false,
    },
};

export default function DemoGeneratorPage() {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 uppercase tracking-widest mb-4">
                        Permissionless Page
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight">
                        Landing Page Generator
                    </h1>
                    <p className="text-lg text-white/40 max-w-2xl mx-auto">
                        Crea una demostración de alto impacto para cualquier inmobiliaria en segundos.
                        Sin pedir permiso. Sin esperar datos. Venta pura.
                    </p>
                </div>

                <GeneratorForm />

                <div className="text-center pt-12 text-white/20 text-sm">
                    <p>Powered by Antigravity Engine v2.0</p>
                </div>
            </div>
        </div>
    );
}

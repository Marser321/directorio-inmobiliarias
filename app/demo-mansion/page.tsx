import { CanvasSequenceAnimator } from '@/components/luxe';

export const metadata = {
    title: 'Mansión de Lujo | LuxeEstate',
    description: 'Experiencia inmersiva de una mansión de lujo con vista 360°',
    robots: {
        index: false,
        follow: false,
    },
};

export default function DemoMansionPage() {
    return (
        <main className="bg-slate-950">
            {/* Scroll Sequence Hero */}
            <CanvasSequenceAnimator
                frameCount={160}
                frameUrlPattern="/sequences/mansion/frame_{index}.webp"
                captions={[
                    {
                        at: 0.08,
                        text: 'La Vista que Mereces',
                        position: 'center',
                    },
                    {
                        at: 0.25,
                        text: 'Diseño Arquitectónico Único',
                        position: 'bottom-left',
                    },
                    {
                        at: 0.45,
                        text: 'Piscina Infinity Edge',
                        position: 'bottom-right',
                    },
                    {
                        at: 0.65,
                        text: 'Materiales de Primera',
                        position: 'center',
                    },
                    {
                        at: 0.85,
                        text: 'Tu Próximo Hogar',
                        position: 'center',
                    },
                ]}
            />

            {/* Content After Animation */}
            <section className="relative z-10 bg-slate-950 py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">
                        ¿Te interesa esta propiedad?
                    </h2>
                    <p className="text-xl text-white/70 mb-10">
                        Agenda una visita privada y descubre todos los detalles de esta exclusiva mansión.
                    </p>
                    <button className="btn-luxe px-10 py-4 rounded-full text-white font-semibold text-lg">
                        Solicitar Información
                    </button>
                </div>
            </section>
        </main>
    );
}

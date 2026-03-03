import React from 'react';
import { Footer } from '@/components/luxe/Footer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <nav className="p-6">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-[#D4AF37] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Inicio
                </Link>
            </nav>

            <main className="flex-grow container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8">Política de Privacidad</h1>

                <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 font-light text-muted-foreground">
                    <p className="lead text-xl text-foreground font-normal">
                        En Luxe Estate, valoramos su privacidad y nos comprometemos a proteger su información personal con los más altos estándares de seguridad.
                    </p>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Recopilación de Información</h2>
                        <p>
                            Recopilamos información que usted nos proporciona directamente al registrarse, solicitar información sobre propiedades o suscribirse a nuestro boletín. Esto puede incluir su nombre, dirección de correo electrónico, número de teléfono y preferencias de inversión.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Uso de la Información</h2>
                        <p>
                            Utilizamos su información para proporcionarle los servicios solicitados, personalizar su experiencia de búsqueda de propiedades y comunicarnos con usted sobre oportunidades exclusivas que coincidan con su perfil.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Protección de Datos</h2>
                        <p>
                            Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales contra el acceso no autorizado, la pérdida o la alteración.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Cookies y Rastreo</h2>
                        <p>
                            Utilizamos cookies para mejorar la funcionalidad de nuestro sitio web y entender cómo interactúan los usuarios con nuestras propiedades listadas. Usted puede configurar su navegador para rechazar las cookies si lo desea.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. Contacto</h2>
                        <p>
                            Si tiene preguntas sobre nuestra política de privacidad, por favor contáctenos a través de nuestro formulario de contacto o directamente en nuestras oficinas en Punta del Este.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

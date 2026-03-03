import React from 'react';
import { Footer } from '@/components/luxe/Footer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <nav className="p-6">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-[#D4AF37] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Inicio
                </Link>
            </nav>

            <main className="flex-grow container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8">Términos y Condiciones</h1>

                <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 font-light text-muted-foreground">
                    <p className="lead text-xl text-foreground font-normal">
                        Bienvenido a Luxe Estate. Al utilizar nuestros servicios, usted acepta cumplir con los siguientes términos y condiciones diseñados para garantizar la excelencia en nuestro servicio.
                    </p>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Uso del Servicio</h2>
                        <p>
                            Luxe Estate proporciona una plataforma para la visualización y contacto por propiedades de lujo. El contenido de este sitio es solo para fines informativos generales y está sujeto a cambios sin previo aviso.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Propiedad Intelectual</h2>
                        <p>
                            Todo el contenido de este sitio web, incluyendo imágenes, textos, logotipos y diseños, es propiedad de Luxe Estate o de sus respectivos propietarios y está protegido por las leyes de derechos de autor.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Exactitud de la Información</h2>
                        <p>
                            Nos esforzamos por garantizar que la información de las propiedades sea precisa. Sin embargo, no garantizamos que las descripciones, precios u otros contenidos sean exactos, completos, fiables, actuales o libres de errores.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Limitación de Responsabilidad</h2>
                        <p>
                            Luxe Estate no será responsable de ningún daño directo, indirecto, incidental o consecuente que resulte del uso o la imposibilidad de uso de nuestro sitio web o servicios.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. Modificaciones</h2>
                        <p>
                            Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del sitio tras la publicación de cambios constituirá su aceptación de dichos cambios.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

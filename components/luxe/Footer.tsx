'use client';

import { Star, Home, MapPin } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="bg-foreground text-background pt-20 pb-8">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <Link href="/" className="inline-block">
                            <h4 className="text-3xl font-serif font-bold tracking-tight">
                                Luxe<span className="text-[#D4AF37]">Estate</span>
                            </h4>
                        </Link>
                        <p className="text-background/60 max-w-md leading-relaxed">
                            Redefiniendo el Real Estate de lujo en Punta del Este. Tu puente hacia propiedades excepcionales y un estilo de vida superior.
                        </p>

                        {/* Trust Badges */}
                        <div className="flex gap-4 pt-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                <Star className="w-4 h-4 text-[#D4AF37]" />
                                <span className="text-sm text-background/80">4.9 Rating</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                <Home className="w-4 h-4 text-[#D4AF37]" />
                                <span className="text-sm text-background/80">500+ Propiedades</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h5 className="font-bold text-lg text-background">Explorar</h5>
                        <ul className="space-y-3 text-background/60">
                            <li>
                                <Link href="/search" className="hover:text-[#D4AF37] transition-colors">
                                    Propiedades
                                </Link>
                            </li>
                            <li>
                                <Link href="/search?mode=map" className="hover:text-[#D4AF37] transition-colors">
                                    Mapa Interactivo
                                </Link>
                            </li>
                            <li>
                                <Link href="/search?lifestyles=waterfront" className="hover:text-[#D4AF37] transition-colors">
                                    Frente al Mar
                                </Link>
                            </li>
                            <li>
                                <Link href="/partners" className="hover:text-[#D4AF37] transition-colors">
                                    Inmobiliarias
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                        <h5 className="font-bold text-lg text-background">Contacto</h5>
                        <ul className="space-y-3 text-background/60">
                            <li className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-1 text-[#D4AF37]" />
                                <span>Ruta 10, La Barra<br />Punta del Este, Uruguay</span>
                            </li>
                            <li>
                                <a href="mailto:info@luxeestate.uy" className="hover:text-[#D4AF37] transition-colors">
                                    info@luxeestate.uy
                                </a>
                            </li>
                            <li>
                                <a href="tel:+59842770000" className="hover:text-[#D4AF37] transition-colors">
                                    +598 42 77 00 00
                                </a>
                            </li>
                        </ul>

                        {/* WhatsApp CTA */}
                        <a
                            href="https://wa.me/59842770000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-full transition-colors mt-4"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            WhatsApp
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-background/50 text-sm">
                    <p>© 2026 Luxe Estate. Todos los derechos reservados.</p>
                    <div className="flex gap-6">
                        <Link href="/privacidad" className="hover:text-[#D4AF37] transition-colors">
                            Privacidad
                        </Link>
                        <Link href="/terminos" className="hover:text-[#D4AF37] transition-colors">
                            Términos
                        </Link>
                        <Link href="/legal/comisiones-inmobiliarias" className="hover:text-[#D4AF37] transition-colors">
                            Comisiones
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

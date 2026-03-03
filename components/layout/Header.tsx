
import Link from 'next/link'
import { ActiveLink } from '@/components/luxe/ActiveLink'
import { AuthCtas } from '@/components/layout/AuthCtas'

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
                    <span>PuntaRealEstate</span>
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <ActiveLink href="/search">
                        Venta
                    </ActiveLink>
                    <ActiveLink href="/search?status=for_rent">
                        Alquiler
                    </ActiveLink>
                    <ActiveLink href="/explore">
                        Mapa Interactivo
                    </ActiveLink>
                    <ActiveLink href="/partners">
                        Inmobiliarias
                    </ActiveLink>
                </nav>
                <AuthCtas
                    loginVariant="default"
                    publishVariant="outline"
                    size="sm"
                    containerClassName="flex items-center gap-4"
                />
            </div>
        </header>
    )
}

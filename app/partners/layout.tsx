import { Metadata } from 'next'
import { DebugLogger } from '@/components/DebugLogger'

export const metadata: Metadata = {
    title: 'Portal de Partners | Luxe Estate',
    description: 'Gestiona tu inventario de propiedades y accede a métricas de rendimiento.',
}

export default function PartnersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            {/* Minimal header for partners */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2">
                        <span className="text-xl font-serif font-bold text-foreground">
                            Luxe<span className="text-gold">Estate</span>
                        </span>
                        <span className="text-xs text-muted-foreground border-l border-border pl-2 ml-2">
                            Partners
                        </span>
                    </a>
                </div>
            </header>

            {/* Main content with top padding for fixed header */}
            <main className="pt-16">
                {children}
            </main>
        </div >
    )
}

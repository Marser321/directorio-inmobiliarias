import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { cn } from '@/lib/utils';
import { SearchDialog } from '@/components/search/SearchDialog';
import { CompareTray } from '@/components/search/CompareTray';
import { SmoothScroll } from '@/components/luxe/SmoothScroll';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/auth-context';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fontSerif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://realstate-nu.vercel.app'),
  title: {
    default: 'Luxe Estate | Punta del Este Luxury Real Estate',
    template: '%s | Luxe Estate'
  },
  description: 'Descubre las propiedades más exclusivas de Punta del Este. Búsqueda inteligente con IA para encontrar tu hogar ideal en La Barra, José Ignacio y más.',
  keywords: ['Punta del Este', 'Real Estate', 'Luxury', 'Inmobiliaria', 'Punta del Este Properties', 'La Barra', 'José Ignacio', 'Punta Ballena'],
  authors: [{ name: 'Luxe Estate Team' }],
  creator: 'Luxe Estate',
  publisher: 'Luxe Estate',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Luxe Estate | Punta del Este Luxury Real Estate',
    description: 'Descubre las propiedades más exclusivas de Punta del Este con nuestra búsqueda inteligente.',
    url: 'https://realstate-nu.vercel.app',
    siteName: 'Luxe Estate',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Luxe Estate - Luxury Real Estate Punta del Este',
      },
    ],
    locale: 'es_UY',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luxe Estate | Punta del Este Luxury Real Estate',
    description: 'Búsqueda inteligente de propiedades de lujo en Punta del Este.',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isThemeLabEditorial = process.env.FEATURE_THEME_LAB_EDITORIAL === 'true'

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased selection:bg-primary selection:text-primary-foreground',
          isThemeLabEditorial && 'theme-lab-editorial',
          fontSans.variable,
          fontSerif.variable
        )}
      >
        <AuthProvider>
          <SmoothScroll />
          <SearchDialog />
          <CompareTray />
          <Toaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

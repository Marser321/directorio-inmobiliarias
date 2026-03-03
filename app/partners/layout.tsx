import { Metadata } from 'next'
import { PartnersShell } from '@/components/partners/PartnersShell'

export const metadata: Metadata = {
  title: 'Portal de Partners | Luxe Estate',
  description: 'Gestiona tu inventario, leads y perfil de inmobiliaria en un entorno operativo centralizado.',
}

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnersShell>{children}</PartnersShell>
}

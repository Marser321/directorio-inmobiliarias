import Link from 'next/link'
import { Building2 } from 'lucide-react'

export function AgencyDirectoryEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-12 text-center">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-1 text-muted-foreground">
        <Building2 className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-ink-strong">No encontramos inmobiliarias con esos filtros</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Prueba quitando la verificación, ampliando la ciudad o buscando por una palabra más general.
      </p>
      <div className="mt-5">
        <Link
          href="/partners"
          className="rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-4 py-2 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
        >
          Limpiar filtros
        </Link>
      </div>
    </div>
  )
}

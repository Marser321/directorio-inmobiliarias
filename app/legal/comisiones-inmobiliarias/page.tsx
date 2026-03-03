import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { Footer } from '@/components/luxe/Footer'
import type { LegalCommissionGuideDto } from '@/types/domain'

type LegalGuideFile = {
  last_reviewed_at?: string
  owner?: string
  scope?: string
  guides?: LegalCommissionGuideDto[]
}

async function loadGuides(): Promise<LegalGuideFile> {
  try {
    const filePath = path.join(
      process.cwd(),
      'data',
      'legal',
      'commission_guides.uy-maldonado.json'
    )
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as LegalGuideFile
  } catch {
    return {
      last_reviewed_at: null as unknown as string,
      owner: 'unknown',
      scope: 'Uruguay + Maldonado',
      guides: [],
    }
  }
}

export const dynamic = 'force-dynamic'

export default async function LegalCommissionsPage() {
  const payload = await loadGuides()
  const guides = Array.isArray(payload.guides) ? payload.guides : []

  return (
    <div className="min-h-screen bg-editorial-layer text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="rounded-3xl border border-border/70 bg-card/85 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Guía Legal Informativa</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink-strong md:text-4xl">
            Comisiones inmobiliarias: marco informativo en Uruguay y Maldonado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Este contenido es orientativo y no constituye asesoría legal. Para decisiones contractuales, recomendamos
            consulta con profesional habilitado.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-surface-1/70 px-3 py-1">Alcance: {payload.scope || 'Uruguay + Maldonado'}</span>
            <span className="rounded-full border border-border bg-surface-1/70 px-3 py-1">
              Revisado: {payload.last_reviewed_at ? new Date(payload.last_reviewed_at).toLocaleDateString('es-UY') : 'Sin fecha'}
            </span>
            <span className="rounded-full border border-border bg-surface-1/70 px-3 py-1">
              Owner: {payload.owner || 'legal-ops'}
            </span>
          </div>
        </div>

        <section className="mt-6 space-y-4">
          {guides.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/80 p-5 text-sm text-muted-foreground">
              No hay fuentes cargadas todavía para esta guía.
            </div>
          ) : (
            guides.map((guide) => (
              <article key={guide.id} className="rounded-2xl border border-border/70 bg-card/90 p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{guide.scope}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink-strong">{guide.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <a
                    href={guide.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-3 py-1 text-ink-strong hover:bg-accent-gold-soft/20"
                  >
                    Fuente: {guide.source_name}
                  </a>
                  <span className="rounded-full border border-border bg-surface-1/70 px-3 py-1">
                    Vigencia: {guide.effective_date || 'Consultar fuente oficial'}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-border/70 bg-card/85 p-5">
          <h3 className="text-base font-semibold text-ink-strong">Cómo usar esta guía para comparar inmobiliarias</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Verifica si la inmobiliaria declara su política de comisión y cargos adicionales.</li>
            <li>Prioriza perfiles con evidencia y estado de verificación visible.</li>
            <li>Antes de firmar, solicita contrato por escrito con costos y alcance del servicio.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/partners" className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-ink-strong">
              Ver directorio de inmobiliarias
            </Link>
            <Link href="/compare" className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-ink-strong">
              Ir al comparador
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

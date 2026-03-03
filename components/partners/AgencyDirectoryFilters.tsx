import { Search, SlidersHorizontal } from 'lucide-react'

interface AgencyDirectoryFiltersProps {
  query: string
  city: string
  tier: string
  verifiedOnly: boolean
  cityOptions: string[]
}

const TIER_OPTIONS = [
  { label: 'Todos los planes', value: '' },
  { label: 'Basic', value: 'basic' },
  { label: 'Pro', value: 'pro' },
  { label: 'Enterprise', value: 'enterprise' },
]

export function AgencyDirectoryFilters({
  query,
  city,
  tier,
  verifiedOnly,
  cityOptions,
}: AgencyDirectoryFiltersProps) {
  return (
    <form method="get" className="rounded-2xl border border-border/70 bg-card/80 p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Ajusta filtros para encontrar inmobiliarias por ciudad, nivel y verificación
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Nombre o ciudad</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Ej: Punta, Faro, Costa"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent-gold-soft/45"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Ciudad</span>
          <select
            name="city"
            defaultValue={city}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent-gold-soft/45"
          >
            <option value="">Todas</option>
            {cityOptions.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Plan</span>
          <select
            name="tier"
            defaultValue={tier}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent-gold-soft/45"
          >
            {TIER_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col justify-between gap-2">
          <label className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground md:mt-0">
            <input
              type="checkbox"
              name="verified"
              value="true"
              defaultChecked={verifiedOnly}
              className="h-4 w-4 rounded border-border"
            />
            Solo verificadas
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg border border-accent-gold-soft/35 bg-accent-gold-soft/10 px-4 text-sm font-medium text-ink-strong transition-colors hover:bg-accent-gold-soft/20"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </form>
  )
}

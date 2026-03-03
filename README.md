# Directorio Inmobiliarias

Plataforma web (Next.js App Router) para búsqueda pública, captación de leads y backoffice de partners.

## Stack

- Next.js 16 + React 19
- InsForge SDK (`@insforge/sdk`)
- Tailwind CSS 3.4 (bloqueado)
- Stripe (checkout + webhooks)

## Requisitos

- Node.js 20+ (`20.x` recomendado para CI)
- Compatibilidad validada localmente en Node `24.x`
- `npm`
- Variables mínimas de entorno:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=...
NEXT_PUBLIC_INSFORGE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Seguridad (P0)

Para rutas backend privilegiadas (webhook/admin/debug) se requiere clave server-side:

```env
INSFORGE_SERVICE_ROLE_KEY=...
# o SUPABASE_SERVICE_ROLE_KEY=...
# o INSFORGE_ADMIN_API_KEY=...
STRIPE_WEBHOOK_SECRET=...
ALERTS_CRON_SECRET=...
# WhatsApp Meta Cloud API
META_WA_TOKEN=...
META_WA_PHONE_NUMBER_ID=...
META_WA_API_VERSION=v21.0
META_WA_TEMPLATE_NAME=property_alert_v1
```

`/api/debug/users` queda deshabilitado por defecto y sólo se habilita con:

```env
FEATURE_DEBUG_USERS_ROUTE=true
```

## API canónica v2

- Auth:
  - `POST /api/auth/signup`
  - `POST /api/auth/signin`
  - `POST /api/auth/signout`
  - `POST /api/auth/verify-otp`
  - `GET /api/auth/me`
- Onboarding partner:
  - `POST /api/partners/onboarding`
- Stripe checkout:
  - `POST /api/stripe/checkout/featured` (canónico)
  - `POST /api/stripe/checkout/subscription`
- `POST /api/stripe/checkout/service-request`
- Buyer depth:
  - `GET|POST /api/user/favorites`
  - `DELETE /api/user/favorites/:propertyId`
  - `POST /api/user/favorites/sync`
  - `GET /api/compare?ids=...`
  - `GET|POST|PATCH|DELETE /api/alerts/saved-search`
  - `POST /api/alerts/run` (`x-cron-secret` requerido)
  - `GET /api/insights/zones`

Rutas deprecadas (respuesta `410` + `Sunset`):

- `POST /api/auth/register`
- `POST /api/partners/create-agency`

Alias temporal deprecado:

- `POST /api/stripe/checkout` (redirigir integración a `/api/stripe/checkout/featured`)
  - Mantiene headers `Deprecation`, `Sunset` y `Link`.
  - Sunset vigente: `Thu, 30 Apr 2026 23:59:59 GMT`.
  - Puede responder `401/400/403/503` según auth/payload/feature flags.

## Convergencia de esquema

- Fuente canónica: `insforge/schema.sql`.
- Plan vivo de migraciones: `/DB_MIGRATION_PLAN.md`.
- Evidencia de ejecución por checkpoints: `/DB_MIGRATION_EXECUTION_LOG_20260303.md`.
- Template para nuevas bitácoras: `/DB_MIGRATION_LEDGER_TEMPLATE.md`.
- Índice normalizado de checkpoints: `/DB_MIGRATION_LEDGER_INDEX.md`.
- En backend objetivo (`.env.local`) las migraciones críticas de release se ejecutaron el `2026-03-03`.

## Modelo de membresías v2 (partners)

- Fuente de verdad: `public.agency_memberships`.
- Legacy eliminado para flujos operativos: no usar `agency_users`.
- Diagnóstico de sesión: `GET /api/auth/me` incluye `integrityWarnings` para detectar usuario autenticado sin `profile` o sin `agency_memberships`.

## Scripts

```bash
npm run check:env
npm run dev
npm run lint
npm run build
npm run test:schema
npm run test:full
npm run smoke
npm run test:perf:search
npm run repair:partners
```

Feature flags de rollout incremental (por defecto en `false`):

```env
FEATURE_COMPARE=false
FEATURE_FAVORITES_SYNC=false
FEATURE_SAVED_SEARCH=false
FEATURE_WHATSAPP_ALERTS=false
FEATURE_ZONE_INSIGHTS=false
```

Script de reparación de integridad (dry-run por defecto):

```bash
TARGET_OWNER_EMAIL=<email> npm run repair:partners
TARGET_OWNER_EMAIL=<email> npm run repair:partners -- --apply
```

## Entorno colaborativo

- Onboarding operativo del equipo: `/WORKSPACE_ONBOARDING.md`.
- Runbook operativo de InsForge MCP + SQL: `/INSFORGE_MCP_SQL_RUNBOOK.md`.
- Perfiles `.env` sin secretos:
  - `env/profiles/local.env.example`
  - `env/profiles/staging.env.example`
  - `env/profiles/prod.env.example`
- Backlog técnico compartido: `/TECHNICAL_BACKLOG.md`.
- Ritual de hand-off semanal: `/HANDOFF_WEEKLY.md`.
- Registro de decisiones con fechas absolutas: `/DECISIONS_LOG.md`.
- Feedback funcional/UX de sesión local: `/LOCAL_FEEDBACK_20260303.md`.

## Gate de release (baseline)

Antes de despliegue:

1. `npm run lint`
2. `npm run build`
3. `npm run test:full`
4. `npm run smoke`
5. `npm run test:perf:search`
6. `npm run test:schema`

## Rollout

Estrategia escalonada en `/ROLLOUT_RUNBOOK.md`:

- 10% -> 50% -> 100%
- rollback por feature flag ante degradación de SLO/KPI.

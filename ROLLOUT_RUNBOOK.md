# Rollout Runbook (Search + Funnel + Leads + Partner Draft)

## Feature flags

- `FEATURE_SEARCH_API_V2`
- `FEATURE_FUNNEL_EVENTS`
- `FEATURE_PARTNER_DRAFT_FLOW`
- `FEATURE_LEAD_FORM_FALLBACK`
- `FEATURE_ADDRESS_GEOCODING`

## Preflight checklist

1. Ejecutar `npm run check:env`
2. Ejecutar `npm run lint`
3. Ejecutar `npm run build`
4. Ejecutar `npm run smoke`
5. Ejecutar `npm run test:full`
6. Verificar que `npm run test:perf:search` mantiene `p95 <= 350ms` y `error_rate <= 1%`
7. Si hubo cambios SQL, adjuntar bitácora con formato `DB_MIGRATION_EXECUTION_LOG_YYYYMMDD.md`.

## Rollout por etapas

### Etapa 1 (10% de tráfico)

1. Activar flags en canary/segmento 10%.
2. Monitorear 2-4 horas:
   - `GET /api/search/properties` p95
   - tasa de error API total
   - ratio `search_results_loaded -> search_result_clicked`
3. Si hay degradación >10% o error rate >1%, rollback.

### Etapa 2 (50% de tráfico)

1. Escalar a 50%.
2. Monitorear al menos 24h:
   - funnel `Search -> Ficha -> WhatsApp`
   - volumen de `lead_form_submitted`
   - creación de `partner_draft_created`
3. Si los SLO/KPIs se mantienen, avanzar.

### Etapa 3 (100% de tráfico)

1. Activar 100%.
2. Monitorear 72h:
   - latencia p95 búsqueda
   - error rate API
   - conversión `Ficha -> WhatsApp`
3. Consolidar baseline nuevo y cerrar rollout.

## Rollback rápido

Si hay incidente, desactivar inmediatamente el módulo afectado:

- búsqueda: `FEATURE_SEARCH_API_V2=false`
- eventos: `FEATURE_FUNNEL_EVENTS=false`
- draft partners: `FEATURE_PARTNER_DRAFT_FLOW=false`
- lead fallback: `FEATURE_LEAD_FORM_FALLBACK=false`
- geocoding por dirección: `FEATURE_ADDRESS_GEOCODING=false`

Cada módulo está desacoplado para apagado sin downtime.

## Operación Auth/Partner (v2)

- Tabla canónica de vínculo usuario-inmobiliaria: `public.agency_memberships`.
- No usar `agency_users` en scripts u operación manual.
- Reparación idempotente de integridad (dry-run primero):
  - `TARGET_OWNER_EMAIL=<email> npm run repair:partners`
  - `TARGET_OWNER_EMAIL=<email> npm run repair:partners -- --apply`

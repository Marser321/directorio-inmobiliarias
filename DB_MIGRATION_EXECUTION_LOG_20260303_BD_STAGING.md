# DB Migration Execution Log (Buyer Depth Staging) - 2026-03-03

- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- operator: `codex`
- window_start_utc: `2026-03-03T15:58:53Z`
- window_end_utc: `2026-03-03T16:10:55Z`
- channel: `InsForge MCP (direct JSON-RPC stdio)`
- rule: `stop-the-line on critical failure`

## CP-S0 - Preflight staging + canal MCP
- Timestamp: `2026-03-03T16:05:35Z`
- Resultado: `partial`
- Evidencia:
  - `.migration-evidence/cps_staging_mcp_sql_20260303.json`
  - `~/.codex/config.toml` (backend + key configurados)
- Incidentes:
  - El cliente MCP del runner no pudo completar `initialize` con `list_mcp_resources`.
  - Mitigación aplicada: ejecución directa del servidor MCP con JSON-RPC line-delimited.
  - Freeze/backup: prerrequisito externo no verificable desde este runner.

## CP-S1 - Baseline read-only + handshake funcional
- Timestamp: `2026-03-03T16:05:36Z`
- Resultado: `success`
- Acciones:
  - `get-backend-metadata` exitoso.
  - `run-raw-sql` con `select 1` exitoso.
  - Baseline pre-migración:
    - `user_saved_properties=false`
    - `saved_searches=false`
    - `search_alert_deliveries=false`
- Evidencia:
  - `.migration-evidence/cps_staging_mcp_sql_20260303.json`

## CP-S2 - Migración buyer-depth
- Timestamp: `2026-03-03T16:05:37Z`
- Resultado: `success`
- SQL block:
  - `supabase/migrations/20260303_buyer_depth_features.sql`
- Ejecución:
  - Aplicada en transacción explícita (`BEGIN ... COMMIT`) vía `run-raw-sql`.
- Validación inmediata:
  - Objetos creados:
    - `public.user_saved_properties=true`
    - `public.saved_searches=true`
    - `public.search_alert_deliveries=true`
  - Políticas RLS presentes para las 3 tablas (incluyendo políticas específicas y `project_admin_policy`).
- Evidencia:
  - `.migration-evidence/cps_staging_mcp_sql_20260303.json`

## CP-S3 - Activación de flags (entorno de ejecución)
- Timestamp: `2026-03-03T16:00:00Z` (ventana local/staging)
- Resultado: `success`
- Flags activos:
  - `FEATURE_COMPARE=true`
  - `FEATURE_FAVORITES_SYNC=true`
  - `FEATURE_SAVED_SEARCH=true`
  - `FEATURE_WHATSAPP_ALERTS=true`
  - `FEATURE_ZONE_INSIGHTS=true`
- Verificación:
  - `GET /api/health/config` devuelve los 5 flags en `true`.
- Evidencia:
  - `.migration-evidence/cpl2_health_flags.json`
  - `.env.local` (snapshot previo en `.migration-evidence/env_snapshots/`)

## CP-S4 - Gate funcional + matriz runtime
- Timestamp: `2026-03-03T16:10:00Z`
- Resultado: `success`
- Node 24:
  - `npm run test:schema` ✅
  - `npm run test:full` ✅
  - `npm run smoke` ✅
- Node 20:
  - `check-release-schema` (equivalente `test:schema`) ✅
  - suite completa (equivalente `test:full`) ✅
  - `smoke` ✅
- Persistencia/contrato:
  - `property_leads_count=11`
  - `user_funnel_events_count=79`
  - `funnel_daily_summary_rows=3`
  - `alerts/run` con `x-cron-secret` => `200`
- Evidencia:
  - `.migration-evidence/cps4_test_schema.log`
  - `.migration-evidence/cps4_test_full.log`
  - `.migration-evidence/cps4_smoke.log`
  - `.migration-evidence/cps4_node20_test_schema.log`
  - `.migration-evidence/cps4_node20_tests.log`
  - `.migration-evidence/cps4_node20_perf_search.log`
  - `.migration-evidence/cps4_node20_smoke.log`
  - `.migration-evidence/cps4_post_validation_sql.json`
  - `.migration-evidence/cpl2_alerts_run_after_migration_status.txt`
  - `.migration-evidence/cpl2_alerts_run_after_migration_body.json`

## CP-S5 - Soak + KPIs
- Timestamp: `2026-03-03T16:10:55Z`
- Resultado: `partial`
- Estado:
  - Soak de 48h pendiente (no cerrable dentro de esta ventana).
  - KPI baseline/comparativa queda abierto para seguimiento operativo.
- Próxima acción:
  - Revisión al `2026-03-05` con métricas:
    - `view_to_whatsapp`
    - `view_to_lead`
    - `search_result_clicked/property_viewed`
    - retorno de sesión

## Validación adicional (funnel events nuevos)
- Se emitieron eventos de validación controlada:
  - `compare_opened`
  - `compare_property_added`
  - `compare_property_removed`
  - `saved_search_created`
  - `whatsapp_alert_sent`
- Conteo actual: `1` por evento.
- Evidencia:
  - `.migration-evidence/cps4_funnel_event_post_status.log`
  - `.migration-evidence/cps4_funnel_new_events_counts.json`

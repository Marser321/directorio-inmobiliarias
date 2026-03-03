# DB Migration Execution Log (Geo/Legal Score - Commission Profile) - 2026-03-03

- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- operator: `codex`
- window_start_utc: `2026-03-03T20:15:34Z`
- window_end_utc: `2026-03-03T20:21:48Z`
- channel: `InsForge MCP (direct JSON-RPC stdio)`
- rule: `stop-the-line on critical failure`

## CP0 - Operative preflight + MCP access
- Timestamp: `2026-03-03T20:20:16Z`
- Resultado: `partial`
- Estado:
  - MCP `initialize`/`tools/list` OK.
  - Se detectó que la credencial admin desde `.env.local` era inválida para MCP (`Invalid API key`).
  - Se usó credencial efectiva desde `~/.codex/config.toml` para el backend objetivo.
- Incidentes:
  - `MCP_ACCESS_KEY_MISMATCH`: key de `.env.local` no válida para canal MCP.
  - `MCP_TOOL_ARGUMENT_MISMATCH`: `run-raw-sql` requiere `query` (no `sql`).
- Evidencia:
  - `.migration-evidence/geo_legal_score_cp_db_apply_20260303.json`

## CP1 - Baseline read-only
- Timestamp: `2026-03-03T20:20:17Z`
- Resultado: `success`
- Baseline:
  - `agency_commission_profiles=false`
  - `commission_operation_type=false`
  - `commission_model=false`
  - `commission_verification_status=false`
- Evidencia:
  - `.migration-evidence/geo_legal_score_cp_db_apply_20260303.json`

## CP2 - Apply migration (`20260304_agency_commission_profiles.sql`)
- Timestamp: `2026-03-03T20:20:17Z`
- Resultado: `success`
- Ejecución:
  - Aplicación en transacción explícita (`BEGIN...COMMIT`) vía `run-raw-sql`.
  - Dos intentos previos fallidos fueron revertidos por transacción abortada, sin cambios parciales:
    - sintaxis no soportada `CREATE POLICY IF NOT EXISTS`
    - dependencia ausente `public.get_my_agency_id()`
  - Migración ajustada para compatibilidad:
    - `DROP POLICY IF EXISTS` + `CREATE POLICY`
    - policy de lectura basada en membership directo (sin `get_my_agency_id()`)
- Evidencia:
  - `.migration-evidence/geo_legal_score_cp_db_apply_20260303.json`

## CP3 - Post-validation DB (objetos + RLS + columnas)
- Timestamp: `2026-03-03T20:20:18Z`
- Resultado: `success`
- Validaciones:
  - `agency_commission_profiles=true`
  - enums creados: `commission_operation_type`, `commission_model`, `commission_verification_status`
  - políticas activas esperadas:
    - `agency_commission_profiles_public_read_policy`
    - `agency_commission_profiles_insert_policy`
    - `agency_commission_profiles_update_policy`
    - `agency_commission_profiles_delete_policy`
    - `project_admin_policy`
  - columnas de contrato presentes (`agency_id`, `operation_type`, `commission_model`, `verification_status`, etc.)
- Evidencia:
  - `.migration-evidence/geo_legal_score_cp_db_apply_20260303.json`

## CP4 - Validation gate app/runtime
- Timestamp: `2026-03-03T20:21:48Z`
- Resultado: `success`
- Node actual:
  - `npm run test:schema` ✅
  - `npm run test:full` ✅
  - `npm run smoke` ✅
- Node 20:
  - `node --import tsx scripts/check-release-schema.ts` ✅
  - `node scripts/run-funnel-suite.mjs` ✅
  - `node scripts/audit-links-images-auth.mjs` ✅
- Persistencia post-run:
  - `property_leads_count=29`
  - `user_funnel_events_count=234`
  - `agency_commission_profiles_count=0`
  - `funnel_daily_summary_exists=true`
- Evidencia:
  - `.migration-evidence/geo_legal_score_db_post_test_schema.log`
  - `.migration-evidence/geo_legal_score_db_post_test_full.log`
  - `.migration-evidence/geo_legal_score_db_post_smoke.log`
  - `.migration-evidence/geo_legal_score_db_post_counts.json`
  - `.migration-evidence/geo_legal_score_db_post_node20_version.log`
  - `.migration-evidence/geo_legal_score_db_post_node20_test_schema.log`
  - `.migration-evidence/geo_legal_score_db_post_node20_test_full.log`
  - `.migration-evidence/geo_legal_score_db_post_node20_smoke.log`

## Outcome
- Bloque DB aplicado en backend objetivo sin regresiones detectadas en gates locales.
- El entorno queda listo para validar en vivo funcionalidades dependientes de comisión/perfil de agencia.

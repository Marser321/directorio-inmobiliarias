# Prod Readiness Audit Log (Auth + Feature Flags) - 2026-03-03

- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- production_app: `https://directorio-inmobiliarias-deploy-177.vercel.app`
- staging_app: `https://directorio-inmobiliarias-ten.vercel.app`
- operator: `codex`
- strategy: `double-layer remediación (Vercel env + parser hardening)`
- db_changes: `none`

## CP0 - Baseline de incidente en vivo (read-only)
- Timestamp: `2026-03-03T21:08:20Z` a `2026-03-03T21:15:11Z`
- Resultado: `success`
- Hallazgos:
  - `POST /api/auth/signup` devolvía `503` con `Auth feature is disabled`.
  - Endpoints feature-gated devolvían `503` por flags en `false`.
  - `NEXT_PUBLIC_APP_URL` aparecía con salto de línea en runtime.
- Evidencia:
  - `.migration-evidence/prod_audit_auth_flags_cp0_api_health_config_20260303T210820Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp0_api_auth_signup_post_20260303T211511Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp0_api_compare_20260303T210820Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp0_api_insights_zones_20260303T210820Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp0_api_geo_cadastre_lookup_20260303T210820Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp0_api_agencies_value_score_20260303T210820Z.txt`

## CP1 - Remediación operativa de env en staging project
- Timestamp: `2026-03-03T21:22:09Z` a `2026-03-03T21:23:33Z`
- Resultado: `success`
- Acciones:
  - Se creó script reproducible de sync: `scripts/vercel/sync-env.mjs`.
  - Sync de 27 variables saneadas (sin comillas envolventes + sin `\\n` literal).
  - Pull posterior y validación de formato sin issues.
- Evidencia:
  - `.migration-evidence/prod_audit_auth_flags_cp1_staging_sync_dryrun_20260303T212208Z.json`
  - `.migration-evidence/prod_audit_auth_flags_cp1_staging_sync_apply_20260303T212218Z.json`
  - `.migration-evidence/env_snapshots/staging_pull_post_sync_20260303T212333Z.env`

## CP2 - Hardening de parser/env en código
- Timestamp: `2026-03-03T21:30:58Z` a `2026-03-03T21:31:47Z`
- Resultado: `success`
- Cambios principales:
  - Parser centralizado: `lib/env/normalize.ts` (`trim`, comillas, `\\n`, booleans tolerantes).
  - Consumo unificado en `lib/insforge/env.ts`, `app/api/health/config/route.ts`, `app/api/auth/me/route.ts`, `app/layout.tsx`, `app/agencies/[slug]/page.tsx`, `app/api/partners/properties/_shared.ts`.
  - Refuerzo adicional en rutas sensibles:
    - `app/api/auth/signup/route.ts` (`FEATURE_SKIP_EMAIL_VERIFICATION`).
    - `app/api/debug/users/route.ts` (`FEATURE_DEBUG_USERS_ROUTE`).
  - `scripts/check-env.mjs` y `scripts/vercel/validate-env-file.mjs` endurecidos para detectar formato inválido y excluir variables de sistema Vercel.

## CP3 - Auditoría funcional Auth + onboarding (staging)
- Timestamp: `2026-03-03T21:29:14Z` a `2026-03-03T21:30:03Z`
- Resultado: `success`
- Verificaciones:
  - `GET /api/health/config` con flags en `true` y `envDiagnostics.malformedCount=0`.
  - `POST /api/auth/signup` dejó de responder `503`:
    - payload inválido -> `400` (esperado)
    - payload válido -> `200` (flujo auth operativo)
- Evidencia:
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_health_20260303T212914Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_signup_20260303T212914Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_signup_happy_20260303T213002Z.txt`

## CP4 - Auditoría profunda full-product (P0-P2, corte actual)
- Timestamp: `2026-03-03T21:29:14Z` a `2026-03-03T21:38:47Z`
- Resultado: `partial`
- Estado:
  - `compare`, `insights`, `value-score` respondiendo comportamiento funcional esperado (400/200 según entrada).
  - `geo/cadastre/lookup` ya no bloquea por flag; devolvió `503` por `provider_error` del proveedor externo (best-effort/fallback activo).
- Incidentes abiertos:
  - `GEO_PROVIDER_UNAVAILABLE`: respuesta técnica 503 de Geocatastro/ArcGIS en consulta puntual.
- Evidencia:
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_compare_20260303T212914Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_insights_20260303T212914Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_geo_20260303T212914Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp5_staging_value_score_20260303T212914Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_compare_after_deploy_20260303T213842Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_insights_after_deploy_20260303T213842Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_geo_after_deploy_20260303T213842Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_value_score_after_deploy_20260303T213842Z.txt`

## CP5 - Gate técnico staging/local
- Timestamp: `2026-03-03T21:24:26Z` a `2026-03-03T21:33:36Z`
- Resultado: `success`
- Resultado gates (Node 24):
  - `npm run check:env` ✅
  - `npm run check:env:strict` ✅
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:full` ✅
  - `npm run test:schema` ✅
  - `npm run smoke` ✅
- Resultado matrix Node 20:
  - `test:schema` ✅
  - `test:full` ✅
  - `smoke` ✅
- Evidencia:
  - `.migration-evidence/prod_audit_auth_flags_cp5_check_env_20260303T212426Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_check_env_strict_20260303T213217Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_lint_post_patch_20260303T213058Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_build_post_patch_20260303T213058Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_test_full_post_patch_20260303T213123Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_test_schema_post_patch_20260303T213137Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_smoke_post_patch_20260303T213147Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_node20_test_schema_20260303T213336Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_node20_test_full_20260303T213336Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp5_node20_smoke_20260303T213336Z.log`

## CP6 - Rollout controlado a producción
- Timestamp: `2026-03-03T21:34:57Z` a `2026-03-03T21:38:47Z`
- Resultado: `success`
- Secuencia:
  1. Re-link temporal al proyecto prod de Vercel.
  2. Sync de env saneada (27 variables).
  3. Pull + validación de env sin issues.
  4. Deploy producción y alias activo en `directorio-inmobiliarias-deploy-177.vercel.app`.
  5. Post-check HTTP real:
     - `POST /api/auth/signup` -> `400` por payload vacío (ya no 503)
     - `GET /api/health/config` -> flags `true`, `envDiagnostics.malformedCount=0`, `appUrl` limpio
- Evidencia:
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_sync_apply_20260303T213457Z.json`
  - `.migration-evidence/env_snapshots/prod_pull_post_sync_20260303T213612Z.env`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_deploy_20260303T213645Z.log`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_health_after_deploy_20260303T213842Z.txt`
  - `.migration-evidence/prod_audit_auth_flags_cp6_prod_signup_after_deploy_20260303T213842Z.txt`

## CP7 - Soak 48h (en ejecución)
- Estado: `in_progress`
- Ventana:
  - inicio: `2026-03-03T21:40:00Z`
  - fin objetivo: `2026-03-05T21:40:00Z`
- Arranque ejecutado:
  - comando:
    - `node scripts/soak-critical-endpoints.mjs --base-url https://directorio-inmobiliarias-deploy-177.vercel.app --interval-seconds 15 --iterations 8`
  - resultado:
    - `critical_failures=0`
    - `warnings=0`
    - `geo_cadastre_lookup` en modo degradado controlado (`503 provider_error_degraded`) en 8/8 iteraciones
  - evidencia:
    - `.migration-evidence/prod_audit_auth_flags_cp7_soak_boot_20260303T221247Z.log`
    - `.migration-evidence/prod_audit_auth_flags_cp7_soak_boot_20260303T221247Z.json`
    - `.migration-evidence/prod_audit_auth_flags_cp7_soak_boot_20260303T221247Z.md`
  - nota operativa:
    - en esta sesión de ejecución no persisten procesos en background entre comandos; la corrida de 48h debe ejecutarse en host persistente (tmux/CI/runner dedicado).
- Endpoints monitoreados:
  - `/api/health/config`
  - `/api/auth/signup`
  - `/api/auth/signin`
  - `/api/partners/onboarding`
  - `/api/compare`
  - `/api/insights/zones`
  - `/api/geo/cadastre/lookup`
- Comando operativo sugerido para completar ventana:
  - `node scripts/soak-critical-endpoints.mjs --base-url https://directorio-inmobiliarias-deploy-177.vercel.app --interval-seconds 300 --iterations 576 --report .migration-evidence/prod_audit_auth_flags_cp7_soak_48h.json --markdown .migration-evidence/prod_audit_auth_flags_cp7_soak_48h.md`

## Outcome
- Bloqueante de producción corregido: creación de inmobiliaria dejó de fallar por `Auth feature is disabled`.
- Queda habilitado un flujo operativo reproducible para evitar corrupción de env en Vercel.
- Incidente abierto no bloqueante: disponibilidad intermitente del proveedor geocatastral.

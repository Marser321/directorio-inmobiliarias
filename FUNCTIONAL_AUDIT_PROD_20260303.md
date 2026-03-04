# Functional Audit Production - 2026-03-03

- target_env: `production`
- base_url: `https://directorio-inmobiliarias-deploy-177.vercel.app`
- mode: `black-box without login`
- executed_at_utc: `2026-03-04T00:20:32Z` to `2026-03-04T00:24:14Z`
- evidence_prefix: `.migration-evidence/prod_functional_audit_20260304T002032Z_*`

## Executive Summary
- release_status: `READY`
- critical_blockers_p0: `0`
- p1_open_items: `1` (`geo/cadastre provider degraded`)

Resultado general: los contratos críticos de auth/onboarding y endpoints feature-gated se mantuvieron estables. El bug previo de `Auth feature is disabled` no se reprodujo. La única incidencia abierta es degradación controlada de proveedor catastral externo (`provider_error`).

## Checkpoint Results (CP0-CP6)

| Checkpoint | Result | Notes |
|---|---|---|
| CP0 Setup + baseline | PASS | Evidencia HTTP inicial capturada y parseable para health/signup/compare/insights/geo/value-score. |
| CP1 Smoke gate | PASS | `brokenLinks=0`, `brokenImages=0`, `apiFailures=0`. |
| CP2 API contract matrix | PASS | `health=200`, `signup_empty=400`, `compare=400`, `insights=200`, `value-score=400`, `geo=503` con `provider_error` (degradado permitido). |
| CP3 Real signup probe | PASS | Signup real con email único respondió `200` y `requireEmailVerification=true`. |
| CP4 Short soak stability | PASS | `critical_failures=0`, `warnings=0`, estabilidad completa en checks críticos. |
| CP5 Severity classification | PASS | Sin P0; P1 abierto de proveedor geo. |
| CP6 Report + checklist | PASS | Documento y evidencias consolidadas. |

## Final Checklist

- [x] `GET /api/health/config` OK (`200`)
- [x] `health.ok=true`
- [x] `flags.auth=true`
- [x] `envDiagnostics.malformedCount=0`
- [x] `runtime.appUrl` sin saltos `\n`/`\r`
- [x] Signup empty OK (`POST /api/auth/signup` -> `400`, sin `Auth feature is disabled`)
- [x] Signup real OK (`POST /api/auth/signup` -> `200`)
- [x] Compare OK (`GET /api/compare` -> `400` funcional)
- [x] Insights OK (`GET /api/insights/zones` -> `200`)
- [x] Value score OK (`GET /api/agencies/value-score` -> `400` funcional)
- [x] Geo estado degradado controlado (`503` con `provider_error`)
- [x] Smoke OK
- [x] Soak corto OK

## Findings (P0/P1/P2)

### P1
1. **Geo provider degraded (external dependency)**
   - owner: `backend`
   - date_utc: `2026-03-04`
   - endpoint: `/api/geo/cadastre/lookup`
   - evidence: respuesta `503` con `telemetry.provider_status=provider_error`
   - impact: no bloquea release ni auth/onboarding; afecta enriquecimiento catastral.
   - recommended_action: mantener fallback + implementar retry/backoff/circuit-breaker y monitoreo de disponibilidad del proveedor.

### P0
- none.

### P2
- none detectados en esta corrida.

## Evidence

- Meta de ejecución:
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_meta.env`

- CP0 baseline:
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp0_health.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp0_signup_empty.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp0_compare.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp0_insights.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp0_geo.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp0_value_score.txt`

- CP1 smoke:
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp1_smoke.log`

- CP2 matrix:
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_health.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_signup_empty_status.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_signup_empty_body.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_compare_status.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_compare_body.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_insights_status.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_insights_body.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_value_score_status.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_value_score_body.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_geo_status.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp2_geo_body.json`

- CP3 real signup:
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp3_signup_real_status.txt`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp3_signup_real_body.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp3_signup_real_meta.env`

- CP4 soak short:
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp4_soak.log`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp4_soak.json`
  - `.migration-evidence/prod_functional_audit_20260304T002032Z_cp4_soak.md`

## Real Signup Probe Traceability
- email_used: `auditprod+20260304T002032Z@example.com`
- endpoint: `POST /api/auth/signup`
- status: `200`

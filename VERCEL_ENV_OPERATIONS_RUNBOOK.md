# Vercel Env Operations Runbook (No-Corruption)

Fecha: `2026-03-03`

## Objetivo
Evitar corrupción de variables (`"true\\n"`, comillas envolventes, saltos de línea) al cargar entorno en Vercel.

## Reglas obligatorias
1. No cargar flags con comillas envolventes.
2. No incluir `\\n` literal en valores `FEATURE_*`.
3. Ejecutar siempre validación post-carga con `vercel env pull` + checker.
4. Si falla validación, no desplegar.

## Fuente canónica
- Template operativo: `env/profiles/staging.env.runtime`
- Claves válidas para flags: `true|false` (case-insensitive)

## Scripts
- Sync: `npm run vercel:env:sync`
- Validate pull: `npm run vercel:env:validate`

## Flujo recomendado (staging)
1. Linkear carpeta al proyecto staging:
```bash
npx vercel link --project directorio-inmobiliarias --yes --cwd .
```
2. Sync de variables saneadas:
```bash
node scripts/vercel/sync-env.mjs \
  --source env/profiles/staging.env.runtime \
  --cwd . \
  --target production \
  --report .migration-evidence/vercel_env_sync_staging_$(date -u +%Y%m%dT%H%M%SZ).json
```
3. Pull + validación:
```bash
OUT=.migration-evidence/env_snapshots/staging_pull_$(date -u +%Y%m%dT%H%M%SZ).env
npx vercel env pull "$OUT" --environment=production --cwd . --yes
node scripts/vercel/validate-env-file.mjs --file "$OUT" --fail-on-issue
```
4. Deploy:
```bash
npx vercel --prod --yes --cwd .
```
5. Post-check:
```bash
curl -sS https://<staging-domain>/api/health/config
curl -sS -X POST https://<staging-domain>/api/auth/signup -H 'content-type: application/json' -d '{}'
```

## Flujo recomendado (producción)
1. Linkear carpeta al proyecto producción:
```bash
npx vercel link --project directorio-inmobiliarias-deploy-1772569724 --yes --cwd .
```
2. Repetir sync + pull/validate + deploy.
3. Validar endpoints críticos:
- `GET /api/health/config`
- `POST /api/auth/signup`
- `GET /api/compare`
- `GET /api/insights/zones`
- `GET /api/agencies/value-score`

## Rollback operativo
1. Restaurar snapshot env previo.
2. Re-sync con snapshot previo.
3. Redeploy proyecto.
4. Revalidar `health/signup`.

## Soak post-deploy (recomendado)
1. Arranque rápido (2 minutos):
```bash
node scripts/soak-critical-endpoints.mjs \
  --base-url https://directorio-inmobiliarias-deploy-177.vercel.app \
  --interval-seconds 15 \
  --iterations 8
```
2. Ventana completa (48h):
```bash
node scripts/soak-critical-endpoints.mjs \
  --base-url https://directorio-inmobiliarias-deploy-177.vercel.app \
  --interval-seconds 300 \
  --iterations 576 \
  --report .migration-evidence/prod_audit_auth_flags_cp7_soak_48h.json \
  --markdown .migration-evidence/prod_audit_auth_flags_cp7_soak_48h.md
```
Nota: ejecutar en host persistente (`tmux`, runner CI, VM) porque en sesiones efímeras los procesos background no sobreviven al cierre del comando.
3. Criterio de alerta:
- `critical_failures > 0` => incidente P0
- `geo_cadastre_lookup` en `provider_error_degraded` => incidente P1 proveedor (no bloquear auth)

## Incidentes comunes
- `Auth feature is disabled`: revisar `FEATURE_INSFORGE_AUTH` en `health/config` y formato env.
- Flags en `false` inesperado: revisar `envDiagnostics` en `health/config`.
- `validate-env-file` falla por `VERCEL_*`: ejecutar sin `--include-ignored` (comportamiento por defecto).

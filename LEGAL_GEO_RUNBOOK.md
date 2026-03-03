# Legal + Geo Runbook (Uruguay + Maldonado)
Date: `2026-03-03`

## Scope
- Geocatastro lookup puntual (`/api/geo/cadastre/lookup`).
- Guía legal informativa de comisiones (`/legal/comisiones-inmobiliarias`).
- Política comercial por agencia (`/api/partners/agency/commission-profile`).
- Value Score público (`/api/agencies/value-score`).

## Feature Flags
- `FEATURE_GEOCATASTRO_LOOKUP`
- `FEATURE_LEGAL_COMMISSION_GUIDE`
- `FEATURE_AGENCY_VALUE_SCORE`

All default to `false` in env templates.

## Preflight
1. `npm run check:env`
2. `npm run check:env:strict`
3. Validate target backend URL in `.env.local` or profile.

## Functional Checks
1. Cadastre endpoint:
   - `GET /api/geo/cadastre/lookup?address=Punta%20del%20Este&city=Maldonado`
   - Expected: `200` with `{data|null, telemetry}`.
2. Commission profile:
   - `GET /api/partners/agency/commission-profile` (logged owner/admin).
   - `PATCH /api/partners/agency/commission-profile` (owner/admin only).
3. Value score:
   - `GET /api/agencies/value-score?agencyId=<id>&propertyId=<id>`
   - Expected: `200` with score breakdown.
4. Legal guide:
   - Open `/legal/comisiones-inmobiliarias`.
   - Validate source links and `last_reviewed_at`.

## Gate
1. `npm run lint`
2. `npm run build`
3. `npm run test:unit`
4. `npm run test:schema`
5. `npm run test:full`
6. `npm run smoke`

## Incident Rules
- If cadastre provider has sustained errors (`provider_status=provider_error`), keep feature ON only if UI fallback remains stable.
- If score endpoint fails, disable `FEATURE_AGENCY_VALUE_SCORE` and keep agency/profile pages operative.
- If legal source changes, update `data/legal/commission_guides.uy-maldonado.json` with absolute date.

# DB Migration Plan (Live) - Updated 2026-03-03

## Scope
- Keep release-critical DB contracts green for the backend defined in `.env.local`.
- Preserve stop-the-line discipline for SQL block execution.
- Provide a repeatable process for future backends (`local`, `staging`, `prod`) via `.env` profiles.

## Canonical Source of Truth
- Canonical schema: `insforge/schema.sql`.
- Delta migrations for convergence:
  - `supabase/migrations/20260217_schema_convergence_core.sql`
  - `supabase/migrations/20260214_funnel_search_leads.sql`
  - `supabase/migrations/20260215_geojson_coordinate_mirror.sql`
  - `supabase/migrations/20260216_location_centroids_backfill.sql`
  - `supabase/migrations/20260303_buyer_depth_features.sql` (executed on `2026-03-03`, buyer depth)

## Current Status (target backend from `.env.local`)
- Critical migration execution completed on `2026-03-03`.
- Buyer-depth migration execution completed on `2026-03-03`.
- Evidence ledger: `DB_MIGRATION_EXECUTION_LOG_20260303.md`.
- Buyer-depth ledger: `DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md`.
- Contract checks currently green:
  - `npm run test:schema`
  - `npm run test:full`
  - `npm run smoke`

## Release-Critical Contracts
| Contract Object | Expected | Status (`2026-03-03`) |
|---|---|---|
| `properties.location_point_geojson` | Column exists | ✅ |
| `public.vibe_scores` | Table exists | ✅ |
| `public.stripe_webhook_events` | Table exists | ✅ |
| `public.property_leads` | Table exists | ✅ |
| `public.user_funnel_events` | Table exists | ✅ |
| `public.funnel_daily_summary` | View exists | ✅ |
| `public.user_saved_properties` | Table exists | ✅ |
| `public.saved_searches` | Table exists | ✅ |
| `public.search_alert_deliveries` | Table exists | ✅ |

## Operational Rules (mandatory)
1. Before any SQL run, confirm backup + freeze window + target backend profile.
2. Execute SQL by checkpoints (`CP0`, `CP1`, ...).
3. If a critical block fails, stop-the-line and do not continue.
4. Record each checkpoint in a ledger file with mandatory fields (see `DB_MIGRATION_LEDGER_TEMPLATE.md`).
5. Never execute ad-hoc SQL in production without ledger evidence.

## Known Compatibility Note
- In this backend, `public.profiles.id` is `text` while `auth.uid()` resolves as `uuid`.
- Policy clauses comparing these values must cast explicitly (`auth.uid()::text`) to avoid runtime errors.
- This was captured during CP3 execution on `2026-03-03`.

## Remaining DB Backlog (post-critical)
1. Normalize `profiles.id` type strategy across environments (single contract, no ad-hoc casts).
2. Complete location centroid coverage (`locations.center_lat/center_lng`) to reduce partial coordinate backfill.
3. Reconcile any remaining non-critical deltas versus `insforge/schema.sql`.
4. Add periodic schema drift check in CI using `scripts/check-release-schema.ts`.
5. Move buyer-depth tables from structural validation to behavioral validation:
   - validate authenticated writes in `user_saved_properties`
   - validate delivery pipeline in `saved_searches` + `search_alert_deliveries`
   - monitor provider failures (`failed` status) and retry strategy

## Validation Checklist for Any New Backend Profile
- [ ] Confirm `.env` profile points to intended backend.
- [ ] `npm run check:env`
- [ ] `npm run test:schema`
- [ ] `npm run test:full`
- [ ] `npm run smoke`
- [ ] Persist checkpoint ledger with UTC timestamps and evidence paths.

## References
- `DB_MIGRATION_EXECUTION_LOG_20260303.md`
- `DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md`
- `DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md`
- `DB_MIGRATION_LEDGER_TEMPLATE.md`
- `INSFORGE_MCP_SQL_RUNBOOK.md`
- `WORKSPACE_ONBOARDING.md`
- `RELEASE_BASELINE.md`

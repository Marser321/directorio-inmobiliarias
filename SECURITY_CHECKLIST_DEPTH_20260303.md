# Security Checklist - Buyer Depth Block (2026-03-03)

## API hardening
- [x] Rate limit applied to `GET/POST/PATCH/DELETE /api/alerts/saved-search`.
- [x] `POST /api/alerts/run` requires `x-cron-secret`.
- [x] Favorites sync endpoints require authenticated user context.
- [x] Compare endpoint validates id range (2-4) and positive integers.

## Secrets
- [x] Added environment placeholders:
  - `ALERTS_CRON_SECRET`
  - `META_WA_TOKEN`
  - `META_WA_PHONE_NUMBER_ID`
  - `META_WA_API_VERSION`
  - `META_WA_TEMPLATE_NAME`
- [x] `scripts/check-env.mjs` warns/fails when WhatsApp alerts are enabled without required secrets.

## Data integrity
- [x] New delivery table enforces idempotency via unique (`saved_search_id`,`property_id`,`channel`).
- [x] Saved search consent field (`consent_at`) required on creation.

## Operational rules
- [x] Features delivered behind flags:
  - `FEATURE_COMPARE`
  - `FEATURE_FAVORITES_SYNC`
  - `FEATURE_SAVED_SEARCH`
  - `FEATURE_WHATSAPP_ALERTS`
  - `FEATURE_ZONE_INSIGHTS`

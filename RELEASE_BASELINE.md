# Release Baseline (Hardening + Full Product)

## Phase Gates

### Entry Gate (must pass before rollout)
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:full`
- `npm run smoke`
- `npm run test:perf:search`
- `npm run test:schema`

### Restoration Gate (post DB critical migration `2026-03-03`)
- `npm run lint`
- `npm run build`
- `npm run test:full`
- `npm run smoke`
- `npm run test:perf:search`
- `npm run test:schema`

### Exit Gate (must pass at each phase completion)
- Relevant code + test updates merged in feature branch.
- No new `mock` runtime dependencies in production modules.
- No public debug/admin-sensitive endpoints exposed.
- Rollback flags documented and validated.

## Module Status Matrix

| Module | Status | Notes |
|---|---|---|
| Search API v2 | Real | Contract + perf covered by tests and perf script.
| Funnel Events | Real | PII/rate-limit/degraded handling implemented.
| Lead Fallback | Real | Works with table fallback and funnel tracking.
| Partner Property CRUD | Transitional | Canonical media + publication status with compat fallbacks.
| Partner Dashboard | Transitional | Some feature cards still placeholder actions.
| Manager Dashboard | Transitional | Data RPC-driven; mock defaults removed.
| Sniper Dashboard | Transitional | Data-driven + realtime; localhost mock fallback removed.
| Marketing Requests | Transitional | API-driven statuses; no mock fallback list.
| Featured Checkout | Hardened Transitional | Canonical authenticated endpoint + deprecated alias.
| Subscription Checkout | Real | Auth + agency-scope checks in place.
| Service Request Checkout | Real | Auth + agency-scope checks in place.
| Stripe Webhook | Hardened Transitional | Signature + idempotency table + server-only credentials.
| Explore Panel | Transitional | Real property fetch by zone; venues disabled when no source.
| Leaflet Demo Map | Transitional | Real pins from search API; no static pin fixtures.
| Investment Potential | Transitional | Derived metrics from real properties; explicit empty state.
| Demo/Test/Debug Pages | Restricted | Marked `noindex`; excluded from productive crawl policy.

## Backlog Board (Single Source)

### P0 Security
- [ ] Remove public credential dependence in privileged code paths.
- [ ] Block/disable debug endpoints in production.
- [ ] Keep impersonation disabled until supported admin mechanism exists.

### P0 Schema Convergence
- [x] Apply `20260217_schema_convergence_core.sql`.
- [x] Apply `20260214_funnel_search_leads.sql`.
- [x] Validate with `npm run test:schema`.
- [x] Close checkpoint evidence in `DB_MIGRATION_EXECUTION_LOG_20260303.md`.

### P1 API Consolidation
- [ ] Keep canonical auth/onboarding routes.
- [ ] Enforce deprecation windows on legacy aliases.

### P1 Product Data-Driven
- [ ] Remove runtime mocks from manager/sniper/marketing/public search dialog.
- [ ] Ensure explicit empty states where data sources are unavailable.

### P1/P2 SEO + Docs + Ops
- [ ] Align robots/sitemap with runtime domain.
- [ ] Keep demos/debug routes noindex and out of crawl policy.
- [ ] Keep rollout runbook in sync with flags and checks.

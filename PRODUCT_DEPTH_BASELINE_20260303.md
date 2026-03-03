# Product Depth Baseline - 2026-03-03

## Scope
- Window: last 14 days from baseline date.
- Goal: compare conversion impact after enabling `compare`, `favorites sync`, and `saved search + WhatsApp alerts`.

## Source
- Endpoint: `GET /api/manager/funnel/summary?days=14`
- Supporting checks:
  - `npm run test:full`
  - `npm run smoke`

## KPI Set
1. `view_to_whatsapp` conversion.
2. `view_to_lead` conversion.
3. `search_result_clicked / property_viewed`.
4. Return sessions proxy:
   - repeated `session_id` count in `user_funnel_events` within 14d.

## Baseline Snapshot Template
- timestamp_utc:
- period_days: 14
- totals:
  - hero_search_submitted:
  - search_results_loaded:
  - search_result_clicked:
  - property_viewed:
  - whatsapp_clicked:
  - lead_form_submitted:
- conversion:
  - search_to_click:
  - click_to_view:
  - view_to_whatsapp:
  - view_to_lead:

## Notes
- Keep this baseline immutable.
- For post-release comparison, create `PRODUCT_DEPTH_POSTCHECK_YYYYMMDD.md`.

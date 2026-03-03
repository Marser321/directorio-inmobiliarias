# DB Migration Ledger Index

## Window: 2026-03-03
- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- operator: `codex`
- window_start_utc: `2026-03-03T13:37:40Z`
- window_end_utc: `2026-03-03T13:41:20Z`
- backup_reference: `external-prerequisite (operator-managed)`
- source_log: `DB_MIGRATION_EXECUTION_LOG_20260303.md`

## Standardized checkpoint entries

### checkpoint: CP0
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: operational-prep
- result: partial
- timestamp_utc: 2026-03-03T13:37:42Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - freeze/backup verification not automatable from current runner

### checkpoint: CP1
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: baseline-read-only
- result: success
- timestamp_utc: 2026-03-03T13:37:43Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - none

### checkpoint: CP2
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260217_schema_convergence_core.sql
- result: success
- timestamp_utc: 2026-03-03T13:37:44Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - none

### checkpoint: CP3
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260214_funnel_search_leads.sql::B1
- result: success
- timestamp_utc: 2026-03-03T13:37:45Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - policy compatibility cast applied (`auth.uid()::text`) due to `profiles.id` type

### checkpoint: CP4
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260214_funnel_search_leads.sql::B2
- result: success
- timestamp_utc: 2026-03-03T13:37:45Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - none

### checkpoint: CP5
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260215_geojson_coordinate_mirror.sql
- result: success
- timestamp_utc: 2026-03-03T13:37:46Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - none

### checkpoint: CP6
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260216_location_centroids_backfill.sql
- result: success
- timestamp_utc: 2026-03-03T13:37:48Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - partial centroid coverage remains for non-seeded locations

### checkpoint: CP7
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: validation-gate
- result: success
- timestamp_utc: 2026-03-03T13:41:03Z
- evidence_paths:
  - .migration-evidence/cp7_test_schema.log
  - .migration-evidence/cp7_test_full.log
  - .migration-evidence/cp7_smoke.log
  - .migration-evidence/cp7_node20_test_schema.log
  - .migration-evidence/cp7_node20_test_full.log
  - .migration-evidence/cp7_node20_smoke.log
- incidents:
  - none

### checkpoint: CP8
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: rollback-contingency
- result: success
- timestamp_utc: 2026-03-03T13:41:20Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - rollback not required in final run

## Window: 2026-03-03 (Continuity)
- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- operator: `codex`
- window_start_utc: `2026-03-03T14:11:25Z`
- window_end_utc: `2026-03-03T14:14:05Z`
- backup_reference: `external-prerequisite (operator-managed)`
- source_log: `DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md`

### checkpoint: CP0
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: operational-prep + mcp-alignment
- result: partial
- timestamp_utc: 2026-03-03T14:11:26Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
  - .migration-evidence/continuity_mcp_verify.log
- incidents:
  - wrapper-level MCP resource handshake issue in this session; direct MCP RPC operational

### checkpoint: CP1
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: baseline-read-only
- result: success
- timestamp_utc: 2026-03-03T14:11:27Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - none

### checkpoint: CP2
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260217_schema_convergence_core.sql
- result: success
- timestamp_utc: 2026-03-03T14:11:27Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - none

### checkpoint: CP3
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260214_funnel_search_leads.sql::B1
- result: success
- timestamp_utc: 2026-03-03T14:11:28Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - compatibility cast maintained for profile id type mismatch (`auth.uid()::text`)

### checkpoint: CP4
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260214_funnel_search_leads.sql::B2
- result: success
- timestamp_utc: 2026-03-03T14:11:29Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - none

### checkpoint: CP5
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260215_geojson_coordinate_mirror.sql
- result: success
- timestamp_utc: 2026-03-03T14:11:29Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - none

### checkpoint: CP6
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260216_location_centroids_backfill.sql
- result: success
- timestamp_utc: 2026-03-03T14:11:30Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - partial centroid coverage remains in non-seeded locations

### checkpoint: CP7
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: validation-gate + persistence checks
- result: success
- timestamp_utc: 2026-03-03T14:14:05Z
- evidence_paths:
  - .migration-evidence/continuity_test_schema.log
  - .migration-evidence/continuity_test_full.log
  - .migration-evidence/continuity_smoke.log
  - .migration-evidence/continuity_node20_test_schema.log
  - .migration-evidence/continuity_node20_test_full.log
  - .migration-evidence/continuity_node20_smoke.log
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - none

### checkpoint: CP8
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: rollback-contingency
- result: success
- timestamp_utc: 2026-03-03T14:14:05Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_CONTINUITY.md
- incidents:
  - rollback not required in final run

## Window: 2026-03-03 (Buyer Depth Staging)
- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- operator: `codex`
- window_start_utc: `2026-03-03T15:58:53Z`
- window_end_utc: `2026-03-03T16:10:55Z`
- backup_reference: `external-prerequisite (operator-managed)`
- source_log: `DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md`

### checkpoint: CP-S0
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: preflight + mcp-handshake
- result: partial
- timestamp_utc: 2026-03-03T16:05:35Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md
  - .migration-evidence/cps_staging_mcp_sql_20260303.json
- incidents:
  - MCP client handshake failed in runner; direct MCP JSON-RPC path used
  - freeze/backup validation not automatable from this runner

### checkpoint: CP-S1
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: metadata + baseline + select-1
- result: success
- timestamp_utc: 2026-03-03T16:05:36Z
- evidence_paths:
  - .migration-evidence/cps_staging_mcp_sql_20260303.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md
- incidents:
  - none

### checkpoint: CP-S2
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260303_buyer_depth_features.sql
- result: success
- timestamp_utc: 2026-03-03T16:05:37Z
- evidence_paths:
  - .migration-evidence/cps_staging_mcp_sql_20260303.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md
- incidents:
  - none

### checkpoint: CP-S3
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: feature-flag activation
- result: success
- timestamp_utc: 2026-03-03T16:00:00Z
- evidence_paths:
  - .migration-evidence/cpl2_health_flags.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md
- incidents:
  - none

### checkpoint: CP-S4
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: validation-gate + persistence checks
- result: success
- timestamp_utc: 2026-03-03T16:10:00Z
- evidence_paths:
  - .migration-evidence/cps4_test_schema.log
  - .migration-evidence/cps4_test_full.log
  - .migration-evidence/cps4_smoke.log
  - .migration-evidence/cps4_node20_test_schema.log
  - .migration-evidence/cps4_node20_tests.log
  - .migration-evidence/cps4_node20_smoke.log
  - .migration-evidence/cps4_post_validation_sql.json
  - .migration-evidence/cpl2_alerts_run_after_migration_status.txt
  - DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md
- incidents:
  - none

### checkpoint: CP-S5
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: soak-kpi-closeout
- result: partial
- timestamp_utc: 2026-03-03T16:10:55Z
- evidence_paths:
  - DB_MIGRATION_EXECUTION_LOG_20260303_BD_STAGING.md
  - .migration-evidence/cps4_funnel_new_events_counts.json
- incidents:
  - 48h soak pending (follow-up required on 2026-03-05)

## Window: 2026-03-03 (Geo/Legal Score - Commission Profile)
- backend_target: `https://dpxpa3f5.us-east.insforge.app`
- operator: `codex`
- window_start_utc: `2026-03-03T20:15:34Z`
- window_end_utc: `2026-03-03T20:21:48Z`
- backup_reference: `external-prerequisite (operator-managed)`
- source_log: `DB_MIGRATION_EXECUTION_LOG_20260303_GEO_LEGAL_SCORE.md`

### checkpoint: CP0
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: mcp-preflight + auth alignment
- result: partial
- timestamp_utc: 2026-03-03T20:20:16Z
- evidence_paths:
  - .migration-evidence/geo_legal_score_cp_db_apply_20260303.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_GEO_LEGAL_SCORE.md
- incidents:
  - `.env.local` admin key invalid for MCP; used codex MCP configured key
  - `run-raw-sql` argument corrected to `query`

### checkpoint: CP1
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: baseline-read-only
- result: success
- timestamp_utc: 2026-03-03T20:20:17Z
- evidence_paths:
  - .migration-evidence/geo_legal_score_cp_db_apply_20260303.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_GEO_LEGAL_SCORE.md
- incidents:
  - none

### checkpoint: CP2
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260304_agency_commission_profiles.sql
- result: success
- timestamp_utc: 2026-03-03T20:20:17Z
- evidence_paths:
  - .migration-evidence/geo_legal_score_cp_db_apply_20260303.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_GEO_LEGAL_SCORE.md
- incidents:
  - initial attempts rolled back due SQL compatibility (`CREATE POLICY IF NOT EXISTS`) and missing `get_my_agency_id()`; migration adjusted and re-run

### checkpoint: CP3
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: post-objects + policies + columns validation
- result: success
- timestamp_utc: 2026-03-03T20:20:18Z
- evidence_paths:
  - .migration-evidence/geo_legal_score_cp_db_apply_20260303.json
  - DB_MIGRATION_EXECUTION_LOG_20260303_GEO_LEGAL_SCORE.md
- incidents:
  - none

### checkpoint: CP4
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: validation-gate (node current + node20)
- result: success
- timestamp_utc: 2026-03-03T20:21:48Z
- evidence_paths:
  - .migration-evidence/geo_legal_score_db_post_test_schema.log
  - .migration-evidence/geo_legal_score_db_post_test_full.log
  - .migration-evidence/geo_legal_score_db_post_smoke.log
  - .migration-evidence/geo_legal_score_db_post_counts.json
  - .migration-evidence/geo_legal_score_db_post_node20_test_schema.log
  - .migration-evidence/geo_legal_score_db_post_node20_test_full.log
  - .migration-evidence/geo_legal_score_db_post_node20_smoke.log
  - DB_MIGRATION_EXECUTION_LOG_20260303_GEO_LEGAL_SCORE.md
- incidents:
  - none

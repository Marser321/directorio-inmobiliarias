# InsForge MCP + SQL Runbook (Critical Blocks)

## Purpose
Operational guide for safely applying release-critical SQL blocks on InsForge using MCP.

## Target backend default
- `https://dpxpa3f5.us-east.insforge.app`

## 1) MCP installation/re-alignment (Codex)

```bash
npx @insforge/install --client codex \
  --env API_BASE_URL=https://dpxpa3f5.us-east.insforge.app \
  --env API_KEY=<admin-key>
```

Validation:
1. `~/.codex/config.toml` contains target backend URL.
2. MCP handshake works (`initialize` succeeds).
3. `get-backend-metadata` works.
4. `run-raw-sql` works with `select 1`.
5. If wrapper-based MCP discovery fails but direct MCP RPC works, log an incident and continue with direct MCP verification evidence.

Fallback when MCP client handshake fails in the runner:
1. Start MCP server directly via stdio:
   - `API_BASE_URL=<target> API_KEY=<admin> npx -y @insforge/mcp@latest`
2. Use JSON-RPC line-delimited messages (one JSON object per line):
   - `initialize`
   - `notifications/initialized`
   - `tools/call` with `name: "run-raw-sql"` and SQL payload
3. Persist raw request/response evidence in `.migration-evidence/` and log incident as `MCP_CLIENT_HANDSHAKE_FALLBACK`.

## 2) Security prerequisites (mandatory)
1. Deploy/schema freeze active.
2. Logical backup completed with identifier.
3. Change owner and maintenance window documented.
4. Admin key sourced from dashboard/secret manager only.
5. Never use anon key for admin SQL.

## 3) SQL execution order (critical scope)
1. CP1 baseline read-only snapshot.
2. Block A: `20260217_schema_convergence_core.sql`.
3. Block B1: critical section of `20260214_funnel_search_leads.sql`.
4. Block B2: non-blocking helpers/view of `20260214`.
5. Block C: `20260215_geojson_coordinate_mirror.sql`.
6. Block D: `20260216_location_centroids_backfill.sql`.

Execution rules:
- Each block in explicit transaction.
- Validate expected objects immediately after each block.
- On critical block failure: rollback + stop-the-line.
- Do not continue until incident is resolved.

## 4) Known compatibility guard
- If `profiles.id` is `text` and policies compare with `auth.uid()` (`uuid`), cast explicitly:
  - `auth.uid()::text`

## 5) Mandatory post-change validation
Run in order:
1. `npm run test:schema`
2. `npm run test:full`
3. `npm run smoke`

Repeat same gate under Node 20 and Node 24.

## 6) Persistence checks
Confirm:
1. `property_leads_count > 0`
2. `user_funnel_events_count > 0`
3. `funnel_daily_summary_rows >= 1`

## 7) Evidence and ledger format
For each checkpoint, record:
1. `checkpoint`
2. `backend_target`
3. `sql_block`
4. `result`
5. `timestamp_utc`
6. `evidence_paths`
7. `incidents`

Use:
- `DB_MIGRATION_LEDGER_TEMPLATE.md`
- `DB_MIGRATION_LEDGER_INDEX.md`

## 8) Rollback
1. If transaction-open block fails: rollback immediately.
2. If regression appears after partial commits: restore pre-window backup.
3. Re-run minimum validation (`test:schema`, `test:full`, `smoke`) on restored environment.

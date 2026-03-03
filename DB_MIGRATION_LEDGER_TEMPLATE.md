# DB Migration Ledger Template

Use this template for every SQL execution window. The file name must follow:
`DB_MIGRATION_EXECUTION_LOG_YYYYMMDD.md`

## Header
- `backend_target`: full base URL (for example `https://dpxpa3f5.us-east.insforge.app`)
- `operator`: person or bot identity
- `window_start_utc`: ISO-8601 UTC timestamp
- `window_end_utc`: ISO-8601 UTC timestamp
- `change_freeze`: `yes/no`
- `backup_reference`: backup id or ticket

## Mandatory checkpoint entry format

```markdown
### checkpoint: CPX
- backend_target: <url>
- sql_block: <file-or-block-id>
- result: success | partial | failed
- timestamp_utc: <YYYY-MM-DDTHH:MM:SSZ>
- evidence_paths:
  - <path to command output / test log>
  - <path to snapshot query output>
- incidents:
  - none
  - <incident id + summary>
```

## Example

```markdown
### checkpoint: CP3
- backend_target: https://dpxpa3f5.us-east.insforge.app
- sql_block: 20260214_funnel_search_leads.sql::B1
- result: success
- timestamp_utc: 2026-03-03T13:37:45Z
- evidence_paths:
  - .migration-evidence/cp7_test_schema.log
  - DB_MIGRATION_EXECUTION_LOG_20260303.md
- incidents:
  - policy type mismatch resolved via auth.uid()::text cast
```

## Stop-the-line rule
- If `result=failed` on any critical block, do not execute the next block.
- Record rollback action and post-incident state before closing the window.

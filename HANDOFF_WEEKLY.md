# Weekly Handoff Ritual

## Cadence
- Frequency: weekly.
- Recommended day/time: every Tuesday, 30 minutes.
- Participants: frontend, backend, data/ops, QA.

## Minimum output (mandatory)
1. MCP operational status (InsForge)
   - target backend URL
   - handshake status
   - incident notes (if wrapper/direct fallback used)
2. API contract status
   - `POST /api/leads`
   - `POST /api/events/funnel`
   - `GET /api/manager/funnel/summary`
3. Release schema status
   - `npm run test:schema` result
   - DB contract object snapshot
4. Open risks
   - active incidents
   - blocking dependencies
5. Pending decisions
   - owner
   - deadline

## Meeting format
1. Review previous action items (5 min).
2. Validate current gate status (`schema/full/smoke`) (10 min).
3. Discuss high-risk changes and migration windows (10 min).
4. Confirm ownership and dates for next week (5 min).

## Handoff artifact template

```markdown
# Weekly Handoff - YYYY-MM-DD

## API contracts
- /api/leads: <status + notes>
- /api/events/funnel: <status + notes>
- /api/manager/funnel/summary: <status + notes>

## MCP status
- backend: <url>
- handshake: <ok/fail>
- notes: <incidents or fallback mode>

## Release schema
- test:schema: <pass/fail>
- critical objects: <summary>
- migration ledger ref: <file>

## Open risks
- R1: <description> | owner: <name> | eta: <date>

## Pending decisions
- D1: <decision needed> | options: <A/B/...> | owner: <name> | due: <date>

## Action items
- A1: <task> | owner: <name> | due: <date>
```

## Non-negotiables
- Use absolute dates (`YYYY-MM-DD`).
- Link evidence paths for every claim.
- Do not close the handoff if there is an unresolved P0 without owner/date.

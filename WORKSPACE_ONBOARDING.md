# Workspace Onboarding (NPM + .env)

## Goal
New collaborators should run the project and validate core contracts in under 15 minutes.

## Prerequisites
- Node.js `20.x` (recommended for CI) or `24.x` (validated local runtime).
- `npm`.
- Access to backend credentials (public at minimum).

## 1) Install
```bash
npm install
```

## 2) Configure environment
1. Copy canonical template:
```bash
cp .env.example .env.local
```
2. Fill at least:
- `NEXT_PUBLIC_INSFORGE_BASE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Optional for privileged flows (webhook/admin/debug):
- `INSFORGE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` or `INSFORGE_ADMIN_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ALERTS_CRON_SECRET`
- `META_WA_TOKEN`
- `META_WA_PHONE_NUMBER_ID`
- `META_WA_API_VERSION`
- `META_WA_TEMPLATE_NAME`

## 3) Multi-backend profiles
Reference profiles (no secrets):
- `env/profiles/local.env.example`
- `env/profiles/staging.env.example`
- `env/profiles/prod.env.example`

Suggested workflow:
1. Keep one `.env.local` per machine.
2. Use profiles only as templates.
3. Never commit real secrets.

## 4) Environment validation
Run before critical commands:
```bash
npm run check:env
```
- Hard-fails if required public variables are missing.
- Warns if privileged variables are missing.

## 4.1) MCP InsForge validation (operators)
For DB/admin operations via MCP, follow:
- `INSFORGE_MCP_SQL_RUNBOOK.md`

Quick check:
1. `~/.codex/config.toml` must point to the intended backend URL.
2. MCP must execute `get-backend-metadata` and `run-raw-sql (select 1)` successfully.

## 5) Run locally
```bash
npm run dev
```
App should be available at `http://localhost:3000`.

## 6) Validation gate
```bash
npm run test:schema
npm run test:full
npm run smoke
```

## 7) Runtime matrix
```bash
node -v
npx -y -p node@20 node -v
```
Run the same gate under Node 20 and Node 24 before release-critical changes.

## Expected output baseline
- `test:schema` green
- `test:full` green
- `smoke` green with `apiFailures=0`

## Troubleshooting
1. `Missing required public variables`: review `.env.local` and rerun `npm run check:env`.
2. `401` in authenticated endpoints during smoke: expected without active session.
3. DB contract failures: inspect `DB_MIGRATION_PLAN.md` and latest `DB_MIGRATION_EXECUTION_LOG_YYYYMMDD.md`.

# Decisions Log

## 2026-03-03
- Decision: Standardize local collaboration on `NPM + .env` (no Docker mandatory baseline).
- Context: fastest onboarding with existing scripts and minimal infra overhead.
- Impact: every contributor uses the same command gate and env templates.

## 2026-03-03
- Decision: Keep `Runbook + migration ledger` as operational documentation baseline.
- Context: DB convergence required checkpoint evidence and repeatable execution.
- Impact: SQL windows are traceable and handoff-ready.

## 2026-03-03
- Decision: Manage backend targets through `.env` profiles (`local/staging/prod`).
- Context: team may continue backend work in different environments.
- Impact: profile-based switching without code changes.

## 2026-03-03
- Decision: Enforce preflight environment checks on `dev`, `test:schema`, `test:full`, `smoke`.
- Context: missing env variables caused avoidable setup/runtime drift.
- Impact: earlier failure for missing public vars and warnings for privileged vars.

## 2026-03-03
- Decision: Preserve stop-the-line SQL policy for critical migration blocks.
- Context: one failed block can invalidate downstream checkpoints.
- Impact: no partial blind runs; incidents documented before proceeding.

## 2026-03-03
- Decision: Reinstall and realign Codex MCP for InsForge to backend `dpxpa3f5`.
- Context: existing MCP config pointed to `pw66pmf2` and blocked reliable operations.
- Impact: backend metadata and admin SQL operations now target the intended environment.

## 2026-03-03
- Decision: keep direct MCP JSON-RPC fallback for verification when wrapper-level handshake fails.
- Context: `list_mcp_resources` wrapper failed initialize in this session while direct MCP server worked.
- Impact: operations continue with traceable incident logging without blocking migration windows.

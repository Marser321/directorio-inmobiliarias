-- =====================================================
-- MIGRATION: Buyer depth features (favorites + saved search alerts)
-- Date: 2026-03-03
-- Scope: additive, idempotent
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1) Persistent favorites per authenticated user
-- =====================================================
create table if not exists public.user_saved_properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  property_id bigint not null references public.properties(id) on delete cascade,
  unique (user_id, property_id)
);

create index if not exists user_saved_properties_user_idx
  on public.user_saved_properties(user_id, created_at desc);

create index if not exists user_saved_properties_property_idx
  on public.user_saved_properties(property_id);

alter table public.user_saved_properties enable row level security;

drop policy if exists user_saved_properties_select_policy on public.user_saved_properties;
create policy user_saved_properties_select_policy
on public.user_saved_properties
for select
using (user_id = auth.uid()::text);

drop policy if exists user_saved_properties_insert_policy on public.user_saved_properties;
create policy user_saved_properties_insert_policy
on public.user_saved_properties
for insert
with check (user_id = auth.uid()::text);

drop policy if exists user_saved_properties_delete_policy on public.user_saved_properties;
create policy user_saved_properties_delete_policy
on public.user_saved_properties
for delete
using (user_id = auth.uid()::text);

-- =====================================================
-- 2) Saved search subscriptions
-- =====================================================
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  phone_e164 text not null,
  consent_at timestamptz not null,
  is_active boolean not null default true,
  last_run_at timestamptz
);

create index if not exists saved_searches_user_idx
  on public.saved_searches(user_id, created_at desc);

create index if not exists saved_searches_active_idx
  on public.saved_searches(is_active, created_at desc);

alter table public.saved_searches enable row level security;

drop policy if exists saved_searches_select_policy on public.saved_searches;
create policy saved_searches_select_policy
on public.saved_searches
for select
using (user_id = auth.uid()::text);

drop policy if exists saved_searches_insert_policy on public.saved_searches;
create policy saved_searches_insert_policy
on public.saved_searches
for insert
with check (user_id = auth.uid()::text);

drop policy if exists saved_searches_update_policy on public.saved_searches;
create policy saved_searches_update_policy
on public.saved_searches
for update
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists saved_searches_delete_policy on public.saved_searches;
create policy saved_searches_delete_policy
on public.saved_searches
for delete
using (user_id = auth.uid()::text);

-- =====================================================
-- 3) Delivery log for saved search alerts
-- =====================================================
create table if not exists public.search_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  property_id bigint not null references public.properties(id) on delete cascade,
  channel text not null check (channel in ('whatsapp')),
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error_message text,
  unique (saved_search_id, property_id, channel)
);

create index if not exists search_alert_deliveries_saved_idx
  on public.search_alert_deliveries(saved_search_id, created_at desc);

create index if not exists search_alert_deliveries_status_idx
  on public.search_alert_deliveries(status, created_at desc);

alter table public.search_alert_deliveries enable row level security;

drop policy if exists search_alert_deliveries_select_policy on public.search_alert_deliveries;
create policy search_alert_deliveries_select_policy
on public.search_alert_deliveries
for select
using (
  exists (
    select 1
    from public.saved_searches ss
    where ss.id = search_alert_deliveries.saved_search_id
      and ss.user_id = auth.uid()::text
  )
);

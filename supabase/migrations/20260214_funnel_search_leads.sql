-- =====================================================
-- MIGRATION: Funnel events + lead fallback + search v2 helpers
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1) user_funnel_events (first-party anonymous analytics)
-- =====================================================
create table if not exists public.user_funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  event_name text not null,
  page_path text not null,
  property_id bigint references public.properties(id) on delete set null,
  agency_id bigint references public.agencies(id) on delete set null,
  referrer text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists user_funnel_events_created_idx on public.user_funnel_events(created_at desc);
create index if not exists user_funnel_events_event_idx on public.user_funnel_events(event_name);
create index if not exists user_funnel_events_property_idx on public.user_funnel_events(property_id);
create index if not exists user_funnel_events_agency_idx on public.user_funnel_events(agency_id);
create index if not exists user_funnel_events_session_idx on public.user_funnel_events(session_id);

alter table public.user_funnel_events enable row level security;

drop policy if exists user_funnel_events_insert_policy on public.user_funnel_events;
create policy user_funnel_events_insert_policy
on public.user_funnel_events
for insert
with check (true);

drop policy if exists user_funnel_events_select_policy on public.user_funnel_events;
create policy user_funnel_events_select_policy
on public.user_funnel_events
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role::text = 'platform_admin')
  )
);

-- =====================================================
-- 2) property_leads (fallback when WhatsApp is missing)
-- =====================================================
create table if not exists public.property_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  property_id bigint not null references public.properties(id) on delete cascade,
  agency_id bigint references public.agencies(id) on delete set null,
  name text not null,
  phone text,
  email text,
  message text,
  source text not null check (source in ('property_detail', 'search_result')),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'qualified', 'closed'))
);

create index if not exists property_leads_property_idx on public.property_leads(property_id, created_at desc);
create index if not exists property_leads_agency_idx on public.property_leads(agency_id, created_at desc);
create index if not exists property_leads_status_idx on public.property_leads(status);

alter table public.property_leads enable row level security;

drop policy if exists property_leads_insert_policy on public.property_leads;
create policy property_leads_insert_policy
on public.property_leads
for insert
with check (true);

drop policy if exists property_leads_select_policy on public.property_leads;
create policy property_leads_select_policy
on public.property_leads
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role::text = 'platform_admin')
  )
  or exists (
    select 1
    from public.agency_memberships am
    where am.user_id = auth.uid()
      and am.agency_id = property_leads.agency_id
  )
);

-- =====================================================
-- 3) Search helpers (real SQL bounds filtering)
-- Adds location_lat/location_lng mirror columns + trigger when location_point exists
-- =====================================================
do $$
declare
  has_location_point boolean;
  has_location_lat boolean;
  has_location_lng boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'location_point'
  ) into has_location_point;

  if has_location_point then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'properties'
        and column_name = 'location_lat'
    ) into has_location_lat;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'properties'
        and column_name = 'location_lng'
    ) into has_location_lng;

    if not has_location_lat then
      execute 'alter table public.properties add column location_lat double precision';
    end if;

    if not has_location_lng then
      execute 'alter table public.properties add column location_lng double precision';
    end if;

    execute $sql$
      create or replace function public.sync_properties_lat_lng()
      returns trigger
      language plpgsql
      as $fn$
      begin
        if new.location_point is null then
          new.location_lat := null;
          new.location_lng := null;
        else
          new.location_lat := st_y(new.location_point::geometry);
          new.location_lng := st_x(new.location_point::geometry);
        end if;
        return new;
      end;
      $fn$;
    $sql$;

    execute 'drop trigger if exists properties_sync_lat_lng_trigger on public.properties';
    execute '
      create trigger properties_sync_lat_lng_trigger
      before insert or update of location_point
      on public.properties
      for each row
      execute function public.sync_properties_lat_lng()
    ';

    execute '
      update public.properties
      set
        location_lat = case when location_point is null then null else st_y(location_point::geometry) end,
        location_lng = case when location_point is null then null else st_x(location_point::geometry) end
      where true
    ';

    execute 'create index if not exists properties_location_lat_idx on public.properties(location_lat)';
    execute 'create index if not exists properties_location_lng_idx on public.properties(location_lng)';
    execute 'create index if not exists properties_location_lat_lng_idx on public.properties(location_lat, location_lng)';
  end if;
end $$;

create index if not exists properties_featured_boost_idx
  on public.properties(is_featured desc, boost_level desc, created_at desc);

create index if not exists properties_status_created_idx
  on public.properties(status, created_at desc);

-- =====================================================
-- 4) Daily funnel summary view for admin/manager dashboards
-- =====================================================
create or replace view public.funnel_daily_summary as
select
  date_trunc('day', created_at)::date as day,
  coalesce(metadata->>'zone', 'unknown') as zone,
  coalesce(metadata->>'price_band', 'unknown') as price_band,
  count(*) filter (where event_name = 'hero_search_submitted') as hero_search_submitted,
  count(*) filter (where event_name = 'search_results_loaded') as search_results_loaded,
  count(*) filter (where event_name = 'search_result_clicked') as search_result_clicked,
  count(*) filter (where event_name = 'property_viewed') as property_viewed,
  count(*) filter (where event_name = 'whatsapp_clicked') as whatsapp_clicked,
  count(*) filter (where event_name = 'lead_form_submitted') as lead_form_submitted
from public.user_funnel_events
group by 1, 2, 3;

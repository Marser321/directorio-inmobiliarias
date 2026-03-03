-- Buyer depth: agency commission transparency profile
-- Date: 2026-03-04

create extension if not exists pgcrypto;

do $$ begin
  create type public.commission_operation_type as enum ('sale', 'rent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.commission_model as enum ('percent', 'fixed', 'mixed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.commission_verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.agency_commission_profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id bigint not null references public.agencies(id) on delete cascade,
  operation_type public.commission_operation_type not null,
  commission_model public.commission_model not null default 'percent',
  commission_percent numeric(5,2),
  commission_fixed_amount numeric(14,2),
  currency text not null default 'USD',
  additional_fees text,
  notes text,
  verification_status public.commission_verification_status not null default 'unverified',
  evidence_url text,
  is_public boolean not null default true,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, operation_type)
);

create index if not exists agency_commission_profiles_agency_idx
  on public.agency_commission_profiles(agency_id, verification_status, updated_at desc);

create or replace function public.touch_agency_commission_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agency_commission_profiles_updated_at_trigger on public.agency_commission_profiles;
create trigger agency_commission_profiles_updated_at_trigger
before update on public.agency_commission_profiles
for each row
execute function public.touch_agency_commission_profiles_updated_at();

alter table public.agency_commission_profiles enable row level security;

drop policy if exists agency_commission_profiles_public_read_policy on public.agency_commission_profiles;
create policy agency_commission_profiles_public_read_policy
on public.agency_commission_profiles
for select
using (
  is_public = true
  or exists (
    select 1
    from public.agency_memberships m
    where m.agency_id = agency_commission_profiles.agency_id
      and m.user_id::text = auth.uid()::text
  )
  or exists (
    select 1 from public.profiles p
    where p.id::text = auth.uid()::text
      and (p.is_admin = true or p.role = 'platform_admin')
  )
);

drop policy if exists agency_commission_profiles_insert_policy on public.agency_commission_profiles;
create policy agency_commission_profiles_insert_policy
on public.agency_commission_profiles
for insert
with check (
  exists (
    select 1
    from public.agency_memberships m
    where m.agency_id = agency_commission_profiles.agency_id
      and m.user_id::text = auth.uid()::text
      and m.role in ('owner', 'admin', 'agency_admin')
  )
  or exists (
    select 1 from public.profiles p
    where p.id::text = auth.uid()::text
      and (p.is_admin = true or p.role = 'platform_admin')
  )
);

drop policy if exists agency_commission_profiles_update_policy on public.agency_commission_profiles;
create policy agency_commission_profiles_update_policy
on public.agency_commission_profiles
for update
using (
  exists (
    select 1
    from public.agency_memberships m
    where m.agency_id = agency_commission_profiles.agency_id
      and m.user_id::text = auth.uid()::text
      and m.role in ('owner', 'admin', 'agency_admin')
  )
  or exists (
    select 1 from public.profiles p
    where p.id::text = auth.uid()::text
      and (p.is_admin = true or p.role = 'platform_admin')
  )
);

drop policy if exists agency_commission_profiles_delete_policy on public.agency_commission_profiles;
create policy agency_commission_profiles_delete_policy
on public.agency_commission_profiles
for delete
using (
  exists (
    select 1
    from public.agency_memberships m
    where m.agency_id = agency_commission_profiles.agency_id
      and m.user_id::text = auth.uid()::text
      and m.role in ('owner', 'admin', 'agency_admin')
  )
  or exists (
    select 1 from public.profiles p
    where p.id::text = auth.uid()::text
      and (p.is_admin = true or p.role = 'platform_admin')
  )
);

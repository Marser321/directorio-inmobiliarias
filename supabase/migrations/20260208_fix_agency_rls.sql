-- Migration: Fix Agency RLS Policies
-- Date: 2026-02-08
-- Description: Enables RLS on agencies and agency_users tables and adds policies for management.

-- 1. Enable RLS
alter table public.agencies enable row level security;
alter table public.agency_users enable row level security;

-- 2. Policies for 'agencies'
-- Allow public read access to agencies (for profiles)
drop policy if exists "Agencies are viewable by everyone" on public.agencies;
create policy "Agencies are viewable by everyone"
on public.agencies for select
to public
using ( true );

-- Allow authenticated users to create a new agency
drop policy if exists "Authenticated users can insert agencies" on public.agencies;
create policy "Authenticated users can insert agencies"
on public.agencies for insert
to authenticated
with check ( true );

-- Allow users to update their own agency (linked via agency_users)
drop policy if exists "Users can update own agency" on public.agencies;
create policy "Users can update own agency"
on public.agencies for update
to authenticated
using (
  exists (
    select 1 from public.agency_users au
    where au.agency_id = public.agencies.id
    and au.user_id = auth.uid()
  )
);

-- 3. Policies for 'agency_users'
-- Users can see which agencies they belong to
drop policy if exists "Users can view own agency membership" on public.agency_users;
create policy "Users can view own agency membership"
on public.agency_users for select
to authenticated
using ( auth.uid() = user_id );

-- Users can insert their own membership (when creating agency)
drop policy if exists "Users can insert own agency membership" on public.agency_users;
create policy "Users can insert own agency membership"
on public.agency_users for insert
to authenticated
with check ( auth.uid() = user_id );

-- 4. Properties RLS (Just in case)
alter table public.properties enable row level security;

-- Public can view properties
drop policy if exists "Properties are viewable by everyone" on public.properties;
create policy "Properties are viewable by everyone"
on public.properties for select
to public
using ( true );

-- Agency members can insert properties
drop policy if exists "Agency members can insert properties" on public.properties;
create policy "Agency members can insert properties"
on public.properties for insert
to authenticated
with check (
  exists (
    select 1 from public.agency_users au
    where au.agency_id = agency_id
    and au.user_id = auth.uid()
  )
);

-- Agency members can update their properties
drop policy if exists "Agency members can update properties" on public.properties;
create policy "Agency members can update properties"
on public.properties for update
to authenticated
using (
  exists (
    select 1 from public.agency_users au
    where au.agency_id = public.properties.agency_id
    and au.user_id = auth.uid()
  )
);

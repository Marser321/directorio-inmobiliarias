-- Migration: Add is_admin to profiles
-- Date: 2026-02-08
-- Description: Adds is_admin boolean to profiles and updates policies.

-- 1. Add is_admin column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'is_admin') then
    alter table public.profiles add column is_admin boolean default false;
  end if;
end $$;

-- 2. Update Policies to use is_admin
-- Profiles
drop policy if exists "Super Admins can update any profile" on public.profiles;
create policy "Super Admins can update any profile"
  on public.profiles for update
  using ( is_admin = true );

-- Agencies
drop policy if exists "Super Admins can update any agency" on public.agencies;
create policy "Super Admins can update any agency"
  on public.agencies for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Super Admins can delete any agency" on public.agencies;
create policy "Super Admins can delete any agency"
  on public.agencies for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Properties
drop policy if exists "Super Admins can update any property" on public.properties;
create policy "Super Admins can update any property"
  on public.properties for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Super Admins can delete any property" on public.properties;
create policy "Super Admins can delete any property"
  on public.properties for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- 3. Grant access to admin dashboard data
-- (Reuse existing policies or create new ones if needed for specific admin views)

-- ============================================
-- MIGRATION: ADD SUPER ADMIN POLICIES
-- Run this script in your Supabase SQL Editor
-- ============================================

-- 1. Profiles: Super Admins can update any profile
drop policy if exists "Super Admins can update any profile" on public.profiles;
create policy "Super Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Agencies: Super Admins can update/delete any agency
drop policy if exists "Super Admins can update any agency" on public.agencies;
create policy "Super Admins can update any agency"
  on public.agencies for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Super Admins can delete any agency" on public.agencies;
create policy "Super Admins can delete any agency"
  on public.agencies for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Properties: Super Admins can update/delete any property
drop policy if exists "Super Admins can update any property" on public.properties;
create policy "Super Admins can update any property"
  on public.properties for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Super Admins can delete any property" on public.properties;
create policy "Super Admins can delete any property"
  on public.properties for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

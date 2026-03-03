-- Migration: Handle New User (Auth Trigger)
-- Date: 2026-02-07
-- Description: Automatically syncs new users from auth.users to public.profiles and sets up RLS.

-- 1. Create the function that handles the logic
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name', 
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set 
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
    
  return new;
end;
$$;

-- 2. Create the trigger that listens to new user signups
-- Safely drop and recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. RLS Policies for Profiles
-- Ensure RLS is enabled on profiles
alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
drop policy if exists "Users can view own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ( auth.uid() = id );

-- Policy: Users can update their own profile
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ( auth.uid() = id );

-- Optional: Allow public read of basic profile info if needed for public pages (e.g. agents)
-- Uncomment if needed:
-- create policy "Public profiles are viewable by everyone"
-- on public.profiles for select
-- to anon
-- using ( true );

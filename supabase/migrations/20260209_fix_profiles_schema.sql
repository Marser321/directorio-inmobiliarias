-- Migration: Add Email to Profiles
-- Date: 2026-02-09
-- Description: Adds email column to profiles table to support the handle_new_user trigger.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Update the handle_new_user function to be robust
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name', 
    new.raw_user_meta_data ->> 'avatar_url',
    'user' -- Default role
  )
  on conflict (id) do update
  set 
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
    
  return new;
end;
$$;

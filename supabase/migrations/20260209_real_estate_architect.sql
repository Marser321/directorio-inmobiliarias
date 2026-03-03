-- Migration: Real Estate Architect - Roles & Agencies (TYPESAFE FIX)
-- Date: 2026-02-09
-- Description: Implements strict User Roles and Agency Hierarchy with explicit casting.

-- 1. Create User Role Enum
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'agent', 'agency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. DYNAMICALY DROP ALL DEPENDENT POLICIES
-- We use a more robust way to find policies referencing 'role' or 'profiles'
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT p.policyname, p.tablename, p.schemaname
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND (
            p.qual ILIKE '%role%' 
            OR p.qual ILIKE '%profiles%'
            OR p.with_check ILIKE '%role%'
            OR p.with_check ILIKE '%profiles%'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 3. Update Function handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name', 
    new.raw_user_meta_data ->> 'avatar_url',
    'owner'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
    
  RETURN new;
END;
$$;

-- 4. Migrate existing roles logic
UPDATE public.profiles 
SET is_admin = true 
WHERE role::text IN ('admin', 'super_admin');

-- 5. Alter the column type with explicit cast
ALTER TABLE public.profiles 
ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role 
USING (
  CASE 
    WHEN role::text = 'agency' THEN 'agency'::public.user_role
    WHEN role::text = 'agent' THEN 'agent'::public.user_role
    WHEN role::text = 'admin' THEN 'agent'::public.user_role
    WHEN role::text = 'super_admin' THEN 'agent'::public.user_role
    ELSE 'owner'::public.user_role
  END
);

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'owner'::public.user_role;

-- 6. Add agency_id to profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'agency_id') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. RECREATE ESSENTIAL RLS POLICIES (With Explicit Casts)

-- A) Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ( auth.uid() = id );
CREATE POLICY "Super Admins can update any profile" ON public.profiles FOR UPDATE USING ( is_admin = true );

-- B) Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Properties viewable by everyone" ON public.properties FOR SELECT TO public USING ( true );

CREATE POLICY "Owners can update own properties" ON public.properties FOR UPDATE
USING ( owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'owner') );

CREATE POLICY "Agents can update assigned properties" ON public.properties FOR UPDATE
USING ( (agent_id = auth.uid() OR owner_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'agent') );

CREATE POLICY "Agencies can update team properties" ON public.properties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles as p
    WHERE p.id = auth.uid() AND p.role::text = 'agency' AND p.agency_id IS NOT NULL 
    AND EXISTS (SELECT 1 FROM public.profiles as agent WHERE agent.id = public.properties.agent_id AND agent.agency_id = p.agency_id)
  )
);

CREATE POLICY "Super Admins can update any property" ON public.properties FOR UPDATE
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) );

-- C) Prospect & Outreach
ALTER TABLE public.prospect_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized view prospects" ON public.prospect_properties FOR SELECT
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role::text IN ('agent', 'agency') OR is_admin = true)) );

-- D) Scraping Logs
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage scraping logs" ON public.scraping_logs FOR ALL
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) );

-- E) User Searches
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view searches" ON public.user_searches FOR SELECT
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) );

-- 8. Final Constraints
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_agent_id_fkey,
ADD CONSTRAINT properties_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Sync auth users into profiles and unblock admin management flows.

-- 1) Keep public.profiles in sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_admin,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.profile ->> 'name', ''),
      NULLIF(NEW.metadata ->> 'full_name', ''),
      split_part(NEW.email, '@', 1)
    ),
    CASE
      WHEN COALESCE(NEW.is_project_admin, false)
        THEN 'platform_admin'::public.user_role
      ELSE 'owner'::public.user_role
    END,
    COALESCE(NEW.is_project_admin, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    role = CASE
      WHEN EXCLUDED.is_admin THEN 'platform_admin'::public.user_role
      ELSE public.profiles.role
    END,
    is_admin = (public.profiles.is_admin OR EXCLUDED.is_admin),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user()';
  END IF;
END;
$$;

-- 2) Backfill existing users with missing profiles
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_admin,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.profile ->> 'name', ''),
    NULLIF(u.metadata ->> 'full_name', ''),
    split_part(u.email, '@', 1)
  ) AS full_name,
  CASE
    WHEN COALESCE(u.is_project_admin, false)
      THEN 'platform_admin'::public.user_role
    ELSE 'owner'::public.user_role
  END AS role,
  COALESCE(u.is_project_admin, false) AS is_admin,
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Keep existing project admins aligned with profile flags
UPDATE public.profiles p
SET
  is_admin = true,
  role = 'platform_admin'::public.user_role,
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND COALESCE(u.is_project_admin, false) = true;

-- 3) Helper used by RLS policies to avoid recursive profile checks
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO public;

-- 4) Profiles RLS: admins can manage users
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;

CREATE POLICY profiles_select_policy
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR public.is_current_user_admin()
);

CREATE POLICY profiles_insert_policy
ON public.profiles
FOR INSERT
WITH CHECK (
  id = auth.uid()
  OR public.is_current_user_admin()
);

CREATE POLICY profiles_update_policy
ON public.profiles
FOR UPDATE
USING (
  id = auth.uid()
  OR public.is_current_user_admin()
)
WITH CHECK (
  id = auth.uid()
  OR public.is_current_user_admin()
);

-- 5) Membership RLS: admins can assign users to agencies
DROP POLICY IF EXISTS agency_memberships_select_policy ON public.agency_memberships;
DROP POLICY IF EXISTS agency_memberships_insert_policy ON public.agency_memberships;

CREATE POLICY agency_memberships_select_policy
ON public.agency_memberships
FOR SELECT
USING (
  user_id = auth.uid()
  OR agency_id = public.get_my_agency_id()
  OR public.is_current_user_admin()
);

CREATE POLICY agency_memberships_insert_policy
ON public.agency_memberships
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.agency_memberships m
    WHERE m.user_id = auth.uid()
      AND m.agency_id = agency_memberships.agency_id
      AND m.role IN ('owner'::public.membership_role, 'admin'::public.membership_role)
  )
);

-- 6) Property RLS: admins can create/update/delete properties in any agency
DROP POLICY IF EXISTS properties_insert_policy ON public.properties;
DROP POLICY IF EXISTS properties_update_policy ON public.properties;
DROP POLICY IF EXISTS properties_delete_policy ON public.properties;

CREATE POLICY properties_insert_policy
ON public.properties
FOR INSERT
WITH CHECK (
  agency_id = public.get_my_agency_id()
  OR public.is_current_user_admin()
);

CREATE POLICY properties_update_policy
ON public.properties
FOR UPDATE
USING (
  agency_id = public.get_my_agency_id()
  OR public.is_current_user_admin()
)
WITH CHECK (
  agency_id = public.get_my_agency_id()
  OR public.is_current_user_admin()
);

CREATE POLICY properties_delete_policy
ON public.properties
FOR DELETE
USING (
  agency_id = public.get_my_agency_id()
  OR public.is_current_user_admin()
);

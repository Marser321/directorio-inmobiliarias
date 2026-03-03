-- Partner integrity repair (auth/profile/membership/property ownership)
-- Idempotent RPC-style function with dry-run support.

CREATE OR REPLACE FUNCTION public.repair_partner_integrity(
  p_target_owner_email text,
  p_target_agency_slug text DEFAULT 'codex-agency',
  p_apply boolean DEFAULT false,
  p_allow_membership_transfer boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_email text;
  v_target_agency_slug text;

  v_target_owner_id uuid;
  v_target_agency_id bigint;
  v_target_agency_name text;

  v_existing_membership_agency_id bigint;
  v_existing_membership_role public.membership_role;

  v_before_auth_total integer := 0;
  v_before_profiles_total integer := 0;
  v_before_auth_without_profile integer := 0;
  v_before_target_has_profile boolean := false;
  v_before_target_profile_role public.user_role;
  v_before_target_profile_is_admin boolean;
  v_before_target_profile_agency_id bigint;
  v_before_target_agency_members integer := 0;
  v_before_target_agency_owners integer := 0;
  v_before_target_agency_properties integer := 0;
  v_before_target_agency_properties_without_owner integer := 0;
  v_before_agencies_total_properties_mismatch integer := 0;

  v_impact_profiles_backfill integer := 0;
  v_impact_membership_upsert integer := 0;
  v_impact_membership_transfer_required boolean := false;
  v_impact_target_profile_agency_update integer := 0;
  v_impact_owner_backfill integer := 0;
  v_impact_agencies_total_properties_recalc integer := 0;

  v_applied_profiles_backfill integer := 0;
  v_applied_membership_upsert integer := 0;
  v_applied_target_profile_agency_update integer := 0;
  v_applied_owner_backfill integer := 0;
  v_applied_agencies_total_properties_recalc integer := 0;

  v_after_auth_total integer := 0;
  v_after_profiles_total integer := 0;
  v_after_auth_without_profile integer := 0;
  v_after_target_has_profile boolean := false;
  v_after_target_profile_role public.user_role;
  v_after_target_profile_is_admin boolean;
  v_after_target_profile_agency_id bigint;
  v_after_target_membership_agency_id bigint;
  v_after_target_membership_role public.membership_role;
  v_after_target_agency_members integer := 0;
  v_after_target_agency_owners integer := 0;
  v_after_target_agency_properties integer := 0;
  v_after_target_agency_properties_without_owner integer := 0;
  v_after_agencies_total_properties_mismatch integer := 0;
BEGIN
  v_target_email := lower(trim(COALESCE(p_target_owner_email, '')));
  v_target_agency_slug := lower(COALESCE(NULLIF(trim(p_target_agency_slug), ''), 'codex-agency'));

  IF v_target_email = '' THEN
    RAISE EXCEPTION 'p_target_owner_email is required';
  END IF;

  SELECT u.id
  INTO v_target_owner_id
  FROM auth.users AS u
  WHERE lower(COALESCE(u.email, '')) = v_target_email
  LIMIT 1;

  IF v_target_owner_id IS NULL THEN
    RAISE EXCEPTION 'Target owner not found in auth.users for email: %', p_target_owner_email;
  END IF;

  SELECT a.id, a.name
  INTO v_target_agency_id, v_target_agency_name
  FROM public.agencies AS a
  WHERE lower(a.slug) = v_target_agency_slug
  LIMIT 1;

  IF v_target_agency_id IS NULL THEN
    RAISE EXCEPTION 'Target agency not found for slug: %', v_target_agency_slug;
  END IF;

  SELECT m.agency_id, m.role
  INTO v_existing_membership_agency_id, v_existing_membership_role
  FROM public.agency_memberships AS m
  WHERE m.user_id = v_target_owner_id
  LIMIT 1;

  v_impact_membership_transfer_required :=
    v_existing_membership_agency_id IS NOT NULL
    AND v_existing_membership_agency_id <> v_target_agency_id;

  IF v_impact_membership_transfer_required AND NOT p_allow_membership_transfer THEN
    RAISE EXCEPTION
      'Target user already has membership in another agency (agency_id=%). Set p_allow_membership_transfer=true to move membership.',
      v_existing_membership_agency_id;
  END IF;

  SELECT COUNT(*)::int INTO v_before_auth_total
  FROM auth.users;

  SELECT COUNT(*)::int INTO v_before_profiles_total
  FROM public.profiles;

  SELECT COUNT(*)::int INTO v_before_auth_without_profile
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  SELECT p.role, p.is_admin, p.agency_id
  INTO v_before_target_profile_role, v_before_target_profile_is_admin, v_before_target_profile_agency_id
  FROM public.profiles p
  WHERE p.id = v_target_owner_id;

  v_before_target_has_profile := FOUND;

  SELECT COUNT(*)::int INTO v_before_target_agency_members
  FROM public.agency_memberships
  WHERE agency_id = v_target_agency_id;

  SELECT COUNT(*)::int INTO v_before_target_agency_owners
  FROM public.agency_memberships
  WHERE agency_id = v_target_agency_id
    AND role = 'owner'::public.membership_role;

  SELECT COUNT(*)::int INTO v_before_target_agency_properties
  FROM public.properties
  WHERE agency_id = v_target_agency_id;

  SELECT COUNT(*)::int INTO v_before_target_agency_properties_without_owner
  FROM public.properties
  WHERE agency_id = v_target_agency_id
    AND owner_id IS NULL;

  SELECT COUNT(*)::int INTO v_before_agencies_total_properties_mismatch
  FROM (
    SELECT a.id
    FROM public.agencies a
    LEFT JOIN (
      SELECT p.agency_id, COUNT(*)::int AS total_properties
      FROM public.properties p
      GROUP BY p.agency_id
    ) totals ON totals.agency_id = a.id
    WHERE a.total_properties IS DISTINCT FROM COALESCE(totals.total_properties, 0)
  ) mismatch;

  SELECT COUNT(*)::int INTO v_impact_profiles_backfill
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  IF v_existing_membership_agency_id IS NULL
    OR v_existing_membership_agency_id <> v_target_agency_id
    OR v_existing_membership_role IS DISTINCT FROM 'owner'::public.membership_role
  THEN
    v_impact_membership_upsert := 1;
  END IF;

  IF (NOT v_before_target_has_profile) OR (v_before_target_profile_agency_id IS DISTINCT FROM v_target_agency_id) THEN
    v_impact_target_profile_agency_update := 1;
  END IF;

  SELECT COUNT(*)::int INTO v_impact_owner_backfill
  FROM public.properties
  WHERE agency_id = v_target_agency_id
    AND owner_id IS NULL;

  SELECT COUNT(*)::int INTO v_impact_agencies_total_properties_recalc
  FROM (
    SELECT a.id
    FROM public.agencies a
    LEFT JOIN (
      SELECT p.agency_id, COUNT(*)::int AS total_properties
      FROM public.properties p
      GROUP BY p.agency_id
    ) totals ON totals.agency_id = a.id
    WHERE a.total_properties IS DISTINCT FROM COALESCE(totals.total_properties, 0)
  ) mismatch;

  IF p_apply THEN
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
        split_part(COALESCE(u.email, u.id::text), '@', 1)
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
    ON CONFLICT (id) DO UPDATE
      SET email = COALESCE(public.profiles.email, EXCLUDED.email),
          full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
          role = COALESCE(public.profiles.role, EXCLUDED.role),
          is_admin = COALESCE(public.profiles.is_admin, false) OR EXCLUDED.is_admin,
          updated_at = NOW()
      WHERE public.profiles.email IS NULL
         OR public.profiles.full_name IS NULL
         OR public.profiles.role IS NULL
         OR public.profiles.is_admin IS NULL
         OR (EXCLUDED.is_admin = true AND public.profiles.is_admin = false);

    GET DIAGNOSTICS v_applied_profiles_backfill = ROW_COUNT;

    INSERT INTO public.agency_memberships (
      agency_id,
      user_id,
      role
    )
    VALUES (
      v_target_agency_id,
      v_target_owner_id,
      'owner'::public.membership_role
    )
    ON CONFLICT (user_id) DO UPDATE
      SET agency_id = EXCLUDED.agency_id,
          role = 'owner'::public.membership_role
      WHERE public.agency_memberships.agency_id IS DISTINCT FROM EXCLUDED.agency_id
         OR public.agency_memberships.role IS DISTINCT FROM 'owner'::public.membership_role;

    GET DIAGNOSTICS v_applied_membership_upsert = ROW_COUNT;

    UPDATE public.profiles
    SET
      agency_id = v_target_agency_id,
      role = COALESCE(role, 'owner'::public.user_role),
      is_admin = COALESCE(is_admin, false),
      updated_at = NOW()
    WHERE id = v_target_owner_id
      AND (
        agency_id IS DISTINCT FROM v_target_agency_id
        OR role IS NULL
        OR is_admin IS NULL
      );

    GET DIAGNOSTICS v_applied_target_profile_agency_update = ROW_COUNT;

    UPDATE public.properties
    SET
      owner_id = v_target_owner_id,
      updated_at = NOW()
    WHERE agency_id = v_target_agency_id
      AND owner_id IS NULL;

    GET DIAGNOSTICS v_applied_owner_backfill = ROW_COUNT;

    UPDATE public.agencies a
    SET
      total_properties = totals.total_properties,
      updated_at = NOW()
    FROM (
      SELECT
        a2.id,
        COUNT(p.id)::int AS total_properties
      FROM public.agencies a2
      LEFT JOIN public.properties p ON p.agency_id = a2.id
      GROUP BY a2.id
    ) totals
    WHERE a.id = totals.id
      AND a.total_properties IS DISTINCT FROM totals.total_properties;

    GET DIAGNOSTICS v_applied_agencies_total_properties_recalc = ROW_COUNT;
  END IF;

  SELECT COUNT(*)::int INTO v_after_auth_total
  FROM auth.users;

  SELECT COUNT(*)::int INTO v_after_profiles_total
  FROM public.profiles;

  SELECT COUNT(*)::int INTO v_after_auth_without_profile
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  SELECT p.role, p.is_admin, p.agency_id
  INTO v_after_target_profile_role, v_after_target_profile_is_admin, v_after_target_profile_agency_id
  FROM public.profiles p
  WHERE p.id = v_target_owner_id;

  v_after_target_has_profile := FOUND;

  SELECT m.agency_id, m.role
  INTO v_after_target_membership_agency_id, v_after_target_membership_role
  FROM public.agency_memberships m
  WHERE m.user_id = v_target_owner_id
  LIMIT 1;

  SELECT COUNT(*)::int INTO v_after_target_agency_members
  FROM public.agency_memberships
  WHERE agency_id = v_target_agency_id;

  SELECT COUNT(*)::int INTO v_after_target_agency_owners
  FROM public.agency_memberships
  WHERE agency_id = v_target_agency_id
    AND role = 'owner'::public.membership_role;

  SELECT COUNT(*)::int INTO v_after_target_agency_properties
  FROM public.properties
  WHERE agency_id = v_target_agency_id;

  SELECT COUNT(*)::int INTO v_after_target_agency_properties_without_owner
  FROM public.properties
  WHERE agency_id = v_target_agency_id
    AND owner_id IS NULL;

  SELECT COUNT(*)::int INTO v_after_agencies_total_properties_mismatch
  FROM (
    SELECT a.id
    FROM public.agencies a
    LEFT JOIN (
      SELECT p.agency_id, COUNT(*)::int AS total_properties
      FROM public.properties p
      GROUP BY p.agency_id
    ) totals ON totals.agency_id = a.id
    WHERE a.total_properties IS DISTINCT FROM COALESCE(totals.total_properties, 0)
  ) mismatch;

  RETURN jsonb_build_object(
    'mode', CASE WHEN p_apply THEN 'apply' ELSE 'dry-run' END,
    'target', jsonb_build_object(
      'ownerEmail', v_target_email,
      'ownerId', v_target_owner_id,
      'agencySlug', v_target_agency_slug,
      'agencyId', v_target_agency_id,
      'agencyName', v_target_agency_name,
      'allowMembershipTransfer', p_allow_membership_transfer
    ),
    'before', jsonb_build_object(
      'authUsers', v_before_auth_total,
      'profiles', v_before_profiles_total,
      'authWithoutProfile', v_before_auth_without_profile,
      'targetHasProfile', v_before_target_has_profile,
      'targetProfileRole', v_before_target_profile_role,
      'targetProfileIsAdmin', v_before_target_profile_is_admin,
      'targetProfileAgencyId', v_before_target_profile_agency_id,
      'targetMembershipAgencyId', v_existing_membership_agency_id,
      'targetMembershipRole', v_existing_membership_role,
      'targetAgencyMemberships', v_before_target_agency_members,
      'targetAgencyOwners', v_before_target_agency_owners,
      'targetAgencyProperties', v_before_target_agency_properties,
      'targetAgencyPropertiesWithoutOwner', v_before_target_agency_properties_without_owner,
      'agenciesWithTotalPropertiesMismatch', v_before_agencies_total_properties_mismatch
    ),
    'impact', jsonb_build_object(
      'profilesBackfill', v_impact_profiles_backfill,
      'membershipUpsert', v_impact_membership_upsert,
      'membershipTransferRequired', v_impact_membership_transfer_required,
      'targetProfileAgencyUpdate', v_impact_target_profile_agency_update,
      'targetAgencyOwnerBackfill', v_impact_owner_backfill,
      'agenciesTotalPropertiesRecalc', v_impact_agencies_total_properties_recalc
    ),
    'applied', jsonb_build_object(
      'profilesBackfill', v_applied_profiles_backfill,
      'membershipUpsert', v_applied_membership_upsert,
      'targetProfileAgencyUpdate', v_applied_target_profile_agency_update,
      'targetAgencyOwnerBackfill', v_applied_owner_backfill,
      'agenciesTotalPropertiesRecalc', v_applied_agencies_total_properties_recalc
    ),
    'after', jsonb_build_object(
      'authUsers', v_after_auth_total,
      'profiles', v_after_profiles_total,
      'authWithoutProfile', v_after_auth_without_profile,
      'targetHasProfile', v_after_target_has_profile,
      'targetProfileRole', v_after_target_profile_role,
      'targetProfileIsAdmin', v_after_target_profile_is_admin,
      'targetProfileAgencyId', v_after_target_profile_agency_id,
      'targetMembershipAgencyId', v_after_target_membership_agency_id,
      'targetMembershipRole', v_after_target_membership_role,
      'targetAgencyMemberships', v_after_target_agency_members,
      'targetAgencyOwners', v_after_target_agency_owners,
      'targetAgencyProperties', v_after_target_agency_properties,
      'targetAgencyPropertiesWithoutOwner', v_after_target_agency_properties_without_owner,
      'agenciesWithTotalPropertiesMismatch', v_after_agencies_total_properties_mismatch
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.repair_partner_integrity(text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_partner_integrity(text, text, boolean, boolean) TO project_admin;

COMMENT ON FUNCTION public.repair_partner_integrity(text, text, boolean, boolean)
IS 'Repairs partner integrity between auth.users, profiles, agency_memberships and properties with dry-run/apply modes.';

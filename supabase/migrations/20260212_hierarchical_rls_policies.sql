-- =====================================================
-- MIGRATION: Hierarchical RLS Policies for Agencies
-- Purpose: Implement agency hierarchy with admin control
-- =====================================================

-- =====================================================
-- STEP 1: Helper Function for Agency Role Lookup
-- Optimizes performance by caching user agency info
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_agency_role()
RETURNS TABLE(agency_id BIGINT, role TEXT) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        p.agency_id,
        p.role::TEXT
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_agency_role() TO authenticated;

-- =====================================================
-- STEP 2: Ensure role column supports agency_admin
-- Update the ENUM to include 'agency_admin' if needed
-- =====================================================

DO $$
BEGIN
    -- Check if 'agency_admin' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'agency_admin' 
        AND enumtypid = 'public.user_role'::regtype
    ) THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agency_admin';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Policy - "Agency Admins can view team members"
-- Allows agency admins to see all profiles in their agency
-- =====================================================

-- Drop existing conflicting policy if any
DROP POLICY IF EXISTS "Agency Admins can view team members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- Create comprehensive SELECT policy for profiles
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
    -- Case 1: User can always see their own profile
    id = auth.uid()
    OR
    -- Case 2: Agency admins can see all members of their agency
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.role = 'agency_admin'
        AND mar.agency_id = profiles.agency_id
    )
    OR
    -- Case 3: Agents in same agency can see each other (optional)
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.agency_id = profiles.agency_id
        AND mar.agency_id IS NOT NULL
    )
);

-- =====================================================
-- STEP 4: Policy - "Agency controls all inventory"
-- Agency admins can UPDATE/DELETE any property in their agency
-- =====================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Agency controls all inventory" ON public.properties;
DROP POLICY IF EXISTS "Agents can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their properties" ON public.properties;

-- UPDATE Policy: Control over agency inventory
CREATE POLICY "properties_update_policy"
ON public.properties
FOR UPDATE
USING (
    -- Case 1: I am the direct owner or assigned agent
    auth.uid() = owner_id 
    OR auth.uid() = agent_id
    OR
    -- Case 2: I am an agency_admin for the property's agency
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.role = 'agency_admin'
        AND mar.agency_id = properties.agency_id
    )
);

-- DELETE Policy: Same as update
CREATE POLICY "properties_delete_policy"
ON public.properties
FOR DELETE
USING (
    -- Case 1: I am the direct owner or assigned agent
    auth.uid() = owner_id 
    OR auth.uid() = agent_id
    OR
    -- Case 2: I am an agency_admin for the property's agency
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.role = 'agency_admin'
        AND mar.agency_id = properties.agency_id
    )
);

-- SELECT Policy: Anyone can view active properties
DROP POLICY IF EXISTS "Public can view properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;

CREATE POLICY "properties_select_policy"
ON public.properties
FOR SELECT
USING (
    -- Public properties are visible to everyone
    status IN ('for_sale', 'for_rent', 'sold', 'rented')
    OR
    -- Owners/agents can always see their own
    auth.uid() = owner_id 
    OR auth.uid() = agent_id
    OR
    -- Agency admins can see all their agency's properties
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.role = 'agency_admin'
        AND mar.agency_id = properties.agency_id
    )
);

-- INSERT Policy: Authenticated users can create properties
DROP POLICY IF EXISTS "Authenticated users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert properties" ON public.properties;

CREATE POLICY "properties_insert_policy"
ON public.properties
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        -- Either creating for myself
        auth.uid() = owner_id
        OR auth.uid() = agent_id
        OR
        -- Or I'm an agency admin creating for my agency
        EXISTS (
            SELECT 1 FROM public.get_my_agency_role() mar
            WHERE mar.role IN ('agency_admin', 'agent')
            AND (
                mar.agency_id = agency_id
                OR agency_id IS NULL
            )
        )
    )
);

-- =====================================================
-- STEP 5: Policy - "Agency can create/manage agents"
-- Agency admins can INSERT/UPDATE profiles within their agency
-- =====================================================

DROP POLICY IF EXISTS "Agency can create agents" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- UPDATE Policy for profiles
CREATE POLICY "profiles_update_policy"  
ON public.profiles
FOR UPDATE
USING (
    -- User can update their own profile
    id = auth.uid()
    OR
    -- Agency admin can update agents in their agency
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.role = 'agency_admin'
        AND mar.agency_id = profiles.agency_id
    )
);

-- INSERT Policy for profiles (mainly for trigger-created profiles)
-- @Jules: Consider if agency admins should be able to create new profiles directly
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (
    -- User creating their own profile (from trigger)
    id = auth.uid()
    OR
    -- Agency admin inviting someone to their agency
    EXISTS (
        SELECT 1 FROM public.get_my_agency_role() mar
        WHERE mar.role = 'agency_admin'
        AND mar.agency_id = NEW.agency_id
    )
);

-- =====================================================
-- STEP 6: Update property_images policies
-- Align with the new hierarchical model
-- =====================================================

DROP POLICY IF EXISTS "Property owners can add images" ON public.property_images;
DROP POLICY IF EXISTS "Property owners can update images" ON public.property_images;
DROP POLICY IF EXISTS "Property owners can delete images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;

-- SELECT: Public view for property images
CREATE POLICY "property_images_select_policy"
ON public.property_images
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
    )
);

-- INSERT: Property owners/agents can add images
CREATE POLICY "property_images_insert_policy"
ON public.property_images
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (
            p.owner_id = auth.uid() 
            OR p.agent_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.get_my_agency_role() mar
                WHERE mar.role = 'agency_admin'
                AND mar.agency_id = p.agency_id
            )
        )
    )
);

-- UPDATE: Property owners/agents can update images
CREATE POLICY "property_images_update_policy"
ON public.property_images
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (
            p.owner_id = auth.uid() 
            OR p.agent_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.get_my_agency_role() mar
                WHERE mar.role = 'agency_admin'
                AND mar.agency_id = p.agency_id
            )
        )
    )
);

-- DELETE: Property owners/agents can delete images
CREATE POLICY "property_images_delete_policy"
ON public.property_images
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (
            p.owner_id = auth.uid() 
            OR p.agent_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.get_my_agency_role() mar
                WHERE mar.role = 'agency_admin'
                AND mar.agency_id = p.agency_id
            )
        )
    )
);

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
-- To verify these policies work:
-- 1. Log in as an agency_admin user
-- 2. Run: SELECT * FROM profiles WHERE agency_id = YOUR_AGENCY_ID;
--    (Should return all team members)
-- 3. Run: SELECT * FROM properties WHERE agency_id = YOUR_AGENCY_ID;
--    (Should return all agency properties)
-- 4. Log in as a regular agent
-- 5. Try: SELECT * FROM profiles;
--    (Should only return same-agency colleagues)

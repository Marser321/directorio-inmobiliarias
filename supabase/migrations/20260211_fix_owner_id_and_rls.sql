-- Migration: Fix Owner ID and Property Images RLS
-- Date: 2026-02-11
-- Description: Adds owner_id to properties, fixes agency_id type, and corrects RLS policies

-- ============================================
-- 1. ADD OWNER_ID TO PROPERTIES
-- ============================================
-- This allows properties to be owned by individuals (particulares) without requiring an agency

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);

-- ============================================
-- 2. FIX PROFILES.AGENCY_ID TYPE
-- ============================================
-- The agency_id was defined as UUID but agencies.id is BIGINT
-- We need to fix this mismatch

-- First, check if the column exists and is UUID type
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'agency_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop the column and recreate with correct type
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS agency_id;
        ALTER TABLE public.profiles ADD COLUMN agency_id BIGINT REFERENCES public.agencies(id) ON DELETE SET NULL;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'agency_id'
    ) THEN
        -- Column doesn't exist at all, create it
        ALTER TABLE public.profiles ADD COLUMN agency_id BIGINT REFERENCES public.agencies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for agency lookups
CREATE INDEX IF NOT EXISTS profiles_agency_id_idx ON public.profiles(agency_id);

-- ============================================
-- 3. DROP BROKEN RLS POLICIES ON PROPERTY_IMAGES
-- ============================================

DROP POLICY IF EXISTS "Owners manage own images" ON public.property_images;
DROP POLICY IF EXISTS "Agents manage assigned images" ON public.property_images;
DROP POLICY IF EXISTS "Agencies manage team images" ON public.property_images;
DROP POLICY IF EXISTS "Admins manage all images" ON public.property_images;

-- ============================================
-- 4. RECREATE CORRECT RLS POLICIES
-- ============================================

-- VIEW: Everyone can see published property images
CREATE POLICY "Images viewable by everyone" 
ON public.property_images FOR SELECT 
TO public 
USING (true);

-- INSERT: Property owner or assigned agent can add images
CREATE POLICY "Property owners can add images"
ON public.property_images FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (
            p.owner_id = auth.uid()
            OR p.agent_id = auth.uid()
        )
    )
);

-- UPDATE: Property owner or assigned agent can update images
CREATE POLICY "Property owners can update images"
ON public.property_images FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (
            p.owner_id = auth.uid()
            OR p.agent_id = auth.uid()
        )
    )
);

-- DELETE: Property owner or assigned agent can delete images
CREATE POLICY "Property owners can delete images"
ON public.property_images FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (
            p.owner_id = auth.uid()
            OR p.agent_id = auth.uid()
        )
    )
);

-- Agency members can manage images for properties in their agency
CREATE POLICY "Agency members can manage images"
ON public.property_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.agency_users au ON au.agency_id = p.agency_id
        WHERE p.id = property_images.property_id
        AND au.user_id = auth.uid()
    )
);

-- Super Admins can manage all images
CREATE POLICY "Admins can manage all images"
ON public.property_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);

-- ============================================
-- 5. UPDATE PROPERTIES RLS TO INCLUDE OWNER
-- ============================================

-- Drop existing owner-related policies if any
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can insert own properties" ON public.properties;

-- Owners can insert their own properties
CREATE POLICY "Owners can insert properties"
ON public.properties FOR INSERT
WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.agency_users
        WHERE agency_users.agency_id = properties.agency_id
        AND agency_users.user_id = auth.uid()
    )
);

-- Owners can update their own properties
CREATE POLICY "Owners can update own properties"
ON public.properties FOR UPDATE
USING (
    owner_id = auth.uid()
);

-- Owners can delete their own properties  
CREATE POLICY "Owners can delete own properties"
ON public.properties FOR DELETE
USING (
    owner_id = auth.uid()
);

-- ============================================
-- 6. HELPER FUNCTION: Get User Role
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- ============================================
-- 7. COMMENT FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.properties.owner_id IS 'UUID del propietario particular (puede ser NULL si es propiedad de agencia)';
COMMENT ON COLUMN public.profiles.agency_id IS 'ID de la agencia a la que pertenece el agente (NULL para particulares)';

-- Migration: High-End Properties & Multi-Image System
-- Date: 2026-02-10
-- Description: Adds virtual tours, video, location (PostGIS), and separate property images table.

-- 1. Enable PostGIS for advanced location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Update properties table with luxury fields
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS virtual_tour_url text, -- Matterport, etc.
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3. Create property_images table (One-to-Many)
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id bigint REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    url text NOT NULL,
    display_order int DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    caption text
);

-- Index for faster retrieval
CREATE INDEX IF NOT EXISTS property_images_property_id_idx ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS property_images_order_idx ON public.property_images(property_id, display_order);

-- 4. Enable RLS on property_images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for property_images

-- VIEW: Everyone can see images
CREATE POLICY "Images viewable by everyone" 
ON public.property_images FOR SELECT 
TO public 
USING ( true );

-- MANAGE: Owners can manage their own property images
CREATE POLICY "Owners manage own images"
ON public.property_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND p.owner_id = auth.uid()
    )
);

-- MANAGE: Agents can manage images for assigned properties
CREATE POLICY "Agents manage assigned images"
ON public.property_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_images.property_id
        AND (p.agent_id = auth.uid() OR p.owner_id = auth.uid()) -- Agents might be "owners" in system logic sometimes
    )
);

-- MANAGE: Agencies can manage images for team properties
CREATE POLICY "Agencies manage team images"
ON public.property_images FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.profiles agent ON p.agent_id = agent.id
        JOIN public.profiles me ON me.id = auth.uid()
        WHERE p.id = property_images.property_id
        AND me.role = 'agency'
        AND me.agency_id = agent.agency_id
    )
);

-- MANAGE: Admins can manage all images
CREATE POLICY "Admins manage all images"
ON public.property_images FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 6. DROP 'main_image' from properties (Breaking Change for Phase 2 readiness)
-- NOTE: We will keep it for now as NULLABLE/DEPRECATED to avoid immediate crash, 
-- but we will stop writing to it in new logic.
-- The user prompt said: "Elimina el campo image_url único".
-- To be safe, we will drop it, as requested strictly.
ALTER TABLE public.properties DROP COLUMN IF EXISTS main_image;

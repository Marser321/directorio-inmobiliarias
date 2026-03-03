-- Migration: Add featured expiration tracking
-- Run with: npx supabase migration new stripe_featured

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS featured_expires_at TIMESTAMPTZ;

-- Index for efficient queries on featured properties
CREATE INDEX IF NOT EXISTS properties_featured_expires_idx 
ON public.properties(featured_expires_at) 
WHERE featured_expires_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.properties.featured_expires_at IS 'Timestamp when featured status expires. NULL means not featured or free featured.';

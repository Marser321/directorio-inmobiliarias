-- Migration: Add fields for Scraper Workflows
-- Date: 2026-02-06
-- Description: Adds ahorro_estimado and owner_social_url to prospect_properties

-- 1. Add new columns
ALTER TABLE public.prospect_properties 
ADD COLUMN IF NOT EXISTS ahorro_estimado numeric,
ADD COLUMN IF NOT EXISTS owner_social_url text;

-- 2. Add comments
COMMENT ON COLUMN public.prospect_properties.ahorro_estimado IS 'Estimated savings in commissions if listing directly (for messaging)';
COMMENT ON COLUMN public.prospect_properties.owner_social_url IS 'URL to owner social profile (Instagram/Facebook) found via scraping';

-- 3. Update view if exists (optional, but good practice if specific views rely on select *)
-- No strict need to recreate views unless they explicitly exclude new columns or we want them there.
-- public.fsbo_rental_summary is an aggregate view, so it is fine.

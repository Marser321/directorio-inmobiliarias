-- Migration: Enhance agencies table with rich profile data
-- Adds social links, business hours, specialties, and media

-- Social links as JSONB (instagram, facebook, linkedin, youtube, tiktok)
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Business hours as JSONB 
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}'::jsonb;

-- Specialties/Tags (luxury, beachfront, golf, etc)
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}';

-- Cover/banner image
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Gallery images array
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';

-- Year established
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS year_established int;

-- Languages spoken
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{Spanish}';

-- Certifications/Badges
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}';

-- Short tagline
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS tagline text;

-- SEO metadata
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS meta_description text;

-- Featured until date (for premium placement)
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS featured_until timestamp with time zone;

-- Average response time (hours)
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS avg_response_time int;

-- Add updated_at timestamp
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_agencies_timestamp ON public.agencies;
CREATE TRIGGER set_agencies_timestamp
    BEFORE UPDATE ON public.agencies
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

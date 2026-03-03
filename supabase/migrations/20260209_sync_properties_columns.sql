-- Migration: Ensure all columns from schema.sql exist in properties table
-- This adds any missing columns that might be out of sync

-- Add main_image if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'properties' 
                   AND column_name = 'main_image') THEN
        ALTER TABLE public.properties ADD COLUMN main_image text;
    END IF;
END $$;

-- Add images array if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'properties' 
                   AND column_name = 'images') THEN
        ALTER TABLE public.properties ADD COLUMN images text[];
    END IF;
END $$;

-- Add location_id if missing (should exist, but for safety)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'properties' 
                   AND column_name = 'location_id') THEN
        ALTER TABLE public.properties ADD COLUMN location_id bigint references public.locations(id);
    END IF;
END $$;

-- Add bedrooms/bathrooms/built_area if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'properties' 
                   AND column_name = 'bedrooms') THEN
        ALTER TABLE public.properties ADD COLUMN bedrooms int;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'properties' 
                   AND column_name = 'bathrooms') THEN
        ALTER TABLE public.properties ADD COLUMN bathrooms int;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'properties' 
                   AND column_name = 'built_area') THEN
        ALTER TABLE public.properties ADD COLUMN built_area numeric;
    END IF;
END $$;

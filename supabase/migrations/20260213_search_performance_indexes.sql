-- =====================================================
-- MIGRATION: Search Performance Indexes
-- Purpose: Optimize filtering queries for fast UX
-- =====================================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- B-Tree indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_bathrooms ON public.properties(bathrooms);
CREATE INDEX IF NOT EXISTS idx_properties_built_area ON public.properties(built_area);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON public.properties(location_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_properties_status_price ON public.properties(status, price);
CREATE INDEX IF NOT EXISTS idx_properties_location_status ON public.properties(location_id, status);

-- GIN index for JSONB features column (amenities, etc.)
CREATE INDEX IF NOT EXISTS idx_properties_features_gin ON public.properties USING GIN (features);

-- Trigram indexes for fuzzy text search on title and description
CREATE INDEX IF NOT EXISTS idx_properties_title_trgm ON public.properties USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_description_trgm ON public.properties USING GIN (description gin_trgm_ops);

-- Index for property_images ordering
CREATE INDEX IF NOT EXISTS idx_property_images_property_order 
ON public.property_images(property_id, display_order);

-- Index for location searches
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON public.locations USING GIN (name gin_trgm_ops);

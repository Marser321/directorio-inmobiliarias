-- Migration: Add source tracking columns

-- Properties Table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS original_data jsonb;

-- Agencies Table
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'verified'; -- verified, lead, unverified

-- Add comment
COMMENT ON COLUMN properties.source_url IS 'URL where the property was scraped from (e.g. MercadoLibre link)';
COMMENT ON COLUMN agencies.status IS 'Status of the agency: verified (paid/official), lead (scraped/cold), unverified (raw)';

-- Migration: Extend prospect_properties for FSBO & Rental Segmentation
-- Date: 2024-02-06
-- Description: Adds rental_type segmentation and FSBO confidence scoring

-- ============================================
-- 1. ADD NEW COLUMNS TO PROSPECT_PROPERTIES
-- ============================================

-- Rental type segmentation: 'anual' (long-term), 'temporal' (short-term/tourist)
ALTER TABLE public.prospect_properties 
ADD COLUMN IF NOT EXISTS rental_type text CHECK (rental_type IN ('anual', 'temporal'));

-- FSBO flag with confidence score
ALTER TABLE public.prospect_properties 
ADD COLUMN IF NOT EXISTS is_fsbo boolean DEFAULT false;

ALTER TABLE public.prospect_properties 
ADD COLUMN IF NOT EXISTS fsbo_confidence numeric DEFAULT 0 CHECK (fsbo_confidence >= 0 AND fsbo_confidence <= 1);

-- FSBO keywords detected (for audit/debugging)
ALTER TABLE public.prospect_properties 
ADD COLUMN IF NOT EXISTS fsbo_keywords text[];

-- ============================================
-- 2. INDEXES FOR EFFICIENT FILTERING
-- ============================================

-- Partial index for FSBO leads only
CREATE INDEX IF NOT EXISTS prospect_properties_fsbo_idx 
ON public.prospect_properties(is_fsbo, fsbo_confidence DESC) 
WHERE is_fsbo = true;

-- Partial index for rental segmentation
CREATE INDEX IF NOT EXISTS prospect_properties_rental_type_idx 
ON public.prospect_properties(rental_type) 
WHERE rental_type IS NOT NULL;

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS prospect_properties_status_rental_idx 
ON public.prospect_properties(status, rental_type, is_fsbo);

-- ============================================
-- 3. UTILITY VIEW FOR SEGMENTED PROSPECTS
-- ============================================

CREATE OR REPLACE VIEW public.fsbo_rental_summary AS
SELECT 
  COALESCE(rental_type, 'venta') AS segment,
  status,
  COUNT(*) AS total_leads,
  AVG(quality_score) AS avg_quality_score,
  AVG(fsbo_confidence) AS avg_fsbo_confidence,
  COUNT(*) FILTER (WHERE status = 'contacted') AS contacted_count,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_count
FROM public.prospect_properties
WHERE is_fsbo = true
GROUP BY COALESCE(rental_type, 'venta'), status
ORDER BY segment, status;

-- Grant access to view
GRANT SELECT ON public.fsbo_rental_summary TO authenticated;

-- ============================================
-- 4. COMMENT DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.prospect_properties.rental_type IS 'Segmentation: anual=long-term contract, temporal=short-term/tourist rental';
COMMENT ON COLUMN public.prospect_properties.is_fsbo IS 'True if listing is For Sale/Rent By Owner (no agency)';
COMMENT ON COLUMN public.prospect_properties.fsbo_confidence IS 'AI confidence score 0-1 that this is a genuine FSBO listing';
COMMENT ON COLUMN public.prospect_properties.fsbo_keywords IS 'Array of FSBO keywords found in listing: trato directo, dueño vende, etc.';

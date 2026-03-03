-- Migration: Manager Agent - Sistema de Mejora Continua
-- Date: 2026-02-05
-- Description: Adds tables for tracking user searches, data quality audits, and category coverage analysis.

-- ============================================
-- 1. USER SEARCHES (For tracking search patterns)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Search Details
  query TEXT,
  results_count INT DEFAULT 0,
  
  -- Parsed Filters (for analytics)
  category TEXT,
  neighborhood TEXT,
  city TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  bedrooms_min INT,
  
  -- Context
  session_id TEXT,
  user_agent TEXT,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'mobile', 'api'))
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS user_searches_created_idx ON public.user_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS user_searches_no_results_idx ON public.user_searches(results_count) WHERE results_count = 0;
CREATE INDEX IF NOT EXISTS user_searches_category_idx ON public.user_searches(category);
CREATE INDEX IF NOT EXISTS user_searches_neighborhood_idx ON public.user_searches(neighborhood);

-- ============================================
-- 2. DATA QUALITY LOG (Audit trail for AI updates)
-- ============================================
CREATE TABLE IF NOT EXISTS public.data_quality_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  entity_type TEXT NOT NULL CHECK (entity_type IN ('agency', 'property', 'profile')),
  entity_id BIGINT NOT NULL,
  
  check_type TEXT NOT NULL CHECK (check_type IN ('phone', 'hours', 'address', 'website', 'email', 'social_media')),
  field_name TEXT NOT NULL,
  
  previous_value TEXT,
  new_value TEXT,
  is_discrepancy BOOLEAN DEFAULT FALSE,
  
  verification_source TEXT CHECK (verification_source IN ('instagram', 'facebook', 'google_business', 'website', 'whatsapp', 'manual')),
  source_url TEXT,
  
  status TEXT DEFAULT 'detected' CHECK (status IN ('detected', 'updated', 'ignored', 'manual_review')),
  updated_by TEXT DEFAULT 'ai' CHECK (updated_by IN ('ai', 'manual', 'system')),
  
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS data_quality_log_entity_idx ON public.data_quality_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS data_quality_log_discrepancy_idx ON public.data_quality_log(is_discrepancy) WHERE is_discrepancy = TRUE;
CREATE INDEX IF NOT EXISTS data_quality_log_status_idx ON public.data_quality_log(status);

-- ============================================
-- 3. CATEGORY COVERAGE VIEW (Gap Analysis)
-- ============================================
CREATE OR REPLACE VIEW public.category_coverage AS
WITH property_counts AS (
  SELECT 
    l.name AS neighborhood,
    l.slug AS neighborhood_slug,
    (SELECT name FROM public.locations WHERE id = l.parent_id) AS zone,
    CASE 
      WHEN p.bedrooms >= 4 THEN 'casa_grande'
      WHEN p.bedrooms >= 2 THEN 'casa_media'
      ELSE 'apartamento'
    END AS property_category,
    COUNT(*) AS property_count
  FROM public.properties p
  INNER JOIN public.locations l ON p.location_id = l.id
  WHERE p.status IN ('for_sale', 'for_rent')
  GROUP BY l.id, l.name, l.slug, l.parent_id, 
    CASE 
      WHEN p.bedrooms >= 4 THEN 'casa_grande'
      WHEN p.bedrooms >= 2 THEN 'casa_media'
      ELSE 'apartamento'
    END
)
SELECT 
  neighborhood,
  neighborhood_slug,
  zone,
  property_category,
  property_count,
  CASE 
    WHEN property_count < 3 THEN 'critical'
    WHEN property_count < 10 THEN 'low'
    WHEN property_count < 25 THEN 'medium'
    ELSE 'good'
  END AS coverage_status
FROM property_counts
ORDER BY property_count ASC;

-- ============================================
-- 4. FAILED SEARCHES VIEW (Innovation Insights)
-- ============================================
CREATE OR REPLACE VIEW public.failed_searches_summary AS
SELECT 
  query,
  category,
  neighborhood,
  COUNT(*) AS search_count,
  MAX(created_at) AS last_searched
FROM public.user_searches
WHERE results_count = 0
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY query, category, neighborhood
ORDER BY search_count DESC;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert searches"
  ON public.user_searches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can view searches"
  ON public.user_searches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

ALTER TABLE public.data_quality_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view quality logs"
  ON public.data_quality_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Service role can manage quality logs"
  ON public.data_quality_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_coverage_gaps()
RETURNS TABLE (
  neighborhood TEXT,
  zone TEXT,
  property_category TEXT,
  property_count BIGINT,
  priority TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    neighborhood,
    zone,
    property_category,
    property_count,
    CASE 
      WHEN property_count = 0 THEN 'urgent'
      WHEN property_count < 3 THEN 'high'
      ELSE 'medium'
    END AS priority
  FROM public.category_coverage
  WHERE coverage_status IN ('critical', 'low')
  ORDER BY property_count ASC, neighborhood;
$$;

CREATE OR REPLACE FUNCTION public.get_innovation_suggestions(days_back INT DEFAULT 7)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  suggested_category TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    query,
    COUNT(*) AS search_count,
    CASE 
      WHEN query ILIKE '%terreno%' THEN 'terreno'
      WHEN query ILIKE '%local%' OR query ILIKE '%comercial%' THEN 'local_comercial'
      WHEN query ILIKE '%oficina%' THEN 'oficina'
      WHEN query ILIKE '%campo%' OR query ILIKE '%chacra%' THEN 'campo'
      ELSE 'nueva_categoria'
    END AS suggested_category
  FROM public.user_searches
  WHERE results_count = 0
    AND created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY query
  HAVING COUNT(*) >= 3
  ORDER BY search_count DESC
  LIMIT 10;
$$;

-- ============================================
-- 7. ADD ai_updated FLAG TO AGENCIES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agencies' AND column_name = 'ai_updated_at'
  ) THEN
    ALTER TABLE public.agencies ADD COLUMN ai_updated_at TIMESTAMPTZ;
    ALTER TABLE public.agencies ADD COLUMN ai_update_notes TEXT;
  END IF;
END $$;

-- ============================================
-- SISTEMA DE DEDUPLICACIÓN AVANZADO
-- Antigravity Maldonado ReOS
-- Migración: add_deduplication_system
-- ============================================

-- 1. TABLA: Hashes perceptuales de imágenes para detectar duplicados
CREATE TABLE IF NOT EXISTS public.property_image_hashes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id bigint REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  phash text NOT NULL, -- Hash perceptual de 64 bits (hexadecimal)
  dhash text, -- Hash diferencial para mayor robustez
  hamming_threshold int DEFAULT 10, -- Umbral de similitud (menor = más estricto)
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(property_id, image_url)
);

-- Índice para búsqueda rápida de hashes
CREATE INDEX IF NOT EXISTS idx_image_hashes_phash ON public.property_image_hashes(phash);
CREATE INDEX IF NOT EXISTS idx_image_hashes_property_id ON public.property_image_hashes(property_id);

-- 2. TABLA: Direcciones normalizadas para detectar duplicados textuales
CREATE TABLE IF NOT EXISTS public.property_addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id bigint REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL UNIQUE,
  raw_address text NOT NULL,
  normalized_address text,
  street text,
  street_number text,
  city text,
  postal_code text,
  country text DEFAULT 'UY',
  confidence float CHECK (confidence >= 0 AND confidence <= 1),
  source text CHECK (source IN ('manual', 'google', 'mapbox', 'libpostal')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_property_addresses_normalized ON public.property_addresses(normalized_address);
CREATE INDEX IF NOT EXISTS idx_property_addresses_property_id ON public.property_addresses(property_id);

-- 3. TABLA: Log de propiedades duplicadas detectadas
CREATE TABLE IF NOT EXISTS public.duplicate_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_a_id bigint REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  property_b_id bigint REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  match_type text CHECK (match_type IN ('geo', 'image', 'address', 'combined')) NOT NULL,
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  geo_distance_meters float,
  image_similarity float,
  address_similarity float,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'merged')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(property_a_id, property_b_id)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_status ON public.duplicate_candidates(status);

-- 4. FUNCIÓN: Buscar propiedades duplicadas por geolocalización (radio 20m por defecto)
CREATE OR REPLACE FUNCTION public.find_geo_duplicates(
  p_property_id bigint,
  p_radius_meters float DEFAULT 20
)
RETURNS TABLE(
  duplicate_id bigint,
  distance_meters float,
  price_diff_percent float,
  same_bedrooms boolean
)
LANGUAGE sql STABLE
AS $$
  WITH source_property AS (
    SELECT location_point, price, bedrooms
    FROM public.properties
    WHERE id = p_property_id
  )
  SELECT 
    p.id as duplicate_id,
    ST_Distance(p.location_point::geography, sp.location_point::geography) as distance_meters,
    CASE 
      WHEN sp.price > 0 THEN ABS(p.price - sp.price) / sp.price * 100
      ELSE 0
    END as price_diff_percent,
    p.bedrooms = sp.bedrooms as same_bedrooms
  FROM public.properties p
  CROSS JOIN source_property sp
  WHERE p.id != p_property_id
    AND p.location_point IS NOT NULL
    AND sp.location_point IS NOT NULL
    AND ST_DWithin(p.location_point::geography, sp.location_point::geography, p_radius_meters)
  ORDER BY distance_meters;
$$;

-- 5. FUNCIÓN: Calcular distancia de Hamming entre dos hashes (para pHash)
CREATE OR REPLACE FUNCTION public.hamming_distance(hash1 text, hash2 text)
RETURNS int
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  distance int := 0;
  i int;
  len int;
BEGIN
  IF hash1 IS NULL OR hash2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  len := LEAST(length(hash1), length(hash2));
  
  FOR i IN 1..len LOOP
    IF substring(hash1 from i for 1) != substring(hash2 from i for 1) THEN
      distance := distance + 1;
    END IF;
  END LOOP;
  
  RETURN distance;
END;
$$;

-- 6. FUNCIÓN: Buscar imágenes duplicadas por pHash
CREATE OR REPLACE FUNCTION public.find_image_duplicates(
  p_phash text,
  p_threshold int DEFAULT 10,
  p_exclude_property_id bigint DEFAULT NULL
)
RETURNS TABLE(
  property_id bigint,
  image_url text,
  similarity_distance int
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    pih.property_id,
    pih.image_url,
    public.hamming_distance(pih.phash, p_phash) as similarity_distance
  FROM public.property_image_hashes pih
  WHERE (p_exclude_property_id IS NULL OR pih.property_id != p_exclude_property_id)
    AND public.hamming_distance(pih.phash, p_phash) <= p_threshold
  ORDER BY similarity_distance;
$$;

-- 7. RLS POLICIES para las nuevas tablas
ALTER TABLE public.property_image_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_candidates ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para hashes
CREATE POLICY "Property image hashes are readable by agency members"
  ON public.property_image_hashes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.agency_users au ON au.agency_id = p.agency_id
      WHERE p.id = property_image_hashes.property_id
        AND au.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para direcciones normalizadas
CREATE POLICY "Property addresses are readable by agency members"
  ON public.property_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.agency_users au ON au.agency_id = p.agency_id
      WHERE p.id = property_addresses.property_id
        AND au.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admins pueden ver candidatos duplicados
CREATE POLICY "Duplicate candidates readable by admins"
  ON public.duplicate_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admins pueden modificar candidatos duplicados
CREATE POLICY "Duplicate candidates modifiable by admins"
  ON public.duplicate_candidates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. COMENTARIOS para documentación
COMMENT ON TABLE public.property_image_hashes IS 'Almacena hashes perceptuales de imágenes para detectar duplicados visuales';
COMMENT ON TABLE public.property_addresses IS 'Direcciones normalizadas para detectar duplicados por ubicación textual';
COMMENT ON TABLE public.duplicate_candidates IS 'Log de propiedades potencialmente duplicadas pendientes de revisión';
COMMENT ON FUNCTION public.find_geo_duplicates IS 'Busca propiedades duplicadas en un radio dado (default 20m)';
COMMENT ON FUNCTION public.hamming_distance IS 'Calcula distancia de Hamming entre dos hashes para comparación de imágenes';
COMMENT ON FUNCTION public.find_image_duplicates IS 'Busca imágenes duplicadas comparando hashes perceptuales';

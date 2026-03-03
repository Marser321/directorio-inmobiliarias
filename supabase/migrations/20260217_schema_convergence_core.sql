-- Phase 2: Schema convergence for release-critical contracts
-- Idempotent migration to align runtime schema with API expectations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publication_status') THEN
    CREATE TYPE public.publication_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
  END IF;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS publication_status public.publication_status DEFAULT 'draft';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS location_point_geojson jsonb;

CREATE TABLE IF NOT EXISTS public.property_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id bigint NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  url text NOT NULL,
  key text,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_media_property_id_idx ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS property_media_order_idx ON public.property_media(property_id, display_order);

CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results_count integer NOT NULL DEFAULT 0,
  query_ms integer,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_tiers
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

CREATE TABLE IF NOT EXISTS public.vibe_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id bigint REFERENCES public.properties(id) ON DELETE CASCADE,
  zone_name text,
  noise_score integer,
  safety_score integer,
  wind_score integer,
  nightlife_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vibe_scores_property_id_idx ON public.vibe_scores(property_id);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

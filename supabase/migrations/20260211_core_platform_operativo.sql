-- Core platform additive schema for multi-tenant operations
-- Adds publication status, property_media, audit_events, service_deliverables, and agency constraints.

-- =====================================================
-- 1) Publication status for properties
-- =====================================================
-- Ensure helper functions exist (used by RLS policies below)
CREATE OR REPLACE FUNCTION public.get_my_agency_role()
RETURNS TABLE(agency_id BIGINT, role TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT p.agency_id, p.role::TEXT
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_agency_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publication_status') THEN
    CREATE TYPE public.publication_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
  END IF;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS publication_status public.publication_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- =====================================================
-- 2) Canonical property_media table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.property_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id bigint REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'tour360', 'floorplan')),
  url text NOT NULL,
  key text,
  display_order int DEFAULT 0,
  is_primary boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS property_media_property_id_idx ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS property_media_order_idx ON public.property_media(property_id, display_order);
CREATE INDEX IF NOT EXISTS property_media_primary_idx ON public.property_media(property_id, is_primary);

ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

-- Public can view media for published properties
DROP POLICY IF EXISTS property_media_select_policy ON public.property_media;
CREATE POLICY property_media_select_policy
ON public.property_media
FOR SELECT
USING (
  true
);

-- Owners/agents/admins can insert/update/delete media for their properties
DROP POLICY IF EXISTS property_media_insert_policy ON public.property_media;
DROP POLICY IF EXISTS property_media_update_policy ON public.property_media;
DROP POLICY IF EXISTS property_media_delete_policy ON public.property_media;

CREATE POLICY property_media_insert_policy
ON public.property_media
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_media.property_id
      AND (
        p.owner_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.get_my_agency_role() mar
          WHERE mar.role IN ('agency_admin', 'agent', 'owner')
            AND mar.agency_id = p.agency_id
        )
        OR public.is_current_user_admin()
      )
  )
);

CREATE POLICY property_media_update_policy
ON public.property_media
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_media.property_id
      AND (
        p.owner_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.get_my_agency_role() mar
          WHERE mar.role IN ('agency_admin', 'agent', 'owner')
            AND mar.agency_id = p.agency_id
        )
        OR public.is_current_user_admin()
      )
  )
);

CREATE POLICY property_media_delete_policy
ON public.property_media
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_media.property_id
      AND (
        p.owner_id = auth.uid()
        OR p.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.get_my_agency_role() mar
          WHERE mar.role IN ('agency_admin', 'agent', 'owner')
            AND mar.agency_id = p.agency_id
        )
        OR public.is_current_user_admin()
      )
  )
);

-- =====================================================
-- 3) Audit events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agency_id bigint REFERENCES public.agencies(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  diff jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS audit_events_agency_idx ON public.audit_events(agency_id);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON public.audit_events(entity_type, entity_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_insert_policy ON public.audit_events;
DROP POLICY IF EXISTS audit_events_select_policy ON public.audit_events;

CREATE POLICY audit_events_insert_policy
ON public.audit_events
FOR INSERT
WITH CHECK (
  actor_id = auth.uid() OR public.is_current_user_admin()
);

CREATE POLICY audit_events_select_policy
ON public.audit_events
FOR SELECT
USING (
  public.is_current_user_admin()
);

-- =====================================================
-- 4) Service deliverables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_deliverables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  version integer DEFAULT 1,
  status text DEFAULT 'draft',
  url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_deliverables_request_idx ON public.service_deliverables(service_request_id);

ALTER TABLE public.service_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_deliverables_select_policy ON public.service_deliverables;
DROP POLICY IF EXISTS service_deliverables_insert_policy ON public.service_deliverables;
DROP POLICY IF EXISTS service_deliverables_update_policy ON public.service_deliverables;

CREATE POLICY service_deliverables_select_policy
ON public.service_deliverables
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = service_deliverables.service_request_id
      AND (sr.user_id = auth.uid() OR public.is_current_user_admin())
  )
);

CREATE POLICY service_deliverables_insert_policy
ON public.service_deliverables
FOR INSERT
WITH CHECK (
  public.is_current_user_admin()
);

CREATE POLICY service_deliverables_update_policy
ON public.service_deliverables
FOR UPDATE
USING (
  public.is_current_user_admin()
);

-- =====================================================
-- 5) Add agency_id to service requests and subscriptions
-- =====================================================
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS agency_id bigint REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS service_requests_agency_idx ON public.service_requests(agency_id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS agency_id bigint REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subscriptions_agency_idx ON public.subscriptions(agency_id);

-- =====================================================
-- 6) Enforce single agency per user in this phase
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS agency_memberships_user_id_unique ON public.agency_memberships(user_id);

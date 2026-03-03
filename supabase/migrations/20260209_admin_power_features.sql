-- Migration: Admin Power Features
-- Date: 2026-02-09
-- Description: Adds admin_logs, admin_role, request_impersonation function, and quality_score columns.

-- 1. Create admin_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE public.admin_role AS ENUM ('super_admin', 'content_manager', 'support');
    END IF;
END$$;

-- 2. Add admin_role column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_role public.admin_role DEFAULT 'support';

-- 3. Create admin_logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'approve_property', 'delete_user', 'impersonate'
    target_resource TEXT NOT NULL, -- e.g., 'property:123', 'user:456'
    details JSONB, -- Previous values, new values, reason
    ip_address TEXT
);

-- Index for faster querying of logs
CREATE INDEX IF NOT EXISTS admin_logs_created_at_idx ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_admin_id_idx ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_logs_action_idx ON public.admin_logs(action);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view logs
CREATE POLICY "Admins can view all logs"
    ON public.admin_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Only Admins can insert logs (via server actions/triggers)
CREATE POLICY "Admins can insert logs"
    ON public.admin_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 4. Add Quality Gate columns to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS quality_score INT DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
ADD COLUMN IF NOT EXISTS quality_feedback TEXT;

-- Index for sorting by quality
CREATE INDEX IF NOT EXISTS properties_quality_score_idx ON public.properties(quality_score);


-- 5. Helper Function for Audit Logging (to be used by triggers)
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if the user is an admin
    IF (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) THEN
        INSERT INTO public.admin_logs (admin_id, action, target_resource, details)
        VALUES (
            auth.uid(),
            TG_OP || '_' || TG_TABLE_NAME, -- e.g., UPDATE_properties
            TG_TABLE_NAME || ':' || NEW.id,
            jsonb_build_object(
                'old_data', to_jsonb(OLD),
                'new_data', to_jsonb(NEW)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Apply Triggers to Critical Tables
-- Dropping first to allow idempotency
DROP TRIGGER IF EXISTS log_property_changes ON public.properties;
CREATE TRIGGER log_property_changes
    AFTER UPDATE OR DELETE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS log_agency_changes ON public.agencies;
CREATE TRIGGER log_agency_changes
    AFTER UPDATE OR DELETE ON public.agencies
    FOR EACH ROW
    EXECUTE FUNCTION public.log_admin_action();

-- 7. Impersonation Function (Using Supabase Admin API usually, but we can log the *intent* here)
-- Real impersonation happens via `supabase.auth.admin.getUserById` on the server side
-- This table helps track who impersonated whom.


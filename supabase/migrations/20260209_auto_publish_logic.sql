-- Migration: Auto-Publish High Quality Properties
-- Date: 2026-02-09
-- Description: Automatically publishes properties with a Quality Score >= 80.

CREATE OR REPLACE FUNCTION public.auto_publish_property()
RETURNS TRIGGER AS $$
BEGIN
    -- unique logic: if score becomes high enough and status is not already published/sold
    IF NEW.quality_score >= 80 AND (OLD.quality_score IS NULL OR OLD.quality_score < 80) THEN
        IF NEW.status = 'draft' OR NEW.status = 'pending_review' THEN
            NEW.status := 'published';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_publish ON public.properties;

CREATE TRIGGER trigger_auto_publish
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_publish_property();

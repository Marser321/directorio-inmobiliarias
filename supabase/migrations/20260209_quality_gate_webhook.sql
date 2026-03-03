-- Migration: Quality Gate Webhook Trigger
-- Date: 2026-02-09
-- Description: Sets up a trigger to call n8n webhook on property changes.

-- 1. Enable pg_net extension if not enabled (required for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the function to call the webhook
CREATE OR REPLACE FUNCTION public.trigger_quality_gate_webhook()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT := 'https://YOUR_N8N_INSTANCE_URL/webhook/quality-gate'; -- ⚠️ UPDATE THIS URL
    payload JSONB;
BEGIN
    -- Only trigger if quality_score is null or it's a new insert
    -- or if specific fields changed (optional optimization)
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (OLD.description IS DISTINCT FROM NEW.description OR OLD.features IS DISTINCT FROM NEW.features)) THEN
       
        payload := jsonb_build_object(
            'record', row_to_json(NEW),
            'event', TG_OP
        );

        -- Send async HTTP POST request
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_quality_gate ON public.properties;

CREATE TRIGGER trigger_quality_gate
    AFTER INSERT OR UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_quality_gate_webhook();

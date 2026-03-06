-- SECURITY DEFINER so edge functions (non-superuser) can write to vault
CREATE OR REPLACE FUNCTION public.admin_upsert_ai_secret(p_name text, p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_secret, p_name);
  ELSE
    PERFORM vault.update_secret(v_id, p_secret);
  END IF;
END; $$;

-- SECURITY DEFINER so edge functions can read decrypted vault secrets
CREATE OR REPLACE FUNCTION public.admin_read_ai_secret(p_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = p_name;
  RETURN v_secret;
END; $$;

-- Returns {provider: bool} for all known vault-backed providers
CREATE OR REPLACE FUNCTION public.admin_ai_key_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_object_agg(
    t.provider,
    EXISTS(SELECT 1 FROM vault.secrets WHERE name = t.provider || '_api_key')
  )
  INTO result
  FROM (VALUES ('openrouter'), ('openai'), ('anthropic'), ('xai'), ('kimi')) AS t(provider);
  RETURN result;
END; $$;

-- Seed new admin_config keys (do not overwrite existing values)
INSERT INTO admin_config (config_key, config_value) VALUES
  ('ai_provider', 'openrouter'),
  ('ai_model',    'meta-llama/llama-3.3-70b-instruct')
ON CONFLICT (config_key) DO NOTHING;

-- Restrict vault helper functions to service_role only.
-- Without this, any anon or authenticated user can call admin_read_ai_secret
-- via the REST API and retrieve the raw decrypted vault secret.

REVOKE EXECUTE ON FUNCTION public.admin_read_ai_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_ai_secret(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_ai_key_status() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_read_ai_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_ai_secret(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_ai_key_status() TO service_role;

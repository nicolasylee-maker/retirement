-- Migration 005: Sync email updates from auth.users to public.users
--
-- The handle_new_user() trigger only fires on INSERT. If a user changes
-- their email in Supabase Auth, public.users.email silently drifts.
-- This trigger fixes that by syncing on UPDATE.

CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
    SET email      = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated();

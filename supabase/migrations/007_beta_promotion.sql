-- =============================================================================
-- Migration 007: Beta Promotion — Auto-Grant on Signup Before Cutoff Date
--
-- 1a. Seed admin_config keys for promotion cutoff and duration
-- 1b. RLS SELECT policy so the landing page (anon) can read promotion config
-- 1c. Rewrite handle_new_user() to auto-grant beta override during promotion
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1a. Seed beta promotion config keys
-- ---------------------------------------------------------------------------
INSERT INTO public.admin_config (config_key, config_value) VALUES
  ('beta_promotion_cutoff', 'null'),   -- 'null' = off, '2026-06-30' = active
  ('beta_promotion_days', '180')       -- days of beta access per user
ON CONFLICT (config_key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 1b. RLS SELECT policy for anon/public reads of beta_promotion_% keys
--
-- admin_config has RLS enabled with NO client policies (service role only).
-- This adds a targeted SELECT policy so the landing page can fetch promotion
-- config without authentication.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read beta promotion config" ON public.admin_config;

CREATE POLICY "Public read beta promotion config"
  ON public.admin_config
  FOR SELECT
  USING (config_key LIKE 'beta_promotion_%');


-- ---------------------------------------------------------------------------
-- 1c. Rewrite handle_new_user() trigger
--
-- After the existing INSERT/ON CONFLICT, if the user was NOT invited by an
-- admin (raw_user_meta_data->>'subscription_override' IS NULL) and a valid
-- promotion is active, auto-grant beta override with expiry.
--
-- Guards:
--   - Skips admin-invited users (subscription_override in metadata)
--   - Skips if promotion is off (cutoff = 'null' or missing)
--   - Skips if cutoff date is in the past
--   - Only sets override where subscription_override IS NULL (no overwrite)
--   - Wrapped in EXCEPTION block to prevent trigger failure on bad config
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff    text;
  v_days      text;
  v_days_int  integer;
BEGIN
  -- Original insert/upsert logic (unchanged)
  INSERT INTO public.users (
    id,
    email,
    display_name,
    avatar_url,
    subscription_override
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'subscription_override'
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url   = COALESCE(EXCLUDED.avatar_url,   public.users.avatar_url),
    updated_at   = now();

  -- Beta promotion: auto-grant if active and user was not admin-invited
  IF new.raw_user_meta_data->>'subscription_override' IS NULL THEN
    BEGIN
      SELECT config_value INTO v_cutoff
        FROM public.admin_config
        WHERE config_key = 'beta_promotion_cutoff';

      SELECT config_value INTO v_days
        FROM public.admin_config
        WHERE config_key = 'beta_promotion_days';

      v_days_int := v_days::integer;

      IF v_cutoff IS NOT NULL
         AND v_cutoff <> 'null'
         AND v_cutoff <> ''
         AND now()::date <= v_cutoff::date
         AND v_days_int > 0
      THEN
        UPDATE public.users
          SET subscription_override = 'beta',
              override_expires_at   = now() + (v_days_int || ' days')::interval
          WHERE id = new.id
            AND subscription_override IS NULL;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Swallow errors from bad config data to prevent trigger failure
      NULL;
    END;
  END IF;

  RETURN new;
END;
$$;

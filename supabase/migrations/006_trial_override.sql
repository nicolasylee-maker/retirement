-- Migration 006: Add override_expires_at for time-limited admin trial overrides
--
-- `beta` and `lifetime` overrides remain permanent (override_expires_at = NULL).
-- `trial` overrides set override_expires_at to the expiry timestamp.
-- When override_expires_at is in the past, the app treats the user as free tier.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS override_expires_at TIMESTAMPTZ DEFAULT NULL;

-- =============================================================================
-- Migration 002: Row-Level Security Policies + New-User Trigger
-- Canadian Retirement Planner — Supabase / Postgres
--
-- This migration:
--   1. Enables RLS on all 4 application tables
--   2. Creates per-table access policies (auth.uid()-scoped)
--   3. Creates the handle_new_user() trigger function
--   4. Attaches that function to auth.users AFTER INSERT
--
-- Idempotency:
--   - CREATE OR REPLACE FUNCTION — safe to re-run
--   - DROP POLICY IF EXISTS before each CREATE POLICY — safe to re-run
--   - CREATE OR REPLACE TRIGGER (Postgres 14+) — safe to re-run
--
-- RLS philosophy:
--   - Users can only see and modify their own data.
--   - Tables written exclusively by Edge Functions (service role) have no
--     client INSERT/UPDATE/DELETE policy — the service role bypasses RLS.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Enable Row-Level Security on all tables
--
-- Once RLS is enabled, every query must match at least one policy or it
-- returns zero rows (for SELECT) or is rejected (for mutations).
-- The Supabase service role key bypasses RLS entirely — only use it in
-- Edge Functions running server-side.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage      ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 2. RLS Policies: public.users
--
-- Users can read and update their own profile row.
-- INSERT is handled by the handle_new_user() trigger (security definer),
-- not by the client, so no INSERT policy is needed here.
-- DELETE is not exposed to the client — account deletion would be handled
-- by a server-side admin operation.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users: read own"   ON public.users;
DROP POLICY IF EXISTS "Users: update own" ON public.users;

-- Allow an authenticated user to SELECT their own row only.
CREATE POLICY "Users: read own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow an authenticated user to UPDATE their own row only.
-- (e.g. updating display_name from a profile settings page)
CREATE POLICY "Users: update own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 3. RLS Policies: public.scenarios
--
-- Users can perform full CRUD on their own scenarios only.
-- The user_id column is checked against auth.uid() on every operation.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Scenarios: read own"   ON public.scenarios;
DROP POLICY IF EXISTS "Scenarios: insert own" ON public.scenarios;
DROP POLICY IF EXISTS "Scenarios: update own" ON public.scenarios;
DROP POLICY IF EXISTS "Scenarios: delete own" ON public.scenarios;

-- SELECT: user can read their own scenarios.
CREATE POLICY "Scenarios: read own"
  ON public.scenarios
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user can create a new scenario; WITH CHECK ensures they cannot
-- insert a row with a different user_id than their own.
CREATE POLICY "Scenarios: insert own"
  ON public.scenarios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can save changes to their own scenarios.
CREATE POLICY "Scenarios: update own"
  ON public.scenarios
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: user can remove their own scenarios.
CREATE POLICY "Scenarios: delete own"
  ON public.scenarios
  FOR DELETE
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 4. RLS Policies: public.subscriptions
--
-- Clients can only READ their own subscription row. All writes come from the
-- stripe-webhook Edge Function running with the service role key, which
-- bypasses RLS — so no INSERT/UPDATE/DELETE client policies are needed.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Subscriptions: read own" ON public.subscriptions;

-- SELECT: user can read their own subscription to check access level.
CREATE POLICY "Subscriptions: read own"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE client policies.
-- Written exclusively by the stripe-webhook Edge Function (service role).


-- ---------------------------------------------------------------------------
-- 5. RLS Policies: public.ai_usage
--
-- Clients can only READ their own usage row (e.g. to display "3 of 30
-- generations used this month"). All writes come from the Gemini proxy
-- Edge Function (service role), which bypasses RLS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "AI usage: read own" ON public.ai_usage;

-- SELECT: user can read their own usage counters.
CREATE POLICY "AI usage: read own"
  ON public.ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE client policies.
-- Written exclusively by the Gemini proxy Edge Function (service role).


-- ---------------------------------------------------------------------------
-- 6. Trigger Function: public.handle_new_user()
--
-- Fires AFTER INSERT on auth.users for every new sign-in method (Google
-- OAuth and magic link). Creates or updates the corresponding public.users
-- row using an UPSERT with ON CONFLICT (id).
--
-- Metadata sources:
--   new.raw_user_meta_data->>'full_name'           — set by Google OAuth
--   new.raw_user_meta_data->>'avatar_url'          — set by Google OAuth
--   new.raw_user_meta_data->>'subscription_override' — set by admin-invites
--                                                    Edge Function when
--                                                    pre-registering a beta
--                                                    or lifetime user
--
-- CONFLICT behaviour (subsequent sign-ins after row exists):
--   - email is always updated (may change, though rare)
--   - display_name is updated ONLY if the new value is non-null
--     (coalesce: preserves user's manually set name on re-login)
--   - avatar_url is updated ONLY if the new value is non-null
--     (coalesce: preserves stored avatar if provider sends none)
--   - subscription_override is intentionally NOT updated — it is only written
--     on the very first insert. To change it, update the row directly via
--     Supabase Studio or the admin Edge Function.
--   - updated_at is always refreshed
--
-- SECURITY DEFINER: runs with the privileges of the function owner (postgres)
-- so it can write to public.users even when called from the auth schema
-- context where the triggering user has no direct table access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Search path is pinned to prevent search-path injection attacks.
SET search_path = public
AS $$
BEGIN
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
    new.raw_user_meta_data->>'full_name',         -- populated by Google OAuth; null for magic link
    new.raw_user_meta_data->>'avatar_url',         -- populated by Google OAuth; null for magic link
    new.raw_user_meta_data->>'subscription_override'  -- set by admin invite system; null for regular signups
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    -- coalesce: only overwrite display_name / avatar_url if the incoming
    -- value is non-null, so a magic-link re-login doesn't blank out a name
    -- previously set via Google or by the user in their profile settings.
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url   = COALESCE(EXCLUDED.avatar_url,   public.users.avatar_url),
    updated_at   = now();
    -- NOTE: subscription_override is deliberately absent from the UPDATE
    --       clause. It is set only on the initial INSERT from metadata.
    --       Changing it requires a direct UPDATE via Supabase Studio or
    --       the admin Edge Function.

  RETURN new;
END;
$$;


-- ---------------------------------------------------------------------------
-- 7. Trigger: on_auth_user_created
--
-- Attaches handle_new_user() to auth.users so it fires once per new user
-- record, after the INSERT completes.
--
-- CREATE OR REPLACE TRIGGER requires Postgres 14+ (available in all current
-- Supabase projects). This makes the statement idempotent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Remove DEFAULT gen_random_uuid() from scenarios.id.
-- Every legitimate code path sets id explicitly.
-- Without the default, any ghost INSERT that omits id will fail with NOT NULL violation
-- instead of silently creating a duplicate row with a random UUID.
ALTER TABLE public.scenarios ALTER COLUMN id DROP DEFAULT;

-- Tax data: one row per province/year (stores full JSON blob)
CREATE TABLE IF NOT EXISTS public.tax_data (
  province    text        NOT NULL,
  tax_year    int         NOT NULL,
  data        jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (province, tax_year)
);
ALTER TABLE public.tax_data ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (needed for app startup tax data load)
CREATE POLICY "tax_data_read" ON public.tax_data
  FOR SELECT USING (auth.role() = 'authenticated');
-- Writes only via service role in edge functions (no INSERT/UPDATE policy for clients)

-- Legislation check history
CREATE TABLE IF NOT EXISTS public.legislation_checks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  results     jsonb       NOT NULL,
  summary     text
);
ALTER TABLE public.legislation_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legislation_read" ON public.legislation_checks
  FOR SELECT USING (auth.role() = 'authenticated');
-- Writes only via service role in edge functions

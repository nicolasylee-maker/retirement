-- Audit table to catch the phantom scenario writer
CREATE TABLE public.scenario_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scenario_id uuid,
  user_id uuid,
  name text,
  action text,  -- 'INSERT' or 'BLOCKED'
  created_at timestamptz DEFAULT now()
);

-- BEFORE INSERT trigger: silently drops duplicate default scenarios.
-- If this user already has a scenario with the same name created in the
-- last 30 seconds, skip the insert and log it as BLOCKED.
-- Legitimate auto-saves use upsert (onConflict: 'id') which does an UPDATE
-- on existing ids — UPDATEs do NOT fire BEFORE INSERT, so they're unaffected.
CREATE OR REPLACE FUNCTION prevent_duplicate_default_scenario()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.scenarios
    WHERE user_id = NEW.user_id
      AND name = NEW.name
      AND id != NEW.id
      AND created_at > NOW() - INTERVAL '30 seconds'
  ) THEN
    INSERT INTO public.scenario_audit (scenario_id, user_id, name, action)
    VALUES (NEW.id, NEW.user_id, NEW.name, 'BLOCKED');
    RETURN NULL;
  END IF;
  INSERT INTO public.scenario_audit (scenario_id, user_id, name, action)
  VALUES (NEW.id, NEW.user_id, NEW.name, 'INSERT');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_default
  BEFORE INSERT ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_default_scenario();

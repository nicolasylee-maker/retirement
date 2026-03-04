-- Update the compare prompt template in admin_config
-- Run via Supabase SQL editor or CLI after code deploys

INSERT INTO admin_config (config_key, config_value)
VALUES ('prompt_compare', 'Compare these retirement scenarios:

{scenarioLines}

Input differences:
{diffLines}

Life phase breakdown:
{phaseLines}

Monthly cash flow at key ages:
{monthlyLines}

Start with a one-sentence verdict: which plan is stronger and why.

BIGGEST DRIVER: Identify the single input change that matters most. Explain the compounding effect — not just "you spend more" but "the extra $X/mo means $Y less invested over Z years, which compounds to $W less at 90."

PHASE-BY-PHASE: For each phase where scenarios diverge meaningfully, explain what happens differently and why. Reference specific ages, dollar amounts, and depletion events. Flag any phase where one scenario is green and the other is red.

THE CROSSOVER MOMENT: Identify the age where the weaker scenario''s trajectory becomes unrecoverable.

ACTIONABLE ALTERNATIVES: For each major difference, suggest a middle-ground option with specific numbers.

Keep language conversational. Use specific dollar amounts from the data. No jargon without explanation.')
ON CONFLICT (config_key)
DO UPDATE SET config_value = EXCLUDED.config_value;

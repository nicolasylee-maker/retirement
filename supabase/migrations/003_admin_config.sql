CREATE TABLE IF NOT EXISTS public.admin_config (
  config_key   text        PRIMARY KEY,
  config_value text        NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
-- No client policies — all reads/writes via service role (edge functions only).

INSERT INTO public.admin_config (config_key, config_value) VALUES
  ('gemini_model', $val$gemini-3-flash-preview$val$),
  ('temperature', $val$0.7$val$),
  ('max_output_tokens', $val$4096$val$),
  ('prompt_base', $val$You are a friendly, knowledgeable Canadian financial advisor helping Ontario retirees understand their retirement plan in plain language — no jargon. Be specific with dollar amounts. Use Canadian financial terms (RRSP, TFSA, RRIF, CPP, OAS, GIS). IMPORTANT: Provide exactly 4 numbered recommendations. Each one should be 2-3 sentences explaining the issue, then a bullet point starting with "- Alternative:" suggesting a different approach. Start with a one-line overall assessment using: ✅ for solid plans, ⚠️ for needs attention, 🚨 for critical concerns. Example format:

Overall Assessment: ⚠️ Needs Attention

1. **First Point:** Explain the issue in 2-3 sentences with specific dollar amounts.
- Alternative: Describe a different approach they could consider.

2. **Second Point:** Details here.
- Alternative: Another option.

3. **Third Point:** Details here.
- Alternative: Another option.

4. **Fourth Point:** Details here.
- Alternative: Another option.$val$),
  ('prompt_dashboard', $val$Based on this Ontario retirement scenario, provide exactly 4 numbered recommendations with alternatives:
- Age {currentAge}, retiring at {retirementAge}, plan to age {lifeExpectancy}
- Monthly expenses: ${monthlyExpenses}
- Net worth at retirement: ${netWorthAtRetirement}
- Annual retirement income: ${annualIncome}, Tax: ${annualTax}
- Sustainable monthly spending: ${sustainableMonthly}
- Portfolio at life expectancy: ${portfolioAtEnd}
- RRSP: ${rrspBalance}, TFSA: ${tfsaBalance}, Non-reg: ${nonRegBalance}
- CPP: ${cppMonthly}/mo at age {cppStartAge}, OAS: ${oasMonthly}/mo at age {oasStartAge}
{pensionLine}

For each recommendation, explain the financial impact in dollars and suggest an alternative strategy.$val$),
  ('prompt_compare', $val$Compare these Ontario retirement scenarios and recommend which is better:
{scenarioLines}

Highlight key trade-offs with specific dollar amounts. For each point, suggest an alternative approach.$val$),
  ('prompt_estate', $val$Analyze this Ontario estate plan:
- Death at age {ageAtDeath}
- Gross estate: ${grossEstate}, Tax & fees: ${totalTax}, Net to heirs: ${netToHeirs}
- Has will: {hasWill}
- Primary beneficiary: {primaryBeneficiary}
- RRSP/RRIF at death: ${rrspBalance}, Spouse rollover: {spouseRollover}

Provide exactly 4 numbered estate planning recommendations with alternatives, focused on Ontario-specific tax reduction strategies.$val$),
  ('prompt_debt', $val$Analyze this Ontario retiree's debt situation and its impact on retirement:
- Total debt: ${totalDebt}, Total lifetime interest: ${totalInterest}
- Consumer debt: ${consumerDebt} at {consumerRatePct}%
- Mortgage: ${mortgageBalance} at {mortgageRatePct}%
- Current age: {currentAge}, Retirement age: {retirementAge}, Debt-free by: age {debtFreeAge}
- Monthly debt payments: ${monthlyPayments}

Provide exactly 4 numbered recommendations about managing debt before and during retirement, including the opportunity cost of debt payments vs investing.$val$)
ON CONFLICT (config_key) DO NOTHING;

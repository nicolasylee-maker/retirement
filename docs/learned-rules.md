# Learned Rules

## Tax Rules (Ontario / Federal)

- RRSP/RRIF withdrawals are fully taxable as income
- TFSA withdrawals are tax-free
- Non-registered: only capital gains are taxable (50% inclusion up to $250K, 66.7% above)
- OAS clawback: 15% of net income above ~$91K
- RRIF conversions mandatory at 71; minimum withdrawals from 72+
- Ontario surtax layers on top of base provincial tax
- Primary residence is exempt from capital gains
- Probate applies to estate assets not passing by beneficiary designation or joint ownership

## Withdrawal Strategy

- RRSP meltdown: voluntarily withdraw RRSP before 72 to reduce future mandatory RRIF minimums
- Optimal order depends on marginal tax rates and OAS clawback zone
- TFSA first preserves tax-free growth; RRSP first may reduce clawback

## Cloud Sync / Import

- Imported scenarios must always get a fresh `uid()` — never reuse external IDs. External IDs may already exist in Supabase under a different `user_id`; the upsert will fail due to RLS and show "Save failed".
- The desktop scenario picker belongs inside the right-side actions `flex` group (beside the ⋮ button), not as a `flex-1` sibling between logo and actions — that placement floats it to the centre on wide screens.

## Edge Function Deployment (Supabase)

- `/DATA` is a FUSE/NTFS filesystem — Docker cannot mount it. Always deploy with `--use-api` (server-side bundling).
- The project uses ES256 JWTs (new Supabase auth format). Supabase's gateway JWT verification rejects them. Always deploy with `--no-verify-jwt` — the functions verify tokens internally via `callerClient.auth.getUser()`.
- Combined deploy command: `supabase functions deploy <fn> --use-api --no-verify-jwt`
- To test edge functions from CLI: generate a magic-link token via `admin.auth.admin.generateLink`, verify it with `client.auth.verifyOtp`, then use the resulting `access_token` with curl.

## Admin Config / AI Prompts

- Prompts live in the `admin_config` DB table, editable via the admin AI Config tab — no redeployment needed.
- `gemini-proxy` reads config from `admin_config` on every request. If the table is empty or missing, all prompt templates fall back to empty strings → Gemini returns garbage. Apply migration before deploying the new proxy.
- `gemini-proxy` and `geminiService.js` are atomically coupled — they must be deployed together. Old proxy expects `{prompt}` in the body; new proxy expects `{type, context}`. Mismatched versions break all AI insights.

## Stripe / Subscription

- `stripe-webhook` **must** be deployed with `--no-verify-jwt`. Stripe's server sends requests with only a `Stripe-Signature` header (no Bearer JWT). The Supabase gateway returns 401 before the function body runs, causing all webhook events to silently fail. Internal auth is handled by `stripe.webhooks.constructEventAsync` (signature verification), not by a JWT.
- `stripe-portal` likewise needs `--no-verify-jwt` — users are redirected to Stripe and return without a fresh JWT context.
- After fixing a bad deployment, go to Stripe Dashboard → Developers → Webhooks → endpoint → Recent Deliveries and click **Resend** on each failed event. Stripe retries automatically (~51 min) but manual resend is instant.
- Stripe webhook payloads use the **webhook endpoint's configured API version**, not the version passed to `new Stripe(key, { apiVersion })`. If the webhook version is newer (e.g. `2026-02-25.clover`), fields like `current_period_start` / `current_period_end` on the Subscription object may be absent or null. Guard all timestamp conversions: `sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null`. Calling `new Date(NaN).toISOString()` throws a `RangeError` and returns 500.

- Vite only exposes env vars prefixed with `VITE_` to the browser. Stripe price IDs used in the frontend must be `VITE_STRIPE_PRICE_MONTHLY` / `VITE_STRIPE_PRICE_YEARLY`, not bare `STRIPE_*` names.
- Edge function fallback env var names must exactly match what is set in Supabase secrets — a mismatch silently falls back to `''` and causes a 400 "Missing priceId" error.
- Stripe test mode and live mode use separate webhook signing secrets — a mismatch causes every webhook to fail signature verification.
- A Stripe price must have an active product to be purchasable. Archiving a product prevents checkout even in test mode.
- `consent_collection: { terms_of_service: 'required' }` in checkout session creation requires a ToS URL to be set in Stripe Dashboard → Settings → Customer Portal — otherwise checkout creation throws a 400.
- Nested modal z-index: if an auth modal is triggered from inside an upgrade modal (z-[9999]), the auth modal must use a higher z-index (z-[99999]) or it will be hidden behind the parent modal.
- PostgREST `.single()` throws a 406 if zero rows match. Use `.maybeSingle()` for queries that may legitimately return no rows (e.g., users with no subscription).
- Supabase `?checkout=success` return URL param must be cleared from the address bar with `history.replaceState` immediately after reading, otherwise a page refresh re-triggers the success banner.

## Tax Data DB / Live Bindings

- Tax data lives in the `tax_data` Supabase table (`province`, `tax_year`, `data JSONB`). Bundled JSON files in `data/` remain as fallback — if the table is empty or the fetch fails, the app silently uses the static imports.
- `taxTables.js` uses ES module `let` exports (live bindings). Calling `_injectLiveTaxData(federal, provinces)` updates every importer's view of `PROVINCE_DATA`, `FEDERAL_BRACKETS`, `OAS_PARAMS`, etc. immediately — no engine or component changes needed. Calling with `(null, null)` resets to static/bundled values.
- `TaxDataProvider` must wrap the entire app (in `main.jsx`, inside `AuthProvider`) so the DB fetch and inject happen before any projection runs.
- The `maintenance` edge function cannot read files from the Deno filesystem at runtime — `/DATA` is FUSE and not mounted inside Supabase's edge runtime. Hardcode any data the function needs (e.g., the 18-act CanLII list).
- `runTaxSmokeTest` (exported from `TaxDataEditor.jsx`) runs an inline bracket calculation — it does NOT call `_injectLiveTaxData`. This keeps the smoke test side-effect-free and safely callable from tests without touching global state.
- "Seed from bundled JSON" posts the currently-bundled data to the edge function. It is idempotent (upsert on `province, tax_year`). Always run seed before expecting the Maintenance editor to show real data from the DB.

## Optimizer Engine / Test Scenarios

- **CPP deferral lifts lifetime income, not just depletion age**: At a long life expectancy (85+), CPP deferred to 70 earns a 42% bonus for many years, so its *lifetime income* often beats all alternatives even when the portfolio is thin. The "recommend earlier CPP" test needs a *short* life expectancy (LE ≈ 74) so the deferral bonus doesn't compensate for the missing collection years. At LE=74, CPP@64 collects for 10 years vs CPP@70 for only 4 — earlier wins.
- **RRSP meltdown needs low baseline expenses to have marginal effect**: If the person is already drawing RRSP heavily for living expenses (e.g. $54K/yr when monthly expenses are $4500), the meltdown amounts ($10–30K/yr) are *less* than the natural draws and have zero marginal impact. Use low expenses (≤$30K/yr) so natural RRSP draws are small and the meltdown represents a genuine additional withdrawal that shifts tax timing.
- **Optimizer scores are per-scenario, independent per dimension**: Each dimension is tested in isolation against the baseline — interactions between dimensions (e.g. "defer CPP and also do meltdown") are not jointly optimised. Applying a recommendation updates the scenario, then re-running re-scores all dimensions against the new baseline.
- **Skip logic prevents noise**: meltdown + withdrawalOrder skip when `rrspBalance + rrifBalance === 0`; expenses skip when `base.depletion === null`; spouse dims skip when `!isCouple`. Tests should assert these dimensions are *absent* from both `recommendations` and `alreadyOptimal` (not just not recommended).

## Monthly Savings / Contribution Room

- `monthlySavings` routes savings in a cascade: RRSP → TFSA → NonReg. RRSP is first because it's tax-deductible.
- RRSP contributions capped at `min(target, $32,490/yr, available room)`
- Contributions only during working years (pre-retirement, `stillWorking: true`)
- Couple mode: split proportional to each person's employment income, capped at each person's $32,490 limit. Overflow from one spouse's capped account flows back to the other.
- TFSA cascade (couples): after RRSP, remainder splits proportionally. Spouse TFSA overflow → primary TFSA, and primary TFSA overflow → spouse TFSA. This cross-filling ensures no room is wasted.
- RRSP room accrues at `min(earnedIncome * 18%, $32,490)` annually
- TFSA room accrues `$7,000/yr` per person (CRA annual limit). Room accrual happens BEFORE savings allocation each year — this means even `tfsaContributionRoom: 0` gets $7K available in year 1.
- Affordability cap: two-stage — `capToAffordable()` pre-caps target at rough after-tax surplus, then `applyAffordabilityCap()` post-loop reduces contributions if surplus is still negative. Scale-back order: NonReg first, then TFSA (proportional), then RRSP (proportional).
- `monthlySavings: 0` or `undefined` is a true no-op — identical to baseline projections
- **TFSA room estimation** (`tfsaLimits.js`): estimates room as `cumulativeLimit - balance`. This is inherently inaccurate — it assumes no past withdrawals (withdrawals restore room the following year). RRSP room estimation is even rougher — depends on full income history we don't have. Both are starting points only; wizard UI should encourage users to check their CRA My Account.
- **Savings cascade vs surplus deposits are separate flows**: The savings cascade (from `allocateSavings()`) runs during the contribution phase. Surplus deposits run AFTER the tax loop converges and handle leftover cash. Both write to the same output fields (`tfsaDeposit`, `spouseTfsaDeposit`, `nonRegDeposit`) as combined totals. When debugging, trace which flow contributed what — the engine sums them at output time.
- **Excel formulas must mirror both flows**: The Projection sheet has separate formula fragments for savings-cascade deposits and surplus deposits. They must stay in sync with the engine. A common bug: adding a deposit path in the engine but forgetting to wire it in the Excel formula, causing Excel and engine to diverge silently.

## Projection Engine Pitfalls

- **`surplus` field is always zero in projection output**: `projectionEngine.js` computes `surplus = afterTaxIncome - expenses - debtPayments`, then immediately deposits any positive remainder into TFSA/non-reg accounts, zeroing out `surplus`. Never use `surplus` for savings calculations or KPIs. Instead use `tfsaDeposit + nonRegDeposit` for actual new savings, or `totalPortfolio` deltas for portfolio trajectory.
- **Portfolio growth ≠ deposits**: A user may have $0 in deposits (no income surplus) but $2.75M in portfolio — all growth comes from compounding pre-existing RRSP/TFSA/non-reg balances. KPIs must handle zero-deposit scenarios gracefully.
- **Surplus deposit order is Primary TFSA → Spouse TFSA → NonReg**: After savings cascade, surplus auto-deposits fill primary TFSA first, then spouse TFSA (couples only), then NonReg. Previously surplus skipped spouse TFSA entirely, routing ~$7K/yr to taxable NonReg instead of tax-free spouse TFSA over 28+ working years.
- **Audit waterfall deposits must include ALL account types**: `auditInvestmentReturns.js` computes returns as `portfolioChange + withdrawals - deposits`. If any deposit type (RRSP, spouse RRSP, spouse TFSA) is omitted from `D`, the residual inflates "Returns" by that amount. Always include `rrspDeposit`, `spouseRrspDeposit`, `tfsaDeposit`, `spouseTfsaDeposit`, and `nonRegDeposit` in both `computeYearReturns` and `aggregatePhase`.

## Expense-Debt Overlap

- Engine treats `monthlyExpenses` and debt payments as independent additive outflows
- If a user's expenses already include mortgage/debt payments, the engine double-counts
- `expensesIncludeDebt: true` flag causes the engine to subtract initial annual debt payments from `baseExpenses` before the loop
- The adjustment uses initial debt balances and is permanent across all years — after debt payoff, freed cash becomes surplus
- `Math.max(0, ...)` prevents negative expenses if debt payments exceed total expenses

## Estate Rules (Ontario)

- RRSP/RRIF deemed fully disposed at death (unless spouse rollover)
- Non-reg investments deemed disposed at FMV
- Probate: $5/K first $50K + $15/K above
- Intestate: spouse preferential share $350K, then split with children
- **Couple mode**: Estate engine includes spouse RRSP/TFSA in `grossEstate` (household total). Spouse's own accounts are NOT taxable (surviving spouse owns them) and bypass probate. Tax and probate calculations remain primary-only.

## Beta Promotion (admin_config RLS)

- `admin_config` has RLS enabled with no general client policies (service role only). A targeted SELECT policy (`config_key LIKE 'beta_promotion_%'`) allows the landing page to read promotion config without authentication. No other `admin_config` keys are exposed.
- The `handle_new_user()` trigger auto-grants `subscription_override = 'beta'` with an `override_expires_at` when a new user signs up during an active promotion. It skips admin-invited users (those with `subscription_override` in `raw_user_meta_data`) and returning users (those with an existing `subscription_override`).

## AI Context (buildAiData) — Couple Mode

- `buildDashboardAiData()` sends couple fields (spouseAge, spouseRetirementAge, spouseEmploymentIncome, spouseRrspBalance, spouseTfsaBalance, spouseCppMonthly, spouseOasMonthly, spousePensionIncome) only when `isCouple` is true. Single scenarios omit these fields to keep the Gemini prompt clean.
- `buildEstateAiData()` includes `spouseRrspBalance` and `spouseTfsaBalance` from the estate result so Gemini can report true household estate value.

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

## Estate Rules (Ontario)

- RRSP/RRIF deemed fully disposed at death (unless spouse rollover)
- Non-reg investments deemed disposed at FMV
- Probate: $5/K first $50K + $15/K above
- Intestate: spouse preferential share $350K, then split with children

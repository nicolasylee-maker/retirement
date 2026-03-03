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

## Estate Rules (Ontario)

- RRSP/RRIF deemed fully disposed at death (unless spouse rollover)
- Non-reg investments deemed disposed at FMV
- Probate: $5/K first $50K + $15/K above
- Intestate: spouse preferential share $350K, then split with children

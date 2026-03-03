# Going Live with Stripe — RetirePlanner.ca

This checklist switches the app from Stripe **test mode** to **live mode**.
Execute steps in order. Do not skip the redeployment step.

---

## Pre-flight

- You have access to the Stripe Dashboard (stripe.com)
- You have access to Supabase Dashboard → Project Settings → Edge Functions → Secrets
- You have access to Vercel → Project → Settings → Environment Variables
- You have the Supabase CLI authenticated (`supabase login`)

---

## Steps

### 1. Switch to Live Mode in Stripe Dashboard

Toggle the **Test / Live** switch in the top-left of the Stripe Dashboard.
All subsequent Stripe steps must be done while in Live mode.

---

### 2. Create Live Products & Prices

1. Go to **Products → Add Product**
2. Name: `RetirePlanner Pro`
3. Add two prices:
   - **Monthly**: $5.00 CAD / month (recurring)
   - **Annual**: $44.00 CAD / year (recurring)
4. Copy both price IDs:
   - `price_live_monthly` → looks like `price_1Xxxxxlive...`
   - `price_live_yearly` → looks like `price_1Xxxxxlive...`

---

### 3. Create a Live Webhook Endpoint

1. Go to **Developers → Webhooks → Add endpoint**
2. **Endpoint URL**:
   ```
   https://kovxoeovijedvxmulbke.supabase.co/functions/v1/stripe-webhook
   ```
3. **Events to listen for** (select all of these):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (`whsec_live_...`) — shown once after creation

---

### 4. Copy the Live Secret Key

1. Go to **Developers → API Keys**
2. Copy the **Secret key** (`sk_live_...`)
3. Keep this safe — treat it like a password

---

### 5. Update Supabase Prod Secrets

**Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Update (or add) these two secrets:

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` from step 4 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` from step 3 |

---

### 6. Update Vercel Environment Variables

**Vercel → Project → Settings → Environment Variables**

Add or update these vars (set scope to **Production**):

| Key | Value |
|-----|-------|
| `VITE_STRIPE_PRICE_MONTHLY` | live monthly price ID from step 2 |
| `VITE_STRIPE_PRICE_YEARLY` | live annual price ID from step 2 |

> These override `.env.local` in production. Your local `.env.local` keeps test
> price IDs — local dev stays on test mode permanently.

---

### 7. Redeploy All Three Stripe Edge Functions

The functions need to restart to pick up the new Supabase secrets:

```bash
cd /DATA/retirement
supabase functions deploy stripe-checkout --use-api --no-verify-jwt
supabase functions deploy stripe-portal --use-api --no-verify-jwt
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

---

### 8. Trigger a Vercel Redeploy

Vercel must redeploy to bake the new price IDs from step 6 into the frontend bundle.

Options (pick one):
- Push an empty commit: `git commit --allow-empty -m "chore: trigger live mode deploy" && git push`
- Or use Vercel Dashboard → Deployments → Redeploy on the latest deployment

---

### 9. Test with a Real Card

On the **production URL** (not localhost):
1. Sign in with a test account (or a fresh account)
2. Click Upgrade → choose a plan → complete checkout with a real card
3. Confirm the subscription row appears in Supabase → `subscriptions` table
4. Confirm features unlock (What-If, Compare, Estate, AI Insights)
5. Confirm Stripe Dashboard → Customers shows the subscription as **Active**

---

### 10. Do NOT Change `.env.local`

Leave `.env.local` as-is with test price IDs. Local development uses test mode.

After going live, Supabase prod secrets use `sk_live_...` — this means local dev
cannot call the deployed edge functions with test price IDs (Stripe will reject the
mismatch). Use the Stripe CLI (`stripe listen --forward-to ...`) or the Stripe
Dashboard test mode for local webhook testing.

---

## Rollback

If something goes wrong:
1. In Supabase secrets, restore `STRIPE_SECRET_KEY` to `sk_test_...` and
   `STRIPE_WEBHOOK_SECRET` to the test `whsec_...`
2. In Vercel env vars, restore test price IDs
3. Redeploy edge functions and trigger a Vercel redeploy
4. In Stripe Live mode, deactivate the live webhook endpoint to stop deliveries

---

## Reference

- Supabase project ref: `kovxoeovijedvxmulbke`
- Stripe webhook URL: `https://kovxoeovijedvxmulbke.supabase.co/functions/v1/stripe-webhook`
- Edge function deploy flags: always `--use-api --no-verify-jwt` (see `docs/learned-rules.md`)

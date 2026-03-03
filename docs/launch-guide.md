# RetirePlanner.ca — Launch Guide

Complete step-by-step instructions for setting up every external service and running all three environments.

---

## Service Sign-Up Order

Do these **in order**. Later steps depend on earlier ones.

---

### Step 1 — GitHub (repo must exist)

Your code needs to be pushed to a public or private GitHub repo before anything else. The repo is already set up at `https://github.com/nicolasylee-maker/retirement`.

**Action:** Merge all feature branches to `main` and push.

```bash
# From /media/nick/DATA/retirement (main worktree)
git checkout main
git merge feat/legal-pages
git merge feat/database-schema
git merge feat/app-state-refactor
# ... (merge remaining waves as they complete)
git push origin main
```

---

### Step 2 — GoDaddy (Domain Registration)

**Why first:** You need the domain confirmed before setting DNS records for any other service.

1. Go to **godaddy.com** → search `retireplanner.ca`
2. Purchase the `.ca` domain (requires Canadian address)
3. Log in to GoDaddy DNS Manager → **My Products → retireplanner.ca → DNS**
4. Leave DNS alone for now — you'll add records in Steps 4, 5, and 6 below

**What you'll add later:**
- `A` or `CNAME` record pointing to Vercel (Step 4)
- SPF / DKIM / DMARC records for Resend (Step 6)

---

### Step 3 — Supabase (Database + Auth + Edge Functions)

**Time:** ~20 minutes

1. Go to **supabase.com** → Create account (GitHub sign-in recommended)
2. **New project:**
   - Name: `retirement-prod`
   - Region: **Canada (Central)** — `ca-central-1` ← mandatory for PIPEDA
   - Generate a strong database password and save it in a password manager
3. Wait for project to provision (~2 min)

4. **Run migrations:** In Supabase dashboard → SQL Editor → paste and run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   (Run in order, one at a time)

5. **Save these values** (Project Settings → API):
   - `Project URL` → this is `VITE_SUPABASE_URL`
   - `anon public` key → this is `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (used in Edge Functions only, never in browser)

6. **Create a second project for staging (optional but recommended):**
   - Name: `retirement-dev`
   - Same region
   - Run the same migrations
   - Save separate env vars

---

### Step 4 — Vercel (Frontend + Edge Functions)

**Time:** ~10 minutes

1. Go to **vercel.com** → Create account (GitHub sign-in)
2. **New Project** → Import from GitHub → select `nicolasylee-maker/retirement`
3. Framework preset: **Vite**
4. Build settings: leave defaults (`npm run build`, output `dist`)
5. **Environment Variables** — add all from `.env.example`:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   VITE_ADMIN_EMAIL=your@email.com
   ```
   (Add Stripe and Sentry env vars later as you complete those steps)
6. Deploy → Vercel assigns a `xxx.vercel.app` URL

7. **Add custom domain:**
   - Vercel dashboard → your project → Settings → Domains → Add `retireplanner.ca`
   - Vercel gives you DNS records (usually an `A` record)
   - Go back to GoDaddy DNS → add those records
   - Wait for DNS propagation (~5–30 min)
   - HTTPS is automatic via Vercel

8. **Staging domain (optional):** Vercel auto-creates preview URLs for every PR. You can also pin `retirement-dev.vercel.app` to your dev Supabase project via environment variable overrides in Vercel → Settings → Environment Variables (select "Preview" environment only).

---

### Step 5 — Google Cloud Console (OAuth for Sign-In)

**Time:** ~15 minutes. Required before any user can sign in with Google.

1. Go to **console.cloud.google.com**
2. Create a new project: `retireplanner`
3. Navigation → **APIs & Services → OAuth consent screen:**
   - User type: **External**
   - App name: `RetirePlanner.ca`
   - User support email: `hello@retireplanner.ca`
   - App logo: upload your logo
   - **Authorized domains:** add `retireplanner.ca` and `supabase.co`
   - Privacy policy URL: `https://retireplanner.ca/privacy` ← must be live before Google approves production
   - Terms URL: `https://retireplanner.ca/terms`
   - Scopes: add `email` and `profile`
   - Test users: add your own email(s) during development
   - Submit for verification (takes 1–7 days for production approval)

4. Navigation → **APIs & Services → Credentials → Create Credentials → OAuth client ID:**
   - Application type: **Web application**
   - Name: `RetirePlanner Production`
   - Authorized JavaScript origins: `https://retireplanner.ca`
   - Authorized redirect URIs: `https://xxx.supabase.co/auth/v1/callback` (use your actual Supabase project URL)
   - Save → copy **Client ID** and **Client Secret**

5. Back in **Supabase** → Authentication → Providers → Google:
   - Enable Google
   - Paste Client ID and Client Secret
   - Save

6. Create a **separate OAuth client for local dev:**
   - Same steps, but origins: `http://localhost:5173`
   - Redirect URI: `http://localhost:54321/auth/v1/callback` (local Supabase)
   - These credentials go in your local `.env` file

---

### Step 6 — Resend (Magic Link Emails)

**Time:** ~15 minutes

1. Go to **resend.com** → Create account
2. Dashboard → **Domains → Add Domain** → enter `retireplanner.ca`
3. Resend gives you DNS records: SPF (`TXT`), DKIM (`TXT`), and DMARC (`TXT`)
4. Add all three records in GoDaddy DNS Manager
5. Back in Resend → click **Verify DNS** (can take 5–30 min)
6. Resend → API Keys → Create → name it `supabase-smtp` → copy the key

7. In **Supabase** → Project Settings → Auth → SMTP Settings:
   - Enable Custom SMTP: on
   - Sender name: `RetirePlanner`
   - Sender email: `hello@retireplanner.ca`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: (your Resend API key)
   - Save

8. Save API key as `RESEND_API_KEY` in Vercel env vars (needed by Edge Functions for invite emails).

---

### Step 7 — Stripe (Subscriptions + Billing)

**Time:** ~30 minutes

1. Go to **stripe.com** → Create account
2. Complete identity verification (required for Canadian payouts)
3. Add your bank account for payouts

4. **Create products (in Stripe dashboard → Products):**
   - Product: `RetirePlanner Premium`
   - Add price 1: `$5.00 CAD / month` (recurring)
   - Add price 2: `$44.00 CAD / year` (recurring)
   - Copy both **Price IDs** (e.g. `price_xxx`) — you'll need them in env vars

5. **Enable Customer Portal:**
   - Stripe → Settings → Billing → Customer Portal
   - Enable: cancel subscription, update payment method, view invoices
   - Set cancellation: at end of billing period (not immediately)
   - Save portal link (appears in settings — use this in your app's "Manage Subscription" button)

6. **Webhooks:**
   - Stripe → Developers → Webhooks → Add endpoint
   - URL: `https://xxx.supabase.co/functions/v1/stripe-webhook` (your Supabase Edge Function URL)
   - Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `checkout.session.completed`
   - Copy **Webhook Signing Secret** (`whsec_xxx`)

7. **Save these in Vercel env vars:**
   ```
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_PRICE_MONTHLY=price_xxx
   STRIPE_PRICE_YEARLY=price_xxx
   ```
   Also add to Supabase Edge Function secrets (Supabase → Edge Functions → Secrets).

8. **Test mode first:** Before going live, use Stripe test mode (toggle in top-left). Test card: `4242 4242 4242 4242`. Switch to live mode only when ready to accept real payments.

---

### Step 8 — Plausible Analytics

**Time:** ~5 minutes

1. Go to **plausible.io** → Create account ($9/month)
   - Alternatively, use the **Vercel Marketplace** integration (may auto-add the script)
2. Add site: `retireplanner.ca`
3. Plausible gives you a script tag — it goes in `index.html` (handled in `analytics-monitoring` spec)
4. No DNS changes needed

---

### Step 9 — Sentry (Error Monitoring)

**Time:** ~10 minutes

1. Go to **sentry.io** → Create account (free tier: 5,000 errors/month)
2. Create project: **React** → name it `retireplanner`
3. Copy the **DSN** (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)
4. Add to Vercel env vars:
   ```
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   VITE_ENV=production
   ```
   (The `analytics-monitoring` spec wires this into `src/main.jsx`)

---

## Summary — All Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Admin
VITE_ADMIN_EMAIL=your@email.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_xxx

# Resend (for Edge Functions)
RESEND_API_KEY=re_xxx

# Sentry (optional, production only)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_ENV=production
```

**Never commit `.env` to git.** `.env.example` (no real values) is committed; `.env` is gitignored.

---

## Running Environments

### Local Development (daily coding)

Uses Supabase running on your laptop — no internet, instant, free.

```bash
# One-time: install Supabase CLI
npm install -g supabase

# One-time: log in
supabase login

# One-time: link to your cloud project (optional, for DB push/pull)
supabase link --project-ref xxx

# Start local Supabase (Docker required)
supabase start
# Output shows: API URL, DB URL, Studio URL

# Run the app (uses local Supabase)
npm run dev
```

Local Supabase runs at:
- **API:** http://localhost:54321
- **Studio (DB admin UI):** http://localhost:54323
- **App:** http://localhost:5173

Stop local Supabase when done: `supabase stop`

**Local env vars** (in `.env`): point `VITE_SUPABASE_URL` at `http://localhost:54321`

> Once the `deployment-environments` spec is implemented, use `npm run dev:local` instead.

---

### Staging / Preview (testing with real cloud)

Vercel auto-creates a preview URL for every pull request. Use your `retirement-dev` Supabase project.

```bash
# Push a branch — Vercel auto-deploys it
git push origin feat/my-feature
# Vercel posts preview URL in GitHub PR
```

Or run locally against the dev cloud:

```bash
# Set VITE_SUPABASE_URL to retirement-dev project URL in .env
npm run dev
```

> Once `deployment-environments` spec is implemented: `npm run dev:dev`

---

### Production

Vercel auto-deploys whenever you push to `main`.

```bash
git checkout main
git merge feat/my-feature
git push origin main
# Vercel deploys automatically in ~30 seconds
```

Monitor live at: https://retireplanner.ca

> Once `deployment-environments` spec is implemented: `npm run dev:prod` to test against live backend locally.

---

## Post-Launch Checklist

- [ ] retireplanner.ca domain resolves
- [ ] HTTPS works (Vercel auto-provisions cert)
- [ ] Google OAuth works (sign-in test)
- [ ] Magic link arrives in email (from hello@retireplanner.ca)
- [ ] Stripe test checkout completes (use card `4242 4242 4242 4242`)
- [ ] Stripe webhook fires and subscription row appears in Supabase
- [ ] Plausible shows a page view for your test visit
- [ ] Sentry captures a test error
- [ ] `/privacy` and `/terms` pages load (Vercel rewrite from `vercel.json`)
- [ ] Google OAuth consent screen lists live privacy URL
- [ ] Submit Google OAuth for production verification (if not already done)

---

## Annual Maintenance

```bash
# Check tax data freshness (run every January)
npm run update:tax

# Check legislation URLs still resolve
npm run check:legislation

# Regenerate golden regression snapshots after tax-year update
npm run generate:golden
```

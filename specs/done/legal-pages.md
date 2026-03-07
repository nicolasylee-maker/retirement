# Spec: Legal Pages — Privacy Policy, Terms of Service, Disclaimer

## Status
Pending implementation

## Why This Is a Launch Blocker

You cannot go live without these. Specifically:
- **Google OAuth** requires a live, publicly accessible Privacy Policy URL before Google approves your OAuth consent screen for production. Without it, sign-in only works for test users you manually whitelist.
- **Stripe** requires your Terms of Service URL on the checkout page (Stripe's legal requirements for payments).
- **PIPEDA** (Canada's privacy law) requires you to disclose how you collect, use, and store personal data.
- **Basic trust** — users entering retirement financial data need to know you're not selling it.

---

## Pages Required

### 1. Privacy Policy (`/privacy`)
**Content you need to write (or use a generator + customize):**
- What data you collect (email, Google profile, retirement scenario data)
- How it's stored (Supabase, Canada Central servers)
- Who has access (you only; no selling, no sharing)
- Third parties: Supabase (database/auth), Stripe (payments), Google (OAuth)
- Data retention and deletion (how to request account deletion)
- Contact info for privacy requests

**Key Canadian-specific statements:**
- Data stored in Canada (Supabase ca-central-1)
- Compliance with PIPEDA (Personal Information Protection and Electronic Documents Act)
- Users can request their data be exported or deleted (email to contact you)

### 2. Terms of Service (`/terms`)
**Content you need to write:**
- Acceptance of terms
- Description of the service (a planning tool, not professional financial advice)
- Subscription terms (monthly/annual, trial period, cancellation policy)
- Refund policy (Stripe handles this, but document your policy — "cancel anytime, no refunds on partial periods" is standard)
- Limitation of liability
- Governing law (Ontario, Canada)

### 3. Not Financial Advice Disclaimer
**Already in the app footer:** "Not financial advice."
This needs to be more prominent:
- Shown on the first wizard step (small but visible)
- Included on the dashboard
- Full statement on the Terms page: "This tool provides calculations for planning purposes only. It is not a substitute for advice from a qualified financial advisor, tax professional, or lawyer."

---

## Routes

Since this is an SPA (no server-side routing), use hash-based routes or a simple view switch in App.jsx:

```javascript
// In App.jsx view routing
case 'privacy': return <LegalPage page="privacy" />
case 'terms':   return <LegalPage page="terms" />
```

Or better: open these as new tabs (plain HTML files served from `/public`). Simpler — no React needed.

**Recommended approach: static HTML files in `/public`**
- `public/privacy.html`
- `public/terms.html`
- Vite serves `/public` at the root — these are accessible at yourdomain.com/privacy.html
- No React needed, loads instantly, easy to update
- Redirect `/privacy` → `/privacy.html` via Vercel's `vercel.json` rewrites

`vercel.json`:
```json
{
  "rewrites": [
    { "source": "/privacy", "destination": "/privacy.html" },
    { "source": "/terms",   "destination": "/terms.html"   }
  ]
}
```

---

## Footer Links (all views)

Add a minimal footer to all post-wizard views (dashboard, compare, estate):

```
© 2026 [AppName] · Privacy · Terms · Not financial advice
```

Footer links open privacy.html and terms.html in a new tab.

Currently the app has `"Built for Ontarians. Not financial advice."` only on the WelcomeScreen. Move this to a persistent footer.

---

## Stripe Checkout: ToS Acceptance

Stripe Checkout can show a checkbox: "I agree to the Terms of Service" with a link. Configure in Stripe Dashboard → Checkout Settings → Custom text. This satisfies Stripe's legal requirement without any code changes.

Alternatively, add to the `create-checkout-session` Edge Function:
```javascript
// Stripe Checkout session config
consent_collection: {
  terms_of_service: 'required'
}
```
And set `terms_of_service_acceptance` URL in Stripe Dashboard.

---

## Google OAuth: Privacy Policy URL

When you set up Google OAuth in Google Cloud Console:
1. Go to OAuth Consent Screen
2. Add your Privacy Policy URL: `https://yourdomain.com/privacy`
3. Add your Terms of Service URL: `https://yourdomain.com/terms`
4. These URLs must be live and accessible before Google approves production OAuth

**You must do this before going live with Google sign-in.** Test mode works for you (whitelist your email), but anyone else will get a "This app isn't verified" error until approval.

---

## Account Deletion Flow

PIPEDA requires users to be able to request data deletion. Implement the minimum viable version:
- "Delete my account" option in AccountMenu → sends an email to you with their user ID
- You manually delete from Supabase Studio (acceptable for small user base)
- OR: add a `delete-account` Edge Function (one call, deletes the user from auth.users → cascades to all tables via ON DELETE CASCADE)

The Edge Function approach is better UX and should be the target:

```
POST /functions/v1/delete-account
Authorization: Bearer <user-jwt>
→ supabase.auth.admin.deleteUser(userId)
→ CASCADE deletes scenarios, subscriptions, ai_usage
→ Cancel Stripe subscription if active
→ Return { success: true }
```

Add `DeleteAccountButton` to AccountMenu → confirmation dialog → calls Edge Function → signs out.

---

## Acceptance Criteria
- [ ] `public/privacy.html` exists with real content (not placeholder)
- [ ] `public/terms.html` exists with real content (not placeholder)
- [ ] `vercel.json` rewrites `/privacy` and `/terms` to the HTML files
- [ ] Footer with privacy/terms links appears on all dashboard views
- [ ] Google OAuth consent screen has Privacy Policy URL configured
- [ ] Stripe Checkout links to Terms of Service
- [ ] "Not financial advice" disclaimer visible on wizard step 1 AND dashboard
- [ ] "Delete my account" option in AccountMenu (either email-based or Edge Function)

## Files to Create
- `public/privacy.html`
- `public/terms.html`
- `vercel.json`
- `supabase/functions/delete-account/index.ts` (if building the self-serve version)

## Files to Modify
- `src/App.jsx` or global layout — add persistent footer
- `src/components/AccountMenu.jsx` — add "Delete account" option
- `src/views/wizard/WizardShell.jsx` — add disclaimer on step 1

## Content Tools
- Privacy policy generator: https://www.privacypolicies.com or https://www.iubenda.com (has Canadian/PIPEDA templates)
- Terms generator: https://termsfeed.com
- **Review the generated content** — generators create a solid starting point but you need to verify the Supabase/Stripe/Google sections are accurate for your setup.

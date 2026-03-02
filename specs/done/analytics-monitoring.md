# Spec: Analytics & Error Monitoring

## Status
Pending implementation

## Overview
Two tools, each for a different purpose:
- **Plausible Analytics** — know if users are coming, where they're dropping off in the wizard, and what's converting
- **Sentry** — know when production breaks before users complain

Both are lightweight, privacy-respecting, and fast to set up.

---

## Tool 1: Plausible Analytics

### Why Plausible (not Google Analytics)
- No cookie consent banner required — Plausible is cookieless and GDPR/PIPEDA-compliant by design
- No data sold, no tracking, no fingerprinting
- Data stored in EU (or self-hosted) — no sharing with Google
- Dashboard is dead simple: page views, unique visitors, sources, top pages
- $9/month. Worth it to skip the cookie consent complexity.

### What to track (standard Plausible events)
Plausible auto-tracks page views. Add custom events for the funnel:

| Event | When it fires | Why |
|---|---|---|
| `wizard_step_completed` | User advances past each step | See dropout by step |
| `wizard_completed` | User finishes step 9 | Completion rate |
| `save_nudge_shown` | Save nudge screen appears | Conversion funnel |
| `signup_completed` | User signs in (Google or magic link) | Auth conversion |
| `upgrade_clicked` | User clicks "Start free trial" | Purchase intent |
| `subscription_started` | Stripe checkout completed (Stripe sends this via webhook — log to Plausible via Events API) | Revenue |

### Setup
1. Sign up at plausible.io, add your domain
2. Add the script tag to `index.html`:
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.tagged-events.js"></script>
```
3. Add a `src/utils/analytics.js` helper:
```javascript
export function trackEvent(name, props = {}) {
  if (typeof window.plausible !== 'undefined') {
    window.plausible(name, { props })
  }
}
```
4. Call `trackEvent('wizard_step_completed', { step: 3 })` in `WizardShell.jsx` on each step advance

### Vercel Integration
Plausible has a Vercel integration that auto-adds the script. Check Vercel Marketplace → Plausible Analytics.

---

## Tool 2: Sentry (Error Monitoring)

### Why Sentry
- When production breaks, you find out immediately instead of from a confused user email
- Captures: unhandled JS errors, React render errors, network failures
- Free tier: 5,000 errors/month — more than enough for launch
- Shows you the exact file, line number, and user action that caused the error

### Setup
```bash
npm install @sentry/react
```

In `src/main.jsx`:
```javascript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENV || 'production',
  enabled: import.meta.env.PROD,   // disabled in dev
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,           // 10% of requests traced (performance)
})
```

Wrap App in `Sentry.ErrorBoundary` in `src/main.jsx`:
```javascript
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

`ErrorFallback` component shows a friendly "Something went wrong — we've been notified" message with a "Reload" button.

### Environment variable
```
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Add to `.env.example`. Do NOT enable in local dev (too noisy, irrelevant).

---

## What You'll See at Launch

**Plausible dashboard (day 1):**
- How many people visited
- Where they came from (direct, Google, social)
- Which wizard steps people are completing vs abandoning
- Signup conversion rate

**Sentry dashboard (day 1):**
- Any JS errors that occur for real users
- Stack traces with exact line numbers
- Which browser/device the error occurred on

---

## Acceptance Criteria
- [ ] Plausible script in `index.html` for production domain only
- [ ] `trackEvent` utility function created and called on wizard step advances, wizard completion, save nudge shown, signup completed, upgrade clicked
- [ ] Sentry initialized in `src/main.jsx` (production only)
- [ ] Sentry `ErrorBoundary` wrapping `<App />`
- [ ] `ErrorFallback` component with friendly error message + reload button
- [ ] `VITE_SENTRY_DSN` in `.env.example`
- [ ] Neither tool runs in local dev (`import.meta.env.DEV` guard)

## Edge Cases
- Ad blockers will block Plausible (acceptable — ~30% of users won't be tracked, that's fine)
- Sentry should NOT capture auth tokens or financial data — check `beforeSend` hook to scrub sensitive fields
- Sentry performance tracing at 10% sample rate won't noticeably impact performance

## Files to Create
- `src/utils/analytics.js`
- `src/components/ErrorFallback.jsx`

## Files to Modify
- `index.html` — add Plausible script tag
- `src/main.jsx` — add Sentry init + ErrorBoundary
- `src/views/wizard/WizardShell.jsx` — add `trackEvent` calls
- `.env.example` — add `VITE_SENTRY_DSN`

## Dependencies to Add
```bash
npm install @sentry/react
```
(Plausible is a script tag — no npm package needed)

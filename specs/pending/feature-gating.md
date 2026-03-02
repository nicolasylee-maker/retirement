# Spec: Feature Gating

## Status
Pending implementation

## Overview
Gate paid features behind subscription status. Free users see a polished upgrade prompt where paid features would be. Paid users see everything. Anonymous users see only what free users see (no saving).

## Gated Features

| Feature | Component/View | Free behaviour | Paid behaviour |
|---|---|---|---|
| Compare scenarios | `CompareView` | Upsell prompt | Full access |
| Estate planning | `EstateView` | Upsell prompt | Full access |
| What-If panel | `WhatIfPanel` | Upsell prompt | Full access |
| AI insights | `AiInsight` | Upsell prompt | Full access (30/mo quota) |
| PDF / audit report | Download buttons | Disabled + upsell tooltip | Download works |

## UpgradePrompt Component

### `src/components/UpgradePrompt.jsx`

Replaces the content of a gated view/feature.

Props:
- `feature: string` — display name of the gated feature ("Compare Scenarios", "Estate Planning", etc.)
- `icon?: ReactNode` — optional icon to show
- `compact?: boolean` — smaller inline variant for buttons/cards (vs. full-page overlay)

Compact variant (for AI card, PDF button):
- Small lock icon + "Upgrade to unlock" text inline

Full-page variant (for Compare, Estate, WhatIf):
- Centered card with:
  - Feature name
  - Brief description of what they're missing
  - List of all paid features (3–4 bullets)
  - "Start 7-day free trial" CTA → calls `startCheckout(monthlyPriceId)` from SubscriptionContext
  - "See all plans" link → opens billing portal (or a plans modal)
  - Price anchoring: "Only $5/month or $44/year after trial"

## Gate Implementation

### Nav tab gating (Compare, Estate)
In `App.jsx` nav header:
- Tabs still visible (don't hide — the upsell IS the destination)
- Clicking Compare/Estate when free → view renders `<UpgradePrompt feature="Compare Scenarios" />`
- Clicking when paid → renders the actual view

```javascript
// In view switch (App.jsx)
case 'compare':
  return isPaid
    ? <CompareView ... />
    : <UpgradePrompt feature="Compare Scenarios" icon={<ChartIcon />} />
```

### WhatIfPanel gating
- Panel toggle button always visible in dashboard header
- If free: clicking "What-If" opens `<UpgradePrompt compact={false} feature="What-If Analysis" />` as a modal/slide-over instead of the actual panel

### AI Insight gating (AiInsight.jsx)
- If free/anonymous: render `<UpgradePrompt compact feature="AI Insights" />` in place of the AI card
- If paid but quota exceeded (30/mo): render a "Monthly quota reached" state (not an upsell — just informational)
- If paid and within quota: render the AI card as normal

### PDF / Audit Report gating (Dashboard toolbar)
- "Download Report" and "Download Audit" buttons:
  - Free: buttons visible but disabled (greyed), show tooltip "Available on paid plan"
  - Paid: buttons work as normal
- Implementation: wrap button in a `<GatedButton>` that checks `isPaid` before calling the download handler

## GatedButton Component (optional utility)

```javascript
// src/components/GatedButton.jsx
// Renders a disabled button with tooltip if not paid, otherwise renders children as-is
export function GatedButton({ isPaid, featureName, children, onClick }) {
  if (isPaid) return <button onClick={onClick}>{children}</button>
  return (
    <Tooltip content={`Available on paid plan`}>
      <button disabled className="opacity-40 cursor-not-allowed">{children}</button>
    </Tooltip>
  )
}
```

## SubscriptionContext Integration
All gating reads from `SubscriptionContext`:
```javascript
const { isPaid } = useSubscription()
```

`isPaid` is `true` for status `active` or `trialing`. All other statuses (including `past_due`) show a warning but preserve access — see stripe spec.

`past_due` edge case: if subscription is `past_due`, show a persistent banner:
> "Your payment failed. Update your payment method to keep your plan active."
with a link to the Customer Portal. Features remain accessible.

## Acceptance Criteria
- [ ] Anonymous user: Compare, Estate, What-If show UpgradePrompt (same as free)
- [ ] Free signed-in user: Compare, Estate, What-If show UpgradePrompt
- [ ] Free user: PDF + Audit buttons are visible but disabled with tooltip
- [ ] Free user: AI insight cards show compact UpgradePrompt
- [ ] Paid user: all features accessible with no prompts or restrictions
- [ ] `UpgradePrompt` CTA ("Start free trial") calls `startCheckout()` from SubscriptionContext
- [ ] `past_due` users: access retained, persistent payment-failed banner shown
- [ ] `canceled` users: treated same as free (UpgradePrompt shown for paid features)
- [ ] Trialing users: full paid access, optional "X days left in trial" indicator in header

## Trial indicator (optional — implement if simple)
If user is `trialing`:
- Show "Trial: X days left" badge in header
- Links to Customer Portal (to add/confirm payment method)

## Edge Cases
- User pays, refreshes: `SubscriptionContext` re-fetches on mount → gates update
- User cancels mid-session: next page load shows free state (or on window focus re-fetch)
- Subscription context loading: show nothing (no upsell, no content) until resolved
- AI quota at exactly 30: show "Quota reached" (not upsell) — user is a valid paid subscriber

## Files to Create
- `src/components/UpgradePrompt.jsx`
- `src/components/GatedButton.jsx`

## Files to Modify
- `src/App.jsx` — gate Compare and Estate view rendering
- `src/views/WhatIfPanel.jsx` — gate the panel open action
- `src/components/AiInsight.jsx` — gate AI card content
- `src/views/dashboard/Dashboard.jsx` — gate PDF/Audit download buttons via GatedButton
- `src/utils/generateReport.js` — no change (gating is at call site)
- `src/utils/downloadAudit.js` — no change (gating is at call site)

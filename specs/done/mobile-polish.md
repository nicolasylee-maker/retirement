# Spec: Mobile Polish — Full Responsive Pass

## Status: pending

## Description

Make the entire app usable on a 390px phone screen (iPhone 14 / Android baseline).
All views — wizard, dashboard, compare, estate, debt — must work acceptably on touch.
No horizontal scroll. All tap targets ≥ 44px. Charts readable on small screens.

## Scope

Six distinct changes, in implementation order:

### 1. Header — two-row layout on mobile

**Current:** Single flex row: logo + scenario picker + save status + env badge + subscription badge + 3-dots menu + account menu.
**On mobile (< md):**
- Row 1: logo left, [AccountMenu + 3-dots menu] right
- Row 2 (when not in wizard/landing/save-nudge): full-width scenario picker + save status text
- EnvironmentBadge and SubscriptionBadge: hidden on mobile (icon-only or omit entirely — not critical on small screens)
- On desktop (md+): single row, no change

**File:** `src/App.jsx`

### 2. Nav tabs — icon + label on mobile

**Current:** Text-only tabs: Dashboard / Debt / Compare / Estate
**On mobile:** Each tab shows a small SVG icon + short label in a compact pill/tab button.
- Icons: use simple inline SVGs (no icon library — keep consistent with existing inline SVG usage)
  - Dashboard → bar chart icon
  - Debt → credit card icon
  - Compare → columns/layers icon
  - Estate → home/leaf icon
- Labels stay on all screen sizes (they're short enough)
- Tap target: each tab min-h 40px, px-3 py-2

**File:** `src/App.jsx`

### 3. Charts — responsive height (smaller on mobile)

**Current:** Hard-coded heights — 360px (Portfolio), 320px (Account, Income/Expense), 280px (Withdrawal), 400px (Compare)

**On mobile (< sm / < 640px):** Reduce to 60–65% of desktop height using a `useChartHeight(mobile, desktop)` inline hook or by passing a responsive height prop.

Target heights:
| Chart | Mobile | Desktop |
|---|---|---|
| PortfolioChart | 220px | 360px |
| IncomeExpenseChart | 200px | 320px |
| AccountChart | 200px | 320px |
| WithdrawalChart | 180px | 280px |
| CompareChart | 240px | 400px |

Implementation: use a simple `useWindowWidth` hook (or `window.innerWidth < 640` check with a resize listener) inline in each chart to pick the right height. Do NOT add a new shared hook file — inline the two-line logic in each chart file or pass height as a prop from the parent.

**Files:** `src/views/dashboard/PortfolioChart.jsx`, `src/views/dashboard/IncomeExpenseChart.jsx`, `src/views/dashboard/AccountChart.jsx`, `src/views/dashboard/WithdrawalChart.jsx`, `src/views/compare/CompareChart.jsx`

### 4. WhatIfPanel — bottom drawer on mobile

**Current:** Inline collapsible card at top of dashboard content.
**On mobile:**
- Rendered as a sticky bottom drawer, not inline
- A persistent bottom bar shows: "What If? [Modified dot if overrides active] ↑" — tapping slides the panel up as a sheet
- Sheet overlays dashboard content with a semi-transparent backdrop
- Full-screen height drawer on mobile (or 80vh max)
- Close via backdrop tap or explicit close button in drawer header
- "Reset to Defaults" button stays inside the drawer
- On desktop (xl+): behaviour is unchanged (inline collapsible)

**Implementation:** Add a `mobileOpen` state and mobile-specific render path inside `WhatIfPanel.jsx`. Use a portal (via `createPortal(document.body)`) for the mobile overlay to avoid z-index issues with the sticky header. On mobile, hide the inline card; show the bottom bar + portal sheet instead.

**File:** `src/views/WhatIfPanel.jsx`

Also update `src/App.jsx`: the UpgradePrompt that replaces WhatIfPanel for non-paid users should stay inline (not drawer) on mobile — it's read-only, no interaction needed.

### 5. Wizard — touch target pass

**Current:** WizardShell already has a mobile progress bar. Step content may have small inputs and buttons.

Fixes:
- Back/Next buttons: ensure min-h-[44px] on mobile
- Progress bar tap targets (the thin colored segments): add `min-h-[12px]` wrapper so they're easier to tap
- Plan name input in sidebar: already desktop-only (hidden on mobile), fine
- Step form fields: FormField already uses `w-full` inputs; add `py-3` on mobile for taller touch area if currently `py-2`
- "View Results" button: desktop sidebar only, not visible on mobile — fine

**File:** `src/views/wizard/WizardShell.jsx`, possibly `src/components/FormField.jsx` if py is too tight

### 6. SummaryCards — grid tweak for medium screens

**Current:** `grid-cols-2 lg:grid-cols-5` — jumps from 2-col (mobile) to 5-col at 1024px. At 768px–1024px (iPad), 2 columns of 5 cards looks sparse.

**Fix:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`

- Mobile (< 640): 2 columns
- Tablet (640–1023): 3 columns (Net Worth, Income, Tax on row 1; Surplus, Safe Spend on row 2)
- Desktop (1024+): 5 columns

**File:** `src/views/dashboard/SummaryCards.jsx`

## Acceptance Criteria

- [ ] On 390px viewport: header is two rows; no overflow, no horizontal scroll
- [ ] On 390px viewport: all 4 nav tabs visible in one row with icons
- [ ] On 390px viewport: all charts render without clipping; height ≤ 240px
- [ ] On 390px viewport: WhatIfPanel is NOT rendered inline; bottom bar is visible; tapping opens full-screen drawer
- [ ] On 390px viewport: wizard Back/Next buttons have min 44px tap target
- [ ] On 768px viewport: SummaryCards shows 3 columns
- [ ] On 1280px+ viewport: all desktop behaviour is unchanged
- [ ] All 277 tests still pass
- [ ] `npm run build` produces zero errors

## Edge Cases

- WhatIfPanel: non-paid users see UpgradePrompt inline on mobile — no drawer needed, just leave it
- WhatIfPanel drawer: if `overrides` are active and the drawer is closed, the bottom bar shows a dot indicator
- Charts: PortfolioChart receives `chartHeight` as a prop from a parent call site (`CompareView` or `PrintReport`) — the default prop value should change to be responsive; callers that pass explicit heights keep their values
- Header row 2 (scenario picker) must not render in wizard/landing/save-nudge views (same conditions as today's header visibility check)
- Bottom drawer must not trap focus unexpectedly — add `aria-modal` and a close button

## Files to Create

None — all changes are in-place edits.

## Files to Modify

1. `src/App.jsx` — header two-row + nav tab icons
2. `src/views/dashboard/SummaryCards.jsx` — grid breakpoints
3. `src/views/dashboard/PortfolioChart.jsx` — responsive chart height
4. `src/views/dashboard/IncomeExpenseChart.jsx` — responsive chart height
5. `src/views/dashboard/AccountChart.jsx` — responsive chart height
6. `src/views/dashboard/WithdrawalChart.jsx` — responsive chart height
7. `src/views/compare/CompareChart.jsx` — responsive chart height
8. `src/views/WhatIfPanel.jsx` — mobile bottom drawer
9. `src/views/wizard/WizardShell.jsx` — touch target improvements

## Dependencies

- All dependencies already in project: React, ReactDOM (createPortal), Tailwind CSS
- No new packages required

## Out of Scope

- Landing page mobile (it has its own layout and is already relatively responsive)
- EstateView / DebtView / CompareView inner layout (charts are covered; table/grid layouts are a follow-up)
- Print/PDF view (desktop-only intentionally)
- Dark mode
- PWA / installable app

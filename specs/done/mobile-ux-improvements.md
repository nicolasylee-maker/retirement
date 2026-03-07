# Mobile UX Improvements

## Overview

Improve mobile experience for RetirePlanner.ca based on comprehensive UX analysis. Analysis identified 9 issues across landing, wizard, dashboard, and all tabs. This spec focuses on high and medium priority fixes that will have the most impact on mobile usability.

## Background

Mobile UX analysis (2026-03-06) tested on 375x667 viewport (iPhone SE). Key findings:
- ✅ Core functionality works, no blocking bugs
- ⚠️ Navigation overflow, tall banner, small charts reduce usability
- 🎯 Target: optimize for small screens (375-414px width) without breaking desktop

## Priority Breakdown

### Phase 1: High Priority (Critical for Mobile UX)
1. **Navigation tab overflow** - tabs cut off on small screens
2. **Sign-in banner too tall** - takes excessive vertical space
3. **Charts too small** - hard to read data and tap

### Phase 2: Medium Priority (UX Polish)
4. **KPI cards cramped** - horizontal scroll, small text
5. **Portfolio Milestones repetitive** - three identical cards
6. **Wizard form length** - single long page feels overwhelming

### Phase 3: Low Priority (Nice-to-Have)
7. Upgrade modal text length
8. Footer link tap targets
9. Optimize tab before/after tables

## Phase 1 Detailed Requirements

### 1. Mobile Navigation Solution

**Problem:** Horizontal tabs overflow on small screens. Users can't see all tabs (Dashboard, Compare, Estate, Debt, Optimize, Deep Dive).

**Solution Options:**
A. Hamburger menu for mobile (recommended)
B. Icon-only tabs with labels below
C. Horizontally scrollable tabs with visual indicators

**Recommendation:** Option A - hamburger menu at `md` breakpoint and below

**Acceptance Criteria:**
- On mobile (≤768px), replace horizontal tab bar with hamburger icon (☰)
- Clicking hamburger opens slide-out or dropdown menu with all tabs
- Menu shows tab name + icon for each option
- Current tab is highlighted/indicated
- Menu closes after selection
- Smooth animation (slide-in/fade-in, 200-300ms)
- Desktop (>768px) keeps existing horizontal tabs unchanged

**Edge Cases:**
- Menu must close on outside click or ESC key
- Must work when user is signed in vs anonymous
- Premium-gated tabs still show lock icon in menu
- What If panel toggle still accessible (either in menu or separate button)

**Files Affected:**
- `src/components/Header.jsx` - main navigation component
- `src/components/MobileMenu.jsx` (new) - slide-out menu component
- May need `src/hooks/useOutsideClick.js` for close-on-outside-click

**Design Notes:**
- Use Tailwind `md:hidden` and `md:flex` for responsive switching
- Menu should slide from left or top
- Backdrop overlay (semi-transparent black) when menu is open
- Menu items: 44px minimum height for tap targets

---

### 2. Compact Sign-In Banner

**Problem:** Promotional banner ("Sign in before June 1...") is too tall on mobile, pushing content down.

**Solution:** Make banner more compact + add dismiss functionality

**Acceptance Criteria:**
- On mobile (≤768px), reduce banner to single line with smaller text
- Add close/dismiss button (X icon) in top-right of banner
- Clicking X hides banner for current session
- Use localStorage to remember dismissal across visits
- Desktop keeps current banner height/style (or also make compact - TBD)
- Banner should not reappear after dismissal until localStorage cleared OR promotion expires

**Edge Cases:**
- Anonymous users: banner shows by default, can dismiss
- Signed-in users: check if banner should show at all (may not need promo if already signed in)
- If banner promotion has end date, check date before showing

**Files Affected:**
- Component rendering promo banner (likely `src/components/PromoBanner.jsx` or in `src/App.jsx`)
- Add localStorage key: `promoBannerDismissed` with timestamp

**Design Notes:**
- Mobile banner: max 2 lines, 14px font size
- Dismiss button: 32x32px touch target minimum
- Consider showing condensed text: "Sign in by June 1 for 60 days free! [Close]"
- Optional: make banner sticky at top but shorter

---

### 3. Larger Mobile Charts

**Problem:** Dashboard charts (Portfolio Over Time, Income vs Expenses) are small on mobile - hard to read Y-axis, X-axis ages, and line details.

**Solution:** Increase chart height and improve touch interactions for mobile

**Acceptance Criteria:**
- On mobile (≤768px), increase chart height by 50-100% (e.g., 200px → 300px)
- Ensure Y-axis labels, X-axis ages, and tooltips are readable (12px min font)
- Charts should have adequate padding so labels aren't cut off
- Touch interactions: tooltips should appear on tap (not just hover)
- Consider: make charts horizontally scrollable if data is dense
- Desktop keeps current chart sizing

**Edge Cases:**
- Very long projections (age 65-95+) - may need horizontal scroll or data point thinning
- Multiple charts on dashboard - all should have consistent mobile sizing
- Charts in other tabs (Compare, Estate) should also get mobile treatment

**Files Affected:**
- `src/components/charts/*.jsx` - all chart components (PortfolioChart, IncomeExpensesChart, etc.)
- Chart library config (if using Recharts, Chart.js, or similar)
- May need to adjust chart container in `src/views/dashboard/DashboardView.jsx`

**Design Notes:**
- Use responsive height: `height={window.innerWidth < 768 ? 300 : 200}` or CSS media queries
- Increase touch target size for chart interactions (tooltips, legends)
- Consider: add pinch-to-zoom using touch-action CSS or library feature
- Test with real data to ensure readability

---

## Phase 2 Requirements (Medium Priority)

### 4. Vertical-Stacked KPI Cards (Mobile)

**Problem:** Dashboard KPIs (Net Worth, Income, Tax, Surplus, Portfolio) are in horizontal scrolling row - cramped on mobile.

**Solution:** Stack KPI cards vertically on mobile instead of horizontal scroll

**Acceptance Criteria:**
- On mobile (≤768px), KPI cards stack vertically (full width or 2-column grid)
- Increase font size for main KPI value (24-32px)
- Add more padding/whitespace around cards
- Desktop keeps current horizontal layout
- Option: show only top 3 KPIs above fold, "Show more" to expand rest

**Files Affected:**
- `src/views/dashboard/DashboardView.jsx` - KPI card container
- `src/components/KPICard.jsx` (if exists) - individual card styling

---

### 5. Collapse Portfolio Milestones

**Problem:** Portfolio Milestones section shows 3 nearly identical "Depleted" cards (age 85, 90, 95) - repetitive, takes up space.

**Solution:** Show single milestone card or carousel on mobile

**Acceptance Criteria:**
- On mobile, show only most relevant milestone (earliest depletion or next major event)
- Add "View all milestones" expandable section or swipe carousel
- Desktop can keep current 3-card layout or also simplify

**Files Affected:**
- Component rendering milestones (likely in `src/views/dashboard/DashboardView.jsx`)
- May need carousel component (use existing or add swipe library)

---

### 6. Multi-Step Wizard or Progress Indicator

**Problem:** Quick Start wizard is single long scrolling page (~10 sections) - feels overwhelming on mobile.

**Solution Options:**
A. Multi-step wizard (1-2 sections per step, "Next" button)
B. Keep single page but add progress indicator + jump-to-section anchors

**Recommendation:** Option B (less disruptive) - add progress indicator

**Acceptance Criteria:**
- Add sticky progress bar at top showing completion % (e.g., "40% complete")
- OR section-based progress: "Section 3 of 7"
- Add "jump to section" links or sticky nav for quick access
- Optional: sticky "Continue" or "Save & Finish" button at bottom
- Desktop also benefits from progress indicator

**Files Affected:**
- `src/views/wizard/QuickStartWizard.jsx` (or similar)
- May need scroll position tracking to update progress

---

## Phase 3 Requirements (Low Priority - Backlog)

### 7. Compact Upgrade Modal (Mobile)

- Reduce feature list from 7 to top 3-4 features on mobile
- Add "Learn more" link to full comparison
- Increase pricing button size/prominence

**Files Affected:** `src/components/UpgradePrompt.jsx` or `src/components/UpgradeModal.jsx`

---

### 8. Increase Footer Link Tap Targets

- Stack footer links vertically on mobile instead of inline
- Ensure 44x44pt minimum tap target
- Increase spacing between links

**Files Affected:** `src/components/Footer.jsx` or footer section in `src/App.jsx`

---

### 9. Simplify Optimize Tab Tables

- Make before/after comparison tables easier to read on mobile
- Larger text, fewer rows, or collapsible details
- Use more visual indicators (arrows, color coding)

**Files Affected:** `src/views/optimize/OptimizeView.jsx` - recommendation cards

---

## Technical Approach

### Responsive Breakpoints
Use Tailwind breakpoints:
- `sm`: 640px
- `md`: 768px (primary mobile cutoff for most changes)
- `lg`: 1024px

Most changes target `md` breakpoint:
- Mobile: `< 768px` - new layouts/behaviors
- Desktop: `≥ 768px` - existing layouts

### Testing Strategy
- Test on 375x667 (iPhone SE - smallest common)
- Test on 414x896 (iPhone Pro Max - larger mobile)
- Test on tablet: 768x1024 (iPad mini)
- Test landscape orientation for all
- Check all tabs: Dashboard, Compare, Estate, Debt, Optimize, Deep Dive
- Test signed-in vs anonymous users
- Test with/without premium subscription (upgrade modals, gated tabs)

### Implementation Order
**Recommended incremental approach:**
1. Banner compact/dismiss (easiest, high impact)
2. Chart sizing (moderate complexity, high impact)
3. Mobile nav hamburger (more complex, high impact)
4. KPI card stacking (easy, medium impact)
5. Milestone collapse (easy, medium impact)
6. Wizard progress indicator (moderate, medium impact)
7. Low priority items as time allows

---

## Success Metrics

**Qualitative:**
- Mobile users can easily navigate all tabs
- Charts are readable without zooming
- Dashboard content visible without excessive scrolling

**Quantitative (if analytics available):**
- Increase mobile session duration
- Decrease mobile bounce rate
- Increase mobile conversion to signup/subscription
- Track mobile vs desktop completion of wizard

---

## Open Questions

1. **Hamburger menu style:** Slide-out from left, or dropdown from top? (Recommend: slide from left, standard pattern)
2. **Banner dismissal:** Session-only or permanent localStorage? (Recommend: localStorage with timestamp, show again after 7 days or promotion end)
3. **Chart library:** Are we using Recharts, Chart.js, or custom? (Check existing code)
4. **KPI card count:** Show all 5 stacked, or collapse to top 3 with "Show more"? (Recommend: all 5 stacked vertically, or 2x2 grid + 1)
5. **Wizard multi-step:** Do we want to convert to true multi-step in future, or keep single-page with progress? (Defer to Phase 2 decision after banner/nav/charts done)

---

## References

- Mobile UX Analysis: `mobile-ux-analysis.md`
- Screenshots: `mobile-*.png` (10 files)
- Existing architecture: `docs/architecture.md`
- Project conventions: `CLAUDE.md`

---

## Notes

- All changes should be **additive/responsive** - do not break desktop experience
- Follow existing code style and component patterns (see `CLAUDE.md`)
- Keep accessibility in mind: focus states, keyboard nav, ARIA labels where needed
- Maintain 300-line file limit - refactor if components get too large
- Update `docs/structure.md` if new components are created

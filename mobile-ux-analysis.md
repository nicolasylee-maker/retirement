# RetirePlanner.ca - Mobile UX Analysis

**Analysis Date:** 2026-03-06
**Viewport:** 375x667 (iPhone SE / small mobile)
**URL:** https://retireplanner.ca

## Executive Summary

Conducted comprehensive mobile UX analysis covering landing page, onboarding wizard, dashboard, and all tabs. The app is generally functional on mobile, but several key issues impact usability:

- ✅ **Works well:** Core functionality accessible, responsive layouts mostly work
- ⚠️ **Needs attention:** Navigation overflow, banner height, chart interactions
- 🔴 **Critical:** None blocking, but improvements needed for optimal mobile experience

---

## Screens Analyzed

1. **Landing Page** ✅ Good
2. **Wizard Choice Screen** ✅ Good
3. **Quick Start Wizard** ✅ Good (long form, could be paginated)
4. **Savings Comparison** ⚠️ Chart could be larger
5. **Dashboard** ⚠️ Several issues (see below)
6. **Debt Tab** ✅ Good (empty state works well)
7. **Compare/Estate/Deep Dive Tabs** ✅ Upgrade modal works well
8. **Optimize Tab** ✅ Good layout
9. **What If Panel** ✅ Sliders work well

---

## Critical Issues

### 1. ❗ Navigation Tab Overflow
**Location:** Header navigation (all pages)
**Issue:** Tab labels are cut off or truncated, especially on the right side. The horizontal scrolling tabs make it hard to see all available options at once.

**Screenshot:** mobile-header.png, mobile-savings-comparison.png
**Impact:** Users may not realize all tabs exist; hard to navigate
**Recommendation:**
- Use a hamburger menu for mobile instead of horizontal tabs
- OR use icons-only tabs with tooltips/labels below
- OR make tabs horizontally scrollable with visual indicators (fade/arrows)

---

### 2. ❗ Sign-In Banner Height
**Location:** Dashboard and all main tabs
**Issue:** The promotional banner ("Sign in before June 1, 2026 — get 60 days...") takes up significant vertical space on mobile, pushing content down.

**Screenshot:** mobile-header.png, mobile-dashboard-full.png
**Impact:** Less room for actual content; users have to scroll more
**Recommendation:**
- Make banner more compact (single line with smaller text)
- Add a dismiss/close button so users can hide it
- Consider a sticky condensed version that doesn't take full width
- OR show it only on first visit, then hide it

---

## Medium Priority Issues

### 3. ⚠️ Charts Are Small on Mobile
**Location:** Dashboard charts (Portfolio Over Time, Income vs Expenses, etc.)
**Issue:** Charts are rendered but small. Y-axis labels, X-axis ages, and line details may be hard to see/tap.

**Screenshot:** mobile-dashboard-full.png
**Impact:** Reduced readability, harder to understand data
**Recommendation:**
- Increase chart height for mobile viewports
- Make charts horizontally swipeable for more detail
- Consider simplifying charts (fewer data points) on mobile
- Add pinch-to-zoom for charts

---

### 4. ⚠️ Wizard Form Length
**Location:** Quick Start wizard
**Issue:** The Quick Start form is a single long scrolling page with ~10 sections. On mobile, this requires significant scrolling.

**Screenshot:** mobile-wizard-quick.png (very tall)
**Impact:** Feels overwhelming, easy to lose place
**Recommendation:**
- Consider multi-step wizard (1-2 sections per screen)
- Add progress indicator (e.g., "Step 2 of 5")
- Use sticky "Next" button at bottom
- OR keep current but add "jump to section" anchors

---

### 5. ⚠️ KPI Cards Could Be Larger
**Location:** Dashboard top section (Net Worth, Income, Tax, etc.)
**Issue:** The 5 KPI cards are small and in a horizontal scrolling row. Text is readable but cards feel cramped.

**Screenshot:** mobile-dashboard-full.png
**Impact:** Reduced scannability; important numbers are small
**Recommendation:**
- Stack cards vertically on mobile instead of horizontal scroll
- Increase font size for the main value
- Add more padding/whitespace
- Consider showing only top 3 KPIs above the fold, with "See more" to expand

---

### 6. ⚠️ Portfolio Milestones Section Is Repetitive
**Location:** Bottom of dashboard
**Issue:** The Portfolio Milestones section shows three nearly identical cards (Age 85, 90, 95 "Depleted"). This takes up a lot of mobile screen space with redundant information.

**Screenshot:** mobile-dashboard-full.png
**Impact:** Too much scrolling, repetitive content
**Recommendation:**
- Collapse to a single card with a carousel/swipe for multiple ages
- OR show only the most relevant milestone (earliest depletion age)
- Add a "View all milestones" expandable section

---

## Minor Issues

### 7. 📝 Upgrade Modal Text
**Location:** Compare/Estate/Deep Dive tabs
**Issue:** The upgrade modal lists 7 features. On mobile, this is a lot of text to read in a modal.

**Screenshot:** mobile-upgrade-modal.png
**Impact:** May feel overwhelming; users might dismiss without reading
**Recommendation:**
- Reduce to top 3-4 features for mobile
- Add "Learn more" link to full feature comparison
- Make pricing buttons more prominent (larger, better contrast)

---

### 8. 📝 Footer Links
**Location:** Bottom of all pages
**Issue:** Footer links (Privacy, Terms, Contact) are small and close together.

**Screenshot:** mobile-dashboard-full.png (bottom)
**Impact:** Hard to tap accurately (touch target too small)
**Recommendation:**
- Increase footer link size and spacing
- Stack vertically on mobile instead of inline
- Ensure 44x44pt minimum touch target size

---

### 9. 📝 Optimize Tab Recommendations
**Location:** Optimize tab
**Issue:** Each recommendation card has before/after comparison tables that are hard to read on mobile (small text, tight spacing).

**Screenshot:** mobile-optimize.png
**Impact:** Users may not understand the recommendation impact
**Recommendation:**
- Simplify before/after comparison (larger text, fewer rows)
- Use more visual indicators (e.g., arrows, color coding)
- Consider collapsible details ("Show breakdown")

---

## What Works Well ✅

1. **Landing Page:** Clean, clear value prop, CTA buttons are prominent
2. **Wizard Choice:** Clear options with good visual hierarchy
3. **What If Panel:** Sliders work well, clear labels, easy to use
4. **Debt Tab Empty State:** Clean, clear messaging
5. **Optimize Tab Layout:** Good use of color, clear sections
6. **Overall Responsiveness:** No horizontal scrolling issues, layouts adapt

---

## Recommendations Priority

### High Priority (Immediate)
1. **Fix navigation tab overflow** - Use hamburger menu or icon-only tabs
2. **Reduce sign-in banner height** - Add dismiss option or make compact
3. **Increase chart size/interactivity** - Better mobile chart rendering

### Medium Priority (Next Sprint)
4. **Stack KPI cards vertically** - Better mobile layout
5. **Simplify Portfolio Milestones** - Reduce repetition
6. **Multi-step wizard** OR add progress indicator

### Low Priority (Backlog)
7. Optimize upgrade modal text for mobile
8. Increase footer link tap targets
9. Simplify before/after tables in recommendations

---

## Testing Notes

- Tested on 375x667 viewport (iPhone SE size)
- All core functionality works
- No critical blocking bugs
- Site is usable but not optimally designed for mobile
- Consider testing on larger mobile devices (e.g., 414x896 iPhone Pro Max) to see if issues persist

---

## Screenshots

All screenshots saved with `mobile-` prefix:
- `mobile-landing.png` - Landing page
- `mobile-wizard-choice.png` - Wizard choice screen
- `mobile-wizard-quick.png` - Quick Start form (full page)
- `mobile-savings-comparison.png` - Savings comparison screen
- `mobile-dashboard-full.png` - Full dashboard scroll
- `mobile-debt.png` - Debt tab empty state
- `mobile-upgrade-modal.png` - Premium upgrade modal
- `mobile-optimize.png` - Optimize tab
- `mobile-whatif-panel.png` - What If panel with sliders
- `mobile-header.png` - Header with nav and banner

---

## Conclusion

RetirePlanner.ca is **functional on mobile** but has **room for significant UX improvements**. The most impactful changes would be:

1. Redesigning the navigation for mobile (hamburger or vertical list)
2. Reducing the sign-in banner footprint
3. Optimizing charts and data visualizations for smaller screens

These changes would dramatically improve the mobile experience without requiring major architectural changes.

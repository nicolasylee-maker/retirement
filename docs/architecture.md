# Project Architecture

## Overview

A client-side React single-page application for Canadian residents planning retirement. Supports all 9 English Canadian provinces (ON, BC, AB, SK, MB, NB, NS, NL, PE) with province-specific income tax, probate, and intestacy rules. Users build scenarios through a 9-step wizard, then explore year-by-year projections, compare scenarios side-by-side, and analyze estate impact — all computed in-browser with no backend.

> **Full project tree**: see `docs/structure.md`
> **Domain pitfalls**: see `docs/learned-rules.md`

## Tech Stack

| Category | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 18.3 | Mature ecosystem, hooks-based, simple for SPA |
| Build Tool | Vite 6.0 | Fast HMR, ESM-native, minimal config |
| Language | JavaScript (ES modules, JSX) | Lightweight — no TypeScript overhead for this scope |
| Styling | Tailwind CSS 3.4 | Utility-first, rapid iteration, consistent design |
| Charts | Recharts 2.15 | React-native charting, composable, responsive |
| Testing | Vitest | Vite-native test runner, fast, Jest-compatible API |
| AI (optional) | Google Gemini API | Server-side via gemini-proxy edge function |
| State Management | React hooks (useState/useMemo) | App is shallow enough — no external library needed |
| Routing | Custom view state in App.jsx | Simple state-based switching — no router library |
| Persistence | Supabase + JSON export/import | Cloud sync for signed-in users, JSON for offline |

## Application Layers

```
Views (wizard, dashboard, compare, debt, estate, deep-dive, recommendations, print)
    ↓ props
Components (FormField, Card, AiInsight, GatedButton, Chart wrappers)
    ↓ calls
Engines (projectionEngine, taxEngine, estateEngine, withdrawalCalc, optimizerEngine)
    ↓ reads                      Services (geminiService, scenarioService, stripeService)
Constants (tax tables, defaults, design tokens)      Hooks (useCloudSync)
```

- **Views** orchestrate pages — they call engines and pass results to components
- **Components** are pure UI — they render props, handle user interaction, emit callbacks
- **Engines** are pure functions — zero React imports, independently testable
- **Constants** are static data — tax brackets, defaults, colors
- **Services** handle external API calls — isolated from engines and components
- **Hooks** encapsulate reusable stateful logic (cloud sync, etc.)

## Data Flow

### Scenario → Projection → Dashboard
```
User completes wizard
    ↓
scenario object built (shape defined in defaults.js)
    ↓
projectScenario(scenario, overrides)     ← projectionEngine.js
    ↓
year-by-year projection array
    ↓
Dashboard renders via Recharts (PortfolioChart, AccountChart, SummaryCards)
```

### What-If Analysis
```
User adjusts WhatIfPanel sliders
    ↓
whatIfOverrides state updated in App.jsx
    ↓
projectScenario(currentScenario, whatIfOverrides)     ← re-runs with overrides
    ↓
Dashboard re-renders with new projection (real-time)
```

### Estate Analysis
```
User selects death age on EstateView slider
    ↓
calcEstateImpact(scenario, projectionData, ageAtDeath)     ← estateEngine.js
    ↓
Estate tax breakdown + distribution rendered
```

## Scenario Object Shape

The scenario object is the central data model. Full shape defined in `src/constants/defaults.js`:

| Section | Key Fields |
|---------|------------|
| Identity | `id`, `name`, `createdAt` |
| Personal | `currentAge`, `retirementAge`, `lifeExpectancy`, `isCouple`, `spouseAge` |
| Gov Benefits | `cppMonthly`, `cppStartAge`, `oasMonthly`, `oasStartAge`, `gisEligible`, `gainsEligible` |
| Pensions | `pensionType`, `dbPensionAnnual`, `dcPensionBalance`, `liraBalance` |
| Savings | `rrspBalance`, `tfsaBalance`, `rrifBalance`, `otherRegisteredBalance` |
| Other Assets | `cashSavings`, `nonRegInvestments`, `realEstateValue`, `otherAssets` |
| Liabilities | `mortgageBalance`, `consumerDebt`, `otherDebt` (with rates + terms) |
| Expenses | `monthlyExpenses`, `expenseReductionAtRetirement`, `inflationRate`, `realReturn` |
| Withdrawal | `withdrawalOrder` (array), `rrspMeltdownEnabled`, `rrspMeltdownTargetAge` |
| Couple Support | `isCouple`, `spouseAge`, `spouseRetirementAge`, `spouseEmploymentIncome`, `spouseCppMonthly`, `spouseOasMonthly`, `spousePensionType`, `spouseRrspBalance`, `spouseTfsaBalance` |
| Estate | `hasWill`, `primaryBeneficiary`, `numberOfChildren`, `estimatedCostBasis` |
| AI Cache | `aiInsights` — `{ dashboard?, debt?, compare?, estate? }` each `{ text, hash }` |

## Projection Output Shape

Each year in the projection array contains:

| Category | Fields |
|----------|--------|
| Time | `age`, `year` |
| Balances | `rrspBalance`, `tfsaBalance`, `nonRegBalance`, `otherBalance`, `totalPortfolio` |
| Income | `cppIncome`, `oasIncome`, `gisIncome`, `gainsIncome`, `pensionIncome` |
| Withdrawals | `rrspWithdrawal`, `tfsaWithdrawal`, `nonRegWithdrawal`, `otherWithdrawal` |
| Tax | `totalTaxableIncome`, `totalTax`, `afterTaxIncome` |
| Couple Income | `spouseCppIncome`, `spouseOasIncome`, `spouseEmploymentIncome`, `spousePensionIncome`, `spouseRrspWithdrawal`, `spouseRrspBalance`, `spouseTfsaBalance`, `spouseTfsaWithdrawal` |
| Deposits | `tfsaDeposit`, `nonRegDeposit` (actual new savings — see learned-rules.md for surplus pitfall) |
| Cashflow | `expenses`, `debtPayments`, `surplus` (always 0 after deposits — do not use for KPIs), `netWorth` |

## Adding a New Module

### Step 1: Create the view folder
```
src/views/your_module/
├── YourModuleView.jsx          ← Main view (calls engines, passes data to sub-components)
├── YourModuleChart.jsx         ← Charts (if needed)
└── YourModuleCards.jsx         ← Summary cards (if needed)
```

### Step 2: Add engine logic (if new calculations needed)
```
src/engines/yourModuleEngine.js   ← Pure functions, zero React imports
```

### Step 3: Add tests
```
tests/yourModuleEngine.test.js    ← Unit tests for engine functions
```

### Step 4: Wire into App.jsx
- Add view state value (e.g., `'your_module'`)
- Add nav tab in the header
- Add conditional render in the view switch

### Step 5: Update docs
- Update `docs/structure.md` — add files to the project tree
- Update this file — add to Key Files table, add user flow to `docs/structure.md`
- Update `docs/learned-rules.md` if new domain rules discovered

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | App shell — all top-level state, view routing, scenario CRUD, premium gating |
| `src/constants/defaults.js` | Scenario shape, wizard steps, preset values |
| `src/constants/demoScenario.js` | Demo scenario + projection for landing page preview |
| `src/constants/taxTables.js` | Imports `data/*.json`; exports `PROVINCE_DATA`, `PROVINCE_CODES`, `PROVINCE_NAMES`; `_injectLiveTaxData` swaps live bindings at runtime |
| `data/federal.json` | 2025 federal tax brackets, OAS/TFSA parameters |
| `data/provinces/*.json` | 2025 provincial brackets, credits, probate, intestacy per province |
| `data/canlii-state.json` | Last-seen CanLII amendment dates for 18 probate/intestacy acts |
| `scripts/update-tax-data.js` | Annual tax data freshness audit + update checklist |
| `scripts/check-canlii.js` | CanLII legislation amendment monitor (pass `--fetch` to hit URLs) |
| `src/engines/projectionEngine.js` | Year-by-year retirement cash flow engine |
| `src/engines/taxEngine.js` | Tax calculation (federal, provincial, clawbacks, credits) |
| `src/engines/estateEngine.js` | Estate tax, probate, distribution |
| `src/engines/withdrawalCalc.js` | Sustainable withdrawal (binary search) |
| `src/engines/optimizerEngine.js` | `runOptimization(scenario)` — tests 8 dimensions, returns ranked recommendations |
| `src/engines/readinessEngine.js` | `computeReadinessRank(scenario)` — Canadian percentile rank vs Stats Canada/Fidelity benchmarks by age bracket |
| `src/views/readiness/ReadinessView.jsx` | Post-wizard rank screen: animated arc gauge, percentile headline, stat cards |
| `src/engines/incomeHelpers.js` | Pure income helper functions (CPP, OAS, GIS, GAINS, capital gains) |
| `src/hooks/useCloudSync.js` | Supabase scenario sync: fetch on sign-in, auto-save on change |
| `src/services/supabaseClient.js` | Supabase client singleton |
| `src/services/scenarioService.js` | Supabase CRUD for scenarios table |
| `src/services/stripeService.js` | `startCheckout`, `openBillingPortal` — Stripe edge function calls |
| `src/services/geminiService.js` | Sends `{type, context}` to gemini-proxy; in-memory cache |
| `src/services/adminService.js` | `adminApi` — all admin edge function calls |
| `src/utils/buildAiData.js` | Builds structured AI context payloads per view |
| `src/utils/compareAnalysis.js` | Pure comparison utilities: diff drivers, phase ranges/summaries, monthly snapshots |
| `src/utils/debtCalc.js` | Debt amortization schedule calculator |
| `src/utils/formatters.js` | Currency/percent formatting, UUID generation |
| `src/utils/openPrintReport.js` | Opens new window + renders PrintReportView for PDF |
| `src/utils/excel/index.js` | Multi-sheet Excel audit workbook (premium) |
| `src/components/GatedButton.jsx` | Premium gate wrapper — upgrade modal for non-subscribers |
| `src/components/UpgradePrompt.jsx` | Premium upgrade prompt (full + compact, feature grid) |

## State Management Patterns

```javascript
// Top-level state in App.jsx
const [scenarios, setScenarios] = useState([createDefaultScenario()])
const [currentScenarioId, setCurrentScenarioId] = useState(...)
const [view, setView] = useState('welcome')
const [wizardStep, setWizardStep] = useState(0)
const [whatIfOverrides, setWhatIfOverrides] = useState({})

// Derived (memoized)
const currentScenario = useMemo(() =>
  scenarios.find(s => s.id === currentScenarioId), [scenarios, currentScenarioId]
)
const projectionData = useMemo(() =>
  projectScenario(currentScenario, whatIfOverrides), [currentScenario, whatIfOverrides]
)
const optimizationResult = useMemo(
  () => (currentScenario && view === 'recommendations' ? runOptimization(currentScenario) : null),
  [currentScenario, view],  // lazy: only runs when Optimize tab is active
)
```

## Shared Component Rules

- All shared components (`src/components/`) must handle empty/zero/null data gracefully
- Chart components must handle empty projection arrays without crashing
- FormField must handle edge cases: very long input, negative numbers, paste events
- SummaryCard must handle `$0`, negative values, and very large numbers
- Guard against division by zero before passing computed values to components

## Key Design Decisions

- **No router library**: Simple state-based view switching in `App.jsx` — app has ~7 views
- **No state library**: React `useState` + prop drilling — component tree is shallow (max 3 levels)
- **All tax math isolated**: Engines have zero UI dependencies, independently testable
- **Multi-province**: 9 English Canadian provinces — tax/probate/intestacy data per province in `data/provinces/*.json`
- **Cloud + offline**: Supabase sync for signed-in users; JSON export/import always available
- **Optional AI**: Gemini integration via server-side edge function — app works without it
- **Premium gating**: `GATED_TABS` Set in App.jsx + `GatedButton` wrapper; admin bypasses all gates

## Performance Guidelines

- Target: instant wizard navigation, <100ms projection recalculation
- Projections cached via `useMemo` — only recompute when scenario or overrides change
- Charts use Recharts responsive containers — avoid unnecessary re-renders
- Sustainable withdrawal uses binary search (not brute force) for efficiency

## Environment Setup

Two Supabase cloud projects — DEV for daily work, PROD for shipping only.

| Environment | Supabase Project | Stripe | Frontend |
|-------------|-----------------|--------|----------|
| DEV | retirement-dev | `pk_test_` / `sk_test_` | `npm run dev` → `.env.local` |
| PROD | kovxoeovijedvxmulbke | `pk_live_` / `sk_live_` | retireplanner.ca (auto-deploy `main`) |

**Deployment rules:**
- **Migrations**: link to DEV → `db push` → test → link to PROD → `db push`. Never skip DEV.
- **Edge functions**: deploy to DEV first, validate, then PROD.
- **Always run `supabase status`** before any `db push` or `functions deploy` to confirm target.
- **`git push main`** triggers Vercel auto-deploy to production immediately — this is a PROD action.
- **`.env.local`** points at DEV (test Stripe keys). `.env.prod.local` is the prod credential file (never commit either).

## Deploy Pipeline

Frontend auto-deploys to Vercel on push to `main`. **`git push main` = production deploy.**

Supabase edge functions deploy separately:
```bash
# Always confirm target project first
supabase status
# Then deploy (--use-api required on FUSE filesystem; --no-verify-jwt required for ES256 JWTs)
supabase functions deploy <fn> --use-api --no-verify-jwt
```

See `docs/learned-rules.md` → Edge Function Deployment for machine-specific deploy notes.

## Version History

| Date | Change |
|------|--------|
| 2025-01-01 | Initial architecture document created |
| 2026-03-01 | Comprehensive rewrite — full project structure, data flow, conventions |
| 2026-03-02 | Full couple support: spouse CPP/OAS bug fix, spouse employment/pension/savings, two-tax-call |
| 2026-03-02 | effectiveScenario propagated to Dashboard, report, and audit; surplus formula fixed in PDF; couple fields added to report and audit; auditProjection.js split into auditInputSnapshot.js, auditProjection.js, auditTaxDebt.js |
| 2026-03-02 | Multi-province support: 9 English Canadian provinces, province-aware tax/probate/intestacy, province picker UI, golden file regression tests, annual maintenance scripts |
| 2026-03-02 | Analytics & error monitoring: Plausible script tag, trackEvent helper, wizard funnel events, Sentry init + ErrorBoundary |
| 2026-03-03 | Full admin dashboard: sidebar overlay (Overview/Users/AI Config/Subscriptions), admin_config DB table, admin-users + admin-config-update edge functions, gemini-proxy reads prompts from DB server-side, geminiService simplified to send {type, context} |
| 2026-03-03 | Stripe subscription checkout: stripe-checkout edge function, UpgradePrompt (full + compact variants), SubscriptionBadge, AccountMenu "Manage Subscription", checkout=success banner, billing portal, SubscriptionContext (isPaid/isTrial/trialDaysRemaining), AuthContext, stripeService.js |
| 2026-03-03 | Admin Maintenance tab: tax_data + legislation_checks DB tables, maintenance edge function (upsert-tax/seed-all/check-legislation), TaxDataContext (DB-driven tax data with bundled-JSON fallback), _injectLiveTaxData live-binding pattern in taxTables.js, TaxDataEditor (JSON editor + smoke test), LegislationPanel (CanLII monitor), MaintenanceSection |
| 2026-03-03 | AI insights persistence: aiInsights field added to scenario shape, AiInsight.jsx uses savedInsight/onSave props with hash-based staleness badge, insights auto-restore on load and persist via Supabase cloud sync, Gemini badge removed |
| 2026-03-03 | Returning user flow: sign-in routes returning users to ReturningHomeView (3-card choice screen) instead of wizard; ScenarioPickerView for multi-scenario selection; View Results button removed from wizard sidebar; routing helpers extracted to returningUserFlow.js |
| 2026-03-03 | Optimize My Plan tab: optimizerEngine.js (pure, 8 dimensions: CPP/OAS timing × primary+spouse, withdrawal order, RRSP meltdown, debt payoff, expense reduction); RecommendationCard + RecommendationsTab; lazy useMemo (only runs when tab is active); free users see card 1, paid users see all; Apply merges rec.changes into scenario |
| 2026-03-03 | Fix spouse TFSA withdrawal bug in projectionEngine.js: spouseTfsa was included in totalPortfolio but never drawn; added spouseTfsaWithdrawal variable, draws from spouse TFSA after primary in withdrawal loop, adds spouseTfsaWithdrawal to grossIncome and projection output |
| 2026-03-04 | Deep Dive tab: visual audit views (src/views/audit/) with ComposedChart dual-axis bars + portfolio line overlay, 3 KPI cards per phase, dynamic phase filtering by scenario ages, premium-gated tab; Excel Report available to paid users; UpgradePrompt feature grid updated |
| 2026-03-04 | Docs restructure: AGENTS.md → CLAUDE.md at project root; architecture.md split into architecture.md + structure.md; DOCUMENTATION RULES section added to enforce doc updates |
| 2026-03-04 | AI Testing admin tab: ai-test-proxy edge function (passthrough for 6 providers: Gemini/OpenAI/Anthropic/OpenRouter/xAI/Kimi), buildAiPrompt.js (client-side prompt resolver), AiTestingSection + AiTestConfigPanel + AiTestResultPanel (3-column side-by-side comparison UI with raw prompt column) |
| 2026-03-04 | Compare tab analytical sections: DifferenceDrivers (input diff table), PhaseComparison (life phase health cards), MonthlyReality (cash flow at key ages); compareAnalysis.js pure utility; enriched Gemini compare prompt with diffLines/phaseLines/monthlyLines |
| 2026-03-05 | Admin-granted time-limited trial override: `override_expires_at` DB column, `trial` override type, trialOverride.js pure helpers, SubscriptionContext exposes isOverrideTrial/overrideDaysRemaining, InviteModal + OverrideSelect + RenewTrialButton in admin UI, "Trial — N days left" badge |
| 2026-03-05 | Readiness Rank Screen: post-wizard interstitial (both Basic + Full), readinessEngine.js (log-normal percentile vs Stats Canada/Fidelity benchmarks by age bracket), ReadinessView.jsx (animated SVG arc gauge, dark theme, stat cards, pension disclaimer), free for all users |
| 2026-03-05 | Multi-provider AI: admin-vault-update edge function (Supabase Vault key storage for 5 providers: OpenRouter/OpenAI/Anthropic/xAI/Kimi), ai-proxy refactored to read key from vault, live model-list fetch from each provider, AiConfigSection provider + model dropdowns in admin UI |
| 2026-03-05 | Public site additions: Google Search Console meta tags (index.html), XML sitemap (public/sitemap.xml), blog section placeholder |
| 2026-03-06 | Security audit: ADMIN_EMAIL fail-closed on all 6 admin edge functions (removed `?? ''` fallback), prompt injection sanitization in ai-proxy (sanitizeContextValue strips CR/LF/NUL, 500-char limit), generic error messages in send-invite (no internal detail leakage), removed userId from send-invite success response |
| 2026-03-06 | Environment strategy: retirement-dev project established as DEV environment; CLAUDE.md updated with ENVIRONMENT GUARD section (mandatory supabase status check, [DEV]/[PRODUCTION] labeling, dev→prod migration discipline) and GIT + SUPABASE GLOSSARY section |

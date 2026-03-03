# Project Architecture

## Overview

A client-side React single-page application for Canadian residents planning retirement. Supports all 9 English Canadian provinces (ON, BC, AB, SK, MB, NB, NS, NL, PE) with province-specific income tax, probate, and intestacy rules. Users build scenarios through a 9-step wizard, then explore year-by-year projections, compare scenarios side-by-side, and analyze estate impact — all computed in-browser with no backend.

## Tech Stack

| Category | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 18.3 | Mature ecosystem, hooks-based, simple for SPA |
| Build Tool | Vite 6.0 | Fast HMR, ESM-native, minimal config |
| Language | JavaScript (ES modules, JSX) | Lightweight — no TypeScript overhead for this scope |
| Styling | Tailwind CSS 3.4 | Utility-first, rapid iteration, consistent design |
| Charts | Recharts 2.15 | React-native charting, composable, responsive |
| Testing | Vitest | Vite-native test runner, fast, Jest-compatible API |
| AI (optional) | Google Gemini API | User-provided API key, optional retirement insights |
| State Management | React hooks (useState/useMemo) | App is shallow enough — no external library needed |
| Routing | Custom view state in App.jsx | Simple state-based switching — no router library |
| Persistence | JSON export/import | No backend; user saves/loads scenario files |

## Project Structure

```
retirement/
├── index.html                              ← HTML shell, loads /src/main.jsx
├── package.json                            ← Dependencies & npm scripts
├── vite.config.js                          ← Vite dev server (port 5173) + React plugin
├── tailwind.config.js                      ← Custom colors (sunset, lake, forest), Inter font
├── postcss.config.js                       ← PostCSS + Tailwind + Autoprefixer
│
├── docs/
│   ├── architecture.md                     ← This file (structure, patterns, data flow)
│   ├── AGENTS.md                           ← AI agent protocol (boot sequence, task loop, rules)
│   ├── learned-rules.md                    ← Domain pitfalls (tax, estate, withdrawal)
│   └── CALCULATION_AUDIT.md                ← Audit methodology and worked examples
│
├── data/
│   ├── federal.json                        ← 2025 federal tax brackets, credits, OAS/TFSA params
│   └── provinces/                          ← 2025 provincial data (one JSON per province)
│       ├── ON.json  BC.json  AB.json  SK.json  MB.json
│       └── NB.json  NS.json  NL.json  PE.json
│
├── scripts/
│   ├── update-tax-data.js                  ← Annual update checklist (data freshness + CRA links)
│   └── check-canlii.js                     ← CanLII amendment monitor for probate/intestacy acts
│
├── src/
│   ├── main.jsx                            ← React root render (StrictMode → App)
│   ├── App.jsx                             ← Main shell: state, view routing, scenario management
│   ├── index.css                           ← Tailwind directives, custom classes, animations
│   │
│   ├── constants/
│   │   ├── defaults.js                     ← Default scenario values (province:'ON'), wizard steps, presets
│   │   ├── designTokens.js                 ← Color palettes, chart styles, design constants
│   │   └── taxTables.js                    ← Imports data/*.json; exports PROVINCE_DATA, PROVINCE_CODES, PROVINCE_NAMES + backward-compat constants
│   │
│   ├── engines/                            ← Pure business logic (zero React dependencies)
│   │   ├── projectionEngine.js             ← Year-by-year retirement cash flow projections
│   │   ├── incomeHelpers.js                ← Pure income benefit helpers (CPP, OAS, GIS, GAINS, capital gains)
│   │   ├── taxEngine.js                    ← Federal + Ontario tax, OAS clawback, RRIF minimums
│   │   ├── estateEngine.js                 ← Estate tax, probate, distribution analysis
│   │   ├── withdrawalCalc.js               ← Sustainable withdrawal binary search
│   │   ├── auditInputSnapshot.js           ← Audit section 1: full input snapshot table
│   │   ├── auditProjection.js              ← Audit sections 2–3: projection table + CPP/OAS verification
│   │   ├── auditTaxDebt.js                 ← Audit sections 4–5: tax worked example + debt trace
│   │   └── auditAnalysis.js                ← Audit sections 6–10: estate, withdrawal, RRIF, gaps, KPIs
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx                 ← Supabase session; provides user, isLoading, signOut
│   │   ├── SubscriptionContext.jsx         ← Stripe sub state; provides isPaid, isTrial, isPastDue, isOverride
│   │   └── TaxDataContext.jsx              ← Fetches tax_data from DB on startup; calls _injectLiveTaxData; falls back to bundled JSON
│   │
│   ├── services/
│   │   ├── supabaseClient.js               ← Supabase client singleton (auth + DB)
│   │   ├── stripeService.js                ← startCheckout(priceId), openBillingPortal() — calls edge fns
│   │   ├── geminiService.js                ← Sends {type, context} to gemini-proxy edge fn; in-memory cache
│   │   └── adminService.js                 ← adminApi: stats, users, config, subscriptions, tax data, legislation
│   │
│   ├── utils/
│   │   ├── analytics.js                    ← Plausible custom event helper (no-ops if window.plausible absent)
│   │   ├── formatters.js                   ← Currency, percent, UUID, math utilities
│   │   ├── generateReport.js               ← HTML retirement report (PDF-printable, inputs + projection)
│   │   ├── downloadAudit.js                ← Audit report assembler + Markdown download trigger
│   │   └── responsiveChartHeight.js        ← Pure fn: returns mobileH when windowWidth<640, else desktopH
│   │
│   ├── components/                         ← Reusable UI components
│   │   ├── AiInsight.jsx                   ← AI recommendation card (Gemini integration)
│   │   ├── Button.jsx                      ← Primary/secondary/text button variants
│   │   ├── ErrorFallback.jsx               ← Sentry ErrorBoundary fallback UI (friendly reload screen)
│   │   ├── Card.jsx                        ← Base card wrapper with border + shadow
│   │   ├── FormField.jsx                   ← Input with label, helper text, $ prefix, validation
│   │   ├── HelpIcon.jsx                    ← Tooltip with info icon
│   │   ├── ProgressBar.jsx                 ← Wizard step progress indicator
│   │   ├── QuickFillPills.jsx              ← Quick-select preset buttons
│   │   ├── SliderControl.jsx               ← Range slider with formatted display
│   │   ├── SummaryCard.jsx                 ← Dashboard KPI card (label, value, subtitle)
│   │   └── SunsetIllustration.jsx          ← Welcome screen SVG illustration
│   │
│   └── views/                              ← Page-level view components
│       ├── WelcomeScreen.jsx               ← Landing page (New Plan / Load Saved Plan)
│       ├── WhatIfPanel.jsx                 ← Collapsible parameter panel (inline on md+; bottom drawer portal on mobile)
│       │
│       ├── wizard/                         ← 9-step input wizard
│       │   ├── WizardShell.jsx             ← Wizard container, navigation, step management
│       │   ├── WizardSidePanel.jsx         ← Fixed right panel: live step summary + Back/Next (lg+); mobile sticky footer in WizardShell
│       │   ├── PersonalInfoStep.jsx        ← Age, retirement age, couple toggle
│       │   ├── GovBenefitsStep.jsx         ← CPP, OAS, GIS, GAINS configuration
│       │   ├── PensionsStep.jsx            ← DB/DC pension inputs
│       │   ├── SavingsStep.jsx             ← RRSP, TFSA, RRIF balances
│       │   ├── OtherAssetsStep.jsx         ← Non-reg investments, real estate, cash
│       │   ├── LiabilitiesStep.jsx         ← Mortgage, consumer debt, other debt
│       │   ├── ExpensesStep.jsx            ← Monthly expenses, inflation, returns
│       │   ├── WithdrawalStep.jsx          ← Withdrawal order, RRSP meltdown settings
│       │   └── EstateStep.jsx              ← Will, beneficiary, children, cost basis
│       │
│       ├── dashboard/                      ← Main results view
│       │   ├── Dashboard.jsx               ← Dashboard container (KPIs + charts)
│       │   ├── SummaryCards.jsx            ← Net worth, income, tax, surplus KPIs
│       │   ├── PortfolioChart.jsx          ← Area chart of total portfolio over time (≤221 lines)
│       │   ├── PortfolioChartTooltip.jsx   ← Extracted CustomTooltip for PortfolioChart
│       │   ├── portfolioChartHelpers.js    ← buildMilestones (stagger levels) + buildPhaseAnnotations
│       │   ├── AccountChart.jsx            ← Stacked bar chart by account type
│       │   └── MilestoneCards.jsx          ← Portfolio milestone achievements
│       │
│       ├── compare/                        ← Scenario comparison view
│       │   ├── CompareView.jsx             ← Scenario selector + controls
│       │   ├── CompareChart.jsx            ← Multi-line portfolio comparison chart
│       │   └── CompareTable.jsx            ← Year-by-year comparison table
│       │
│       ├── estate/                         ← Estate planning view
│       │   ├── EstateView.jsx              ← Death age slider, will toggle
│       │   ├── EstateSummaryCards.jsx      ← Estate KPI cards
│       │   └── EstateBreakdown.jsx         ← Tax breakdown + distribution to heirs
│       │
│       └── admin/                          ← Full-screen admin overlay (fixed inset-0 z-50)
│           ├── AdminView.jsx               ← Sidebar nav + section switcher
│           ├── sections/
│           │   ├── OverviewSection.jsx     ← Stat cards + 30-day signup chart
│           │   ├── UsersSection.jsx        ← User table, search, override select, invite
│           │   ├── AiConfigSection.jsx     ← Live model/temp/token/prompt editing
│           │   └── SubscriptionsSection.jsx← Stripe subscription table + status badges
│           ├── sections/
│           │   ├── OverviewSection.jsx     ← Stat cards + 30-day signup chart
│           │   ├── UsersSection.jsx        ← User table, search, override select, invite
│           │   ├── AiConfigSection.jsx     ← Live model/temp/token/prompt editing
│           │   ├── SubscriptionsSection.jsx← Stripe subscription table + status badges
│           │   └── MaintenanceSection.jsx  ← Tax data JSON editor + legislation monitor
│           └── components/
│               ├── StatCard.jsx            ← Reusable stat display card
│               ├── SignupChart.jsx         ← Recharts BarChart (signups by day)
│               ├── UserScenariosPanel.jsx  ← Slide-out right panel for user's scenarios
│               ├── InviteModal.jsx         ← Invite user modal (wraps send-invite edge fn)
│               ├── TaxDataEditor.jsx       ← Province JSON editor; exports parseTaxJson, runTaxSmokeTest
│               └── LegislationPanel.jsx    ← CanLII status table + Run Check button
│
├── tests/                                  ← Vitest test files (320 tests, 10 files)
│   ├── taxEngine.test.js                   ← Federal/Ontario tax, surtax, OAS clawback, RRIF mins (51)
│   ├── projectionEngine.test.js            ← Year-by-year projections with persona scenarios (45)
│   ├── estateEngine.test.js                ← Death tax, probate, intestacy distribution (32)
│   ├── withdrawalCalc.test.js              ← Sustainable withdrawal, overrides, monotonicity (20)
│   ├── multiProvinceEngine.test.js         ← Province-aware tax/probate/intestacy for all provinces (47)
│   ├── goldenFileTests.test.js             ← Per-province regression snapshots (36, 4 asserts × 9 provinces)
│   ├── portfolioChartHelpers.test.js       ← Chart helper functions (20)
│   ├── waterfallChartHelpers.test.js       ← Waterfall chart helpers (26)
│   ├── taxTablesInject.test.js             ← _injectLiveTaxData live-binding correctness + reset (20)
│   ├── taxDataHelpers.test.js              ← buildTaxDataFromRows, parseTaxJson, runTaxSmokeTest (23)
│   └── golden/                             ← Committed JSON snapshots (regenerate: npm run generate:golden)
│       ├── generate.test.js                ← Generator (excluded from npm test, run via generate:golden)
│       ├── generate.config.js              ← Vitest config for generator only
│       └── {ON,BC,AB,SK,MB,NB,NS,NL,PE}-golden.json
│
├── dist/                                   ← Production build output (Vite)
│
├── test-scenario.json                      ← Sample scenario: Margaret (default)
├── test-frank-lowIncome.json               ← Sample scenario: Frank (low income)
└── test-couple-rajesh.json                 ← Sample scenario: Rajesh (couple)
```

## User Flows

### Flow 1: Create New Retirement Plan
```
WelcomeScreen
    ↓ "Start New Plan"
WizardShell (9 steps: Personal → Benefits → Pensions → Savings → Assets → Liabilities → Expenses → Withdrawal → Estate)
    ↓ "Finish"
Dashboard (projections, KPIs, charts)
    ↓ optional
WhatIfPanel (adjust return, inflation, expenses, life expectancy → live re-projection)
```

### Flow 2: Compare Scenarios
```
Dashboard
    ↓ "Compare" tab
CompareView (select up to 3 scenarios)
    ↓
CompareChart (side-by-side portfolio lines)
CompareTable (year-by-year numbers)
```

### Flow 3: Estate Planning
```
Dashboard
    ↓ "Estate" tab
EstateView (adjust death age slider, toggle will)
    ↓
EstateSummaryCards (total estate, taxes, net to heirs)
EstateBreakdown (tax by source, distribution rules)
```

### Flow 4: Load Saved Plan
```
WelcomeScreen
    ↓ "Load Saved Plan" (JSON file picker)
Dashboard (loaded scenario)
```

## Application Layers

```
Views (wizard steps, dashboard, compare, estate)
    ↓ props
Components (FormField, Card, AiInsight, Chart wrappers)
    ↓ calls
Engines (projectionEngine, taxEngine, estateEngine, withdrawalCalc)
    ↓ reads                      Services (geminiService)
Constants (tax tables, defaults, design tokens)
```

- **Views** orchestrate pages — they call engines and pass results to components
- **Components** are pure UI — they render props, handle user interaction, emit callbacks
- **Engines** are pure functions — zero React imports, independently testable
- **Constants** are static data — tax brackets, defaults, colors
- **Services** handle external API calls (Gemini AI) — isolated from engines and components

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
| Couple Income | `spouseCppIncome`, `spouseOasIncome`, `spouseEmploymentIncome`, `spousePensionIncome`, `spouseRrspWithdrawal`, `spouseRrspBalance`, `spouseTfsaBalance` |
| Cashflow | `expenses`, `debtPayments`, `surplus`, `netWorth` |

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
- Update this file's project structure tree
- Add the user flow
- Update `docs/learned-rules.md` if new domain rules discovered

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | App shell — all top-level state, view routing, scenario CRUD |
| `src/constants/defaults.js` | Scenario shape, wizard steps, preset values |
| `src/constants/taxTables.js` | Imports `data/*.json`; exports `PROVINCE_DATA`, `PROVINCE_CODES`, `PROVINCE_NAMES`, and backward-compat constants; `_injectLiveTaxData(federal, provinces)` swaps all live bindings at runtime |
| `data/federal.json` | 2025 federal tax brackets, OAS/TFSA parameters |
| `data/provinces/*.json` | 2025 provincial brackets, credits, probate, intestacy per province |
| `data/canlii-state.json` | Last-seen CanLII amendment dates for 18 probate/intestacy acts |
| `scripts/update-tax-data.js` | Annual tax data freshness audit + update checklist |
| `scripts/check-canlii.js` | CanLII legislation amendment monitor (pass `--fetch` to hit URLs) |
| `src/engines/projectionEngine.js` | Year-by-year retirement cash flow engine |
| `src/engines/taxEngine.js` | Tax calculation (federal, Ontario, clawbacks, credits) |
| `src/engines/estateEngine.js` | Estate tax, probate, distribution |
| `src/engines/withdrawalCalc.js` | Sustainable withdrawal (binary search) |
| `src/engines/incomeHelpers.js` | Pure income helper functions (CPP, OAS, GIS, GAINS, capital gains) |
| `src/services/supabaseClient.js` | Supabase client singleton |
| `src/services/geminiService.js` | Sends `{type, context}` to gemini-proxy; in-memory cache |
| `src/services/adminService.js` | `adminApi` — all admin edge function calls |
| `src/utils/analytics.js` | Plausible custom event helper — trackEvent(name, props) |
| `src/utils/formatters.js` | Currency/percent formatting, UUID generation |
| `docs/architecture.md` | This file |
| `docs/AGENTS.md` | AI agent protocol |
| `docs/learned-rules.md` | Domain-specific pitfalls |

## Build & Run

```bash
# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Run tests (277 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/taxEngine.test.js

# Build for production (outputs to /dist)
npm run build

# Preview production build locally
npm run preview

# Annual maintenance
npm run update:tax          # audit data freshness + CRA update checklist
npm run check:legislation   # show CanLII acts on watch; add --fetch to detect amendments
npm run generate:golden     # regenerate golden regression snapshots (run after tax-year update)
```

## Code Style

- **File limit**: 300 lines max — refactor immediately if exceeded
- React functional components with hooks (no class components)
- Tailwind CSS for all styling (no CSS modules or inline style objects)
- Named exports preferred
- Props destructured in function signature
- `camelCase` for variables/functions, `PascalCase` for React components
- Use immutable patterns (`const`, spread, `map`/`filter`)
- No `console.log` in committed code

## Performance Guidelines

- Target: instant wizard navigation, <100ms projection recalculation
- Projections cached via `useMemo` — only recompute when scenario or overrides change
- Charts use Recharts responsive containers — avoid unnecessary re-renders
- Sustainable withdrawal uses binary search (not brute force) for efficiency
- No network calls except optional Gemini API (user-initiated)

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
```

## Testing Infrastructure

```
tests/
  taxEngine.test.js             ← Federal/Ontario tax, surtax, OAS clawback, RRIF minimums (51)
  projectionEngine.test.js      ← Year-by-year projection with multiple persona scenarios (45)
  estateEngine.test.js          ← Death tax, probate, intestacy distribution (32)
  withdrawalCalc.test.js        ← Sustainable withdrawal binary search, overrides, monotonicity (20)
  multiProvinceEngine.test.js   ← Province-aware calcProvincialTax/probate/intestacy (47)
  goldenFileTests.test.js       ← Per-province regression snapshots — 4 assertions × 9 provinces (36)
  portfolioChartHelpers.test.js ← Chart milestone helpers (20)
  waterfallChartHelpers.test.js ← Waterfall chart tax helpers (26)
  golden/                       ← Committed JSON snapshots; regenerate with: npm run generate:golden
```

- **Framework**: Vitest (Vite-native, Jest-compatible API)
- **Run**: `npm test` (277 tests) or `npx vitest run`
- **Watch**: `npm run test:watch` or `npx vitest`
- Unit tests for all engine functions (tax, projection, estate, withdrawal)
- Province-aware tests in `multiProvinceEngine.test.js` for all 9 provinces
- Golden regression tests lock down full end-to-end output per province; failing = unintentional change
- Test with sample scenario JSON files for persona-based validation
- Edge cases to cover:
  - Zero income, zero balances
  - Maximum age (100+), minimum age
  - Tax bracket boundaries (exact threshold values)
  - OAS clawback zone (~$93.4K in 2025)
  - RRIF minimum percentages at each age
  - Couple vs. single scenarios
  - Negative surplus (portfolio depletion)
  - Manitoba: zero probate; NS: no age-amount phase-out
- Mock `geminiService.js` for any service-level tests

## Shared Component Rules

- All shared components (`src/components/`) must handle empty/zero/null data gracefully
- Chart components must handle empty projection arrays without crashing
- FormField must handle edge cases: very long input, negative numbers, paste events
- SummaryCard must handle `$0`, negative values, and very large numbers
- Guard against division by zero before passing computed values to components

## Key Design Decisions

- **No router library**: Simple state-based view switching in `App.jsx` — app has <6 views
- **No state library**: React `useState` + prop drilling — component tree is shallow (max 3 levels)
- **All tax math isolated**: Engines have zero UI dependencies, independently testable
- **Multi-province**: 9 English Canadian provinces (ON, BC, AB, SK, MB, NB, NS, NL, PE) — tax/probate/intestacy data per province in `data/provinces/*.json`
- **No backend**: All computation client-side, persistence via JSON file export/import
- **Optional AI**: Gemini integration is fully optional — app works without any API key
  - API key stored in localStorage (user-provided)
  - `src/services/geminiService.js`: API wrapper with in-memory caching
  - `src/components/AiInsight.jsx`: Card component with shimmer loading
  - Integrated into Dashboard, Compare, and Estate views
  - Graceful degradation: works without API key, shows setup prompt

## Deploy Pipeline

```bash
# Build for production
npm run build

# Deploy to static hosting (choose one):
# Netlify: drag /dist folder to Netlify dashboard, or connect Git repo
# Vercel: vercel --prod
# GitHub Pages: copy /dist contents to gh-pages branch
# S3: aws s3 sync dist/ s3://your-bucket --delete
```

Frontend auto-deploys to Vercel on push to `main`.
Supabase edge functions deploy separately: `supabase functions deploy <fn> --use-api --no-verify-jwt`
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

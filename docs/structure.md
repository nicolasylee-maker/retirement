# Project Structure

> **Keep this file in sync with the actual `src/` directory.** See `CLAUDE.md` → DOCUMENTATION RULES.

```
retirement/
├── index.html                              ← HTML shell, loads /src/main.jsx
├── package.json                            ← Dependencies & npm scripts
├── CLAUDE.md                               ← Claude Code instructions (boot, rules, domain)
├── vite.config.js                          ← Vite dev server (port 5173) + React plugin
├── tailwind.config.js                      ← Custom colors (sunset, lake, forest), Inter font
├── postcss.config.js                       ← PostCSS + Tailwind + Autoprefixer
│
├── docs/
│   ├── architecture.md                     ← High-level architecture, data flow, conventions
│   ├── structure.md                        ← This file (full project tree)
│   ├── learned-rules.md                    ← Domain pitfalls (tax, estate, withdrawal, engine)
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
│   │   ├── demoScenario.js                 ← DEMO_SCENARIO + DEMO_PROJECTION for landing page preview
│   │   ├── designTokens.js                 ← Color palettes, chart styles, design constants
│   │   └── taxTables.js                    ← Imports data/*.json; exports PROVINCE_DATA, PROVINCE_CODES, PROVINCE_NAMES + backward-compat constants
│   │
│   ├── data/
│   │   └── defaultData.json                ← Default bundled data (fallback for TaxDataContext)
│   │
│   ├── engines/                            ← Pure business logic (zero React dependencies)
│   │   ├── projectionEngine.js             ← Year-by-year retirement cash flow projections
│   │   ├── incomeHelpers.js                ← Pure income benefit helpers (CPP, OAS, GIS, GAINS, capital gains)
│   │   ├── taxEngine.js                    ← Federal + provincial tax, OAS clawback, RRIF minimums
│   │   ├── estateEngine.js                 ← Estate tax, probate, distribution analysis
│   │   ├── withdrawalCalc.js               ← Sustainable withdrawal binary search
│   │   ├── optimizerEngine.js              ← Plan optimizer: tests 8 dimensions (CPP/OAS, withdrawal order, meltdown, debt, expenses)
│   │   ├── auditInputSnapshot.js           ← Audit section 1: full input snapshot table
│   │   ├── auditProjection.js              ← Audit sections 2–3: projection table + CPP/OAS verification
│   │   ├── auditTaxDebt.js                 ← Audit sections 4–5: tax worked example + debt trace
│   │   └── auditAnalysis.js                ← Audit sections 6–10: estate, withdrawal, RRIF, gaps, KPIs
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx                 ← Supabase session; provides user, isLoading, signOut, signInWithGoogle/MagicLink
│   │   ├── SubscriptionContext.jsx         ← Stripe sub state; provides isPaid, isTrial, isPastDue, isOverride
│   │   └── TaxDataContext.jsx              ← Fetches tax_data from DB on startup; calls _injectLiveTaxData; falls back to bundled JSON
│   │
│   ├── hooks/
│   │   └── useCloudSync.js                 ← Supabase scenario sync: fetch on sign-in, auto-save on change
│   │
│   ├── services/
│   │   ├── supabaseClient.js               ← Supabase client singleton (auth + DB)
│   │   ├── scenarioService.js              ← fetchScenarios, saveScenario — Supabase CRUD for scenarios table
│   │   ├── stripeService.js                ← startCheckout(priceId), openBillingPortal() — calls edge fns
│   │   ├── geminiService.js                ← Sends {type, context} to gemini-proxy edge fn; in-memory cache
│   │   └── adminService.js                 ← adminApi: stats, users, config, subscriptions, tax data, legislation
│   │
│   ├── utils/
│   │   ├── analytics.js                    ← Plausible custom event helper (no-ops if window.plausible absent)
│   │   ├── buildAiData.js                  ← Builds structured AI context payloads per view (dashboard, debt, compare, estate)
│   │   ├── buildAiPrompt.js                ← Client-side port of gemini-proxy buildPrompt(); resolves {variables} for all 5 insight types
│   │   ├── debtCalc.js                     ← calcDebtSchedule: debt amortization schedule (balance, interest, principal per year)
│   │   ├── downloadAudit.js                ← Audit report assembler + Markdown download trigger
│   │   ├── formatters.js                   ← Currency, percent, UUID, math utilities
│   │   ├── generateReport.js               ← HTML retirement report (PDF-printable, inputs + projection)
│   │   ├── openPrintReport.js              ← Opens new window, renders PrintReportView via React createRoot
│   │   ├── responsiveChartHeight.js        ← Pure fn: returns mobileH when windowWidth<640, else desktopH
│   │   ├── returningUserFlow.js            ← Pure helpers: getSignInRoute, getPickerTarget, formatScenarioMeta
│   │   └── excel/                          ← Excel audit workbook (premium)
│   │       ├── index.js                    ← downloadExcelAudit: orchestrator, creates multi-sheet workbook
│   │       ├── styles.js                   ← Shared Excel cell styles (fonts, borders, fills)
│   │       ├── sheetAssumptions.js         ← Sheet: input assumptions summary
│   │       ├── sheetProjection.js          ← Sheet: year-by-year projection table
│   │       ├── sheetTaxEngine.js           ← Sheet: tax calculation worked example
│   │       ├── sheetCppOas.js              ← Sheet: CPP/OAS benefit verification
│   │       ├── sheetRrifRates.js           ← Sheet: RRIF minimum withdrawal rates
│   │       ├── sheetEstate.js              ← Sheet: estate tax + distribution
│   │       └── sheetOptimizer.js           ← Sheet: optimization recommendations
│   │
│   ├── components/                         ← Reusable UI components
│   │   ├── AccountMenu.jsx                 ← User avatar dropdown: sign-in/out, billing portal, admin link
│   │   ├── AiInsight.jsx                   ← AI recommendation card (Gemini integration, hash-based staleness)
│   │   ├── AuthPanel.jsx                   ← Sign-in panel: Google OAuth + magic link email
│   │   ├── Button.jsx                      ← Primary/secondary/text button variants
│   │   ├── Card.jsx                        ← Base card wrapper with border + shadow
│   │   ├── ChartLegend.jsx                 ← Horizontal color-dot legend strip (replaces Recharts Legend)
│   │   ├── ContactModal.jsx                ← Contact form modal (sends to send-contact edge fn via Resend)
│   │   ├── EnvironmentBadge.jsx            ← LOCAL/DEV/PROD badge (hidden in production)
│   │   ├── ErrorFallback.jsx               ← Sentry ErrorBoundary fallback UI (friendly reload screen)
│   │   ├── FormField.jsx                   ← Input with label, helper text, $ prefix, validation
│   │   ├── GatedButton.jsx                 ← Premium gate wrapper: shows upgrade modal for non-subscribers
│   │   ├── HelpIcon.jsx                    ← Tooltip with info icon
│   │   ├── ProgressBar.jsx                 ← Wizard step progress indicator
│   │   ├── PulsingDot.jsx                  ← Animated red dot for important field attention
│   │   ├── QuickFillPills.jsx              ← Quick-select preset buttons
│   │   ├── RichTooltip.jsx                 ← Portal-based popover for KPI breakdowns (sections + stacked bar)
│   │   ├── SliderControl.jsx               ← Range slider with formatted display
│   │   ├── SubscriptionBadge.jsx           ← Header pill: trial countdown, beta, lifetime status
│   │   ├── SummaryCard.jsx                 ← Dashboard KPI card (label, value, subtitle)
│   │   ├── SunsetIllustration.jsx          ← Welcome screen SVG illustration
│   │   └── UpgradePrompt.jsx               ← Premium upgrade prompt (full + compact, plan toggle, feature grid)
│   │
│   └── views/                              ← Page-level view components
│       ├── LandingPage.jsx                 ← Public landing page: hero, demo charts, Google sign-in CTA
│       ├── WelcomeScreen.jsx               ← Signed-in home (New Plan / Load Saved Plan)
│       ├── ReturningHomeView.jsx           ← Returning-user choice screen (View Results / Edit / New Plan)
│       ├── ScenarioPickerView.jsx          ← Scenario list picker (action: 'results' | 'edit')
│       ├── MyPlansView.jsx                 ← Scenario card grid with edit/view actions
│       ├── SaveNudgeScreen.jsx             ← Post-wizard prompt to save plan (sign-in nudge)
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
│       │   ├── SummaryCards.jsx             ← Net worth, income, tax, surplus KPIs
│       │   ├── PortfolioChart.jsx           ← Area chart of total portfolio over time
│       │   ├── PortfolioChartTooltip.jsx    ← Extracted CustomTooltip for PortfolioChart
│       │   ├── portfolioChartHelpers.js     ← buildMilestones (stagger levels) + buildPhaseAnnotations
│       │   ├── IncomeExpenseChart.jsx       ← Stacked area: income sources vs expenses line over time
│       │   ├── WithdrawalChart.jsx          ← Stacked bar: RRSP/TFSA/non-reg/other withdrawals by year
│       │   ├── waterfallChartHelpers.js     ← Waterfall chart colors, tax/growth/shortfall bar computation
│       │   ├── AccountChart.jsx             ← Stacked bar chart by account type
│       │   └── MilestoneCards.jsx           ← Portfolio milestone achievements
│       │
│       ├── compare/                        ← Scenario comparison view (premium)
│       │   ├── CompareView.jsx             ← Scenario selector + controls
│       │   ├── CompareChart.jsx            ← Multi-line portfolio comparison chart
│       │   └── CompareTable.jsx            ← Year-by-year comparison table
│       │
│       ├── debt/                           ← Debt analysis view
│       │   └── DebtView.jsx                ← Debt schedules, payoff charts, interest breakdown, AI insight
│       │
│       ├── estate/                         ← Estate planning view (premium)
│       │   ├── EstateView.jsx              ← Death age slider, will toggle
│       │   ├── EstateSummaryCards.jsx       ← Estate KPI cards
│       │   └── EstateBreakdown.jsx         ← Tax breakdown + distribution to heirs
│       │
│       ├── recommendations/                ← Optimize My Plan view
│       │   ├── RecommendationsTab.jsx      ← Summary banner, ranked cards, upgrade CTA, already-optimal list
│       │   └── RecommendationCard.jsx      ← Single recommendation: badge, impact pills, before/after, Apply button
│       │
│       ├── audit/                          ← Deep Dive — phase-by-phase visual audit (premium)
│       │   ├── VisualAudit.jsx             ← Orchestrator: dynamic phase filtering, dual-mode (inline tab / modal)
│       │   ├── PhaseTimeline.jsx           ← Horizontal pill nav for phase sub-navigation
│       │   ├── AuditSummaryPage.jsx        ← Executive summary: 4 big stats + phase navigation cards
│       │   ├── IncomeExpenseBar.jsx        ← ComposedChart: stacked income/expense bars + optional line overlay (dual Y-axis)
│       │   ├── IncomePie.jsx               ← Pie chart: income source breakdown for a phase
│       │   ├── SankeyDiagram.jsx           ← D3 Sankey: income → expense/tax/saving flow diagram
│       │   ├── MathCard.jsx                ← Expandable "show me the math" card (title + detail breakdown)
│       │   ├── PhasePreRetirement.jsx      ← Working Years: income vs expenses chart, portfolio line, 3 KPIs
│       │   ├── PhaseEarlyRetirement.jsx    ← Early Retirement: drawdown chart, portfolio line, 3 KPIs
│       │   ├── PhaseRRIF.jsx               ← Age 72+: RRIF withdrawals chart, portfolio line, 3 KPIs
│       │   ├── PhaseEstate.jsx             ← Estate breakdown at life expectancy
│       │   └── PhaseOptimizer.jsx          ← Optimization summary
│       │
│       ├── print/                          ← Print-optimized report (opened in new window)
│       │   ├── PrintReportView.jsx         ← Full report orchestrator: cover + all sections
│       │   ├── PrintInputsSection.jsx      ← Input assumptions table for print
│       │   ├── PrintDashboardSection.jsx   ← Dashboard charts/KPIs for print
│       │   ├── PrintDebtSection.jsx        ← Debt schedules for print
│       │   └── PrintEstateSection.jsx      ← Estate analysis for print
│       │
│       └── admin/                          ← Full-screen admin overlay (fixed inset-0 z-50)
│           ├── AdminView.jsx               ← Sidebar nav + section switcher
│           ├── sections/
│           │   ├── OverviewSection.jsx     ← Stat cards + 30-day signup chart
│           │   ├── UsersSection.jsx        ← User table, search, override select, invite
│           │   ├── AiConfigSection.jsx     ← Live model/temp/token/prompt editing
│           │   ├── AiTestingSection.jsx    ← AI A/B testing orchestrator: user/scenario/provider/model state, parallel run
│           │   ├── SubscriptionsSection.jsx← Stripe subscription table + status badges
│           │   └── MaintenanceSection.jsx  ← Tax data JSON editor + legislation monitor
│           └── components/
│               ├── StatCard.jsx            ← Reusable stat display card
│               ├── SignupChart.jsx         ← Recharts BarChart (signups by day)
│               ├── UserScenariosPanel.jsx  ← Slide-out right panel for user's scenarios
│               ├── ScenarioPreviewModal.jsx← Full-screen preview: Dashboard/Debt/Compare/Estate/Deep Dive tabs
│               ├── InviteModal.jsx         ← Invite user modal (wraps send-invite edge fn)
│               ├── TaxDataEditor.jsx       ← Province JSON editor; exports parseTaxJson, runTaxSmokeTest
│               ├── LegislationPanel.jsx    ← CanLII status table + Run Check button
│               ├── AiTestConfigPanel.jsx   ← AI Testing config UI (insight type, user/scenario search, provider/model)
│               └── AiTestResultPanel.jsx   ← AI Testing 3-column result display (Gemini | Rival | Raw Prompt)
│
├── tests/                                  ← Vitest test files (14 files, run: npm test)
│   ├── taxEngine.test.js                   ← Federal/provincial tax, OAS clawback, RRIF mins
│   ├── projectionEngine.test.js            ← Year-by-year projections with persona scenarios
│   ├── estateEngine.test.js                ← Death tax, probate, intestacy distribution
│   ├── withdrawalCalc.test.js              ← Sustainable withdrawal, overrides, monotonicity
│   ├── multiProvinceEngine.test.js         ← Province-aware tax/probate/intestacy (all provinces)
│   ├── goldenFileTests.test.js             ← Per-province regression snapshots
│   ├── portfolioChartHelpers.test.js       ← Chart helper functions
│   ├── waterfallChartHelpers.test.js       ← Waterfall chart helpers
│   ├── taxTablesInject.test.js             ← _injectLiveTaxData live-binding correctness
│   ├── taxDataHelpers.test.js              ← parseTaxJson, runTaxSmokeTest
│   ├── aiInsightsPersistence.test.js       ← AI insight caching, hash staleness
│   ├── returningUserFlow.test.js           ← Sign-in routing, picker target
│   ├── mobilePolish.test.js                ← Mobile-specific UI helpers
│   ├── optimizerEngine.test.js             ← All 8 optimization dimensions
│   └── golden/                             ← Committed JSON snapshots (npm run generate:golden)
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

### Flow 4: Debt Analysis
```
Dashboard
    ↓ "Debt" tab
DebtView (amortization schedules, payoff charts, interest breakdown)
    ↓ optional
AiInsight (debt-specific AI recommendations)
```

### Flow 5: Deep Dive (Premium)
```
Dashboard
    ↓ "Deep Dive" tab (premium-gated)
VisualAudit (phase timeline sub-nav)
    ↓ phases filtered dynamically based on scenario ages
AuditSummaryPage → PhasePreRetirement → PhaseEarlyRetirement → PhaseRRIF → PhaseEstate → PhaseOptimizer
    Each phase page: IncomeExpenseBar (ComposedChart with portfolio line overlay) + 3 KPI cards
```

### Flow 6: PDF / Excel Reports (Premium)
```
Dashboard ⋮ menu
    ↓ "PDF Report" (premium-gated)
openPrintReport → new window → PrintReportView (cover + inputs + dashboard + debt + estate)
    ↓ "Excel Report" (premium-gated)
downloadExcelAudit → multi-sheet .xlsx workbook (assumptions, projection, tax, CPP/OAS, RRIF, estate, optimizer)
```

### Flow 7: Load Saved Plan
```
WelcomeScreen
    ↓ "Load Saved Plan" (JSON file picker)
Dashboard (loaded scenario)
```

### Flow 8: Cloud Sync
```
User signs in (Google OAuth or magic link)
    ↓ useCloudSync
fetchScenarios(userId) → replaces in-memory scenarios
    ↓ on scenario change
saveScenario(userId, scenario) → upserts to Supabase
```

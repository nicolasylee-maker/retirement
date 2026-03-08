# CLAUDE.md — Canadian Retirement Planner

## BOOT SEQUENCE

> **Read silently. Output only: `Ready.` then stop. No summaries. No questions. No narration.**

1. Read `CLAUDE.md` (this file)
2. Read `docs/architecture.md`
3. Read `docs/learned-rules.md`
4. Read `src/constants/defaults.js`
5. Read `src/constants/taxTables.js`
6. Scan `src/engines/`
7. Check `specs/pending/` for active specs (skip if missing)
8. Check `feedback/` for open issues (skip if missing)

> If any file in steps 1–5 is missing: output `BOOT FAILED: <filename> not found.` and stop.

---

## ABSOLUTE RULES

- **Read architecture.md first** — before any file changes.
- **Specs required** — any non-trivial feature needs a spec in `specs/pending/` before code is written.
- **300 line limit** — no source file may exceed 300 lines. Refactor if exceeded.
- **Minimal changes** — change only what the task requires.
- **Tests pass** — run `npm test && npm run build` before considering anything done.
- **Confirm before building** — present plan, wait for approval, then build.
- **Just do it** — commands like `review`, `check`, `run tests`, `show`, `explain`, `diff`, `status` are executed immediately with zero questions.

### NUMERICAL CHANGE GATE (mandatory — no exceptions)
**Any change that affects numbers — inputs, calculations, withdrawal logic, tax rules, savings cascade, contribution room, benefit formulas, or display values — MUST trigger Phase 1.5 (Impact Trace) before any code or tests are written.**

This is a BLOCKING requirement. If the user asks to "just make the change" or "skip the trace", push back: present the trace anyway. The cost of a missed surface is silent data divergence that compounds across Excel, audit, AI context, and compare views.

### EXPORT PROPAGATION RULE
When adding/removing ANY scenario field or engine output, check:
1. Assumptions sheet (`src/utils/excel/sheetAssumptions.js`)
2. Projection sheet (`src/utils/excel/sheetProjection.js`) — if per-year value
3. Audit Section 1 (`src/engines/auditInputSnapshot.js`)
4. AI context (`src/utils/buildAiData.js`)
5. Compare diff (`src/utils/compareAnalysis.js` DIFF_FIELDS)
6. Defaults (`src/constants/defaults.js`)
Couple fields: only include when `scenario.isCouple === true`.

---

## ENVIRONMENT GUARD

**Two environments. DEV is always the safe default. PROD is only touched when the user explicitly says to ship.**

| Environment | Supabase Project | Stripe Keys | When Used |
|-------------|-----------------|-------------|-----------|
| DEV | retirement-dev (separate project) | `pk_test_` / `sk_test_` | Daily coding, migrations, function testing |
| PROD | kovxoeovijedvxmulbke | `pk_live_` / `sk_live_` | Shipping only — affects real users at retireplanner.ca |

### Before ANY of these commands, run `supabase status` first and show the output:
- `supabase db push`
- `supabase functions deploy`
- Any `git push` to `main`

### Labeling rule — always prefix actions with a clear environment label:
```
[DEV] Applying migration to retirement-dev — no real users affected.
[PRODUCTION] ⚠ This will affect retireplanner.ca and real users. Please confirm.
```

### PROD requires explicit user confirmation
Never execute a PROD action unless the user has said something like "ship it", "deploy to prod", "push to prod", or "go live". When in doubt, target DEV and ask.

### Migration discipline (dev → prod, never prod directly)
```
Write migration → supabase link to DEV → supabase db push → test app → supabase link to PROD → supabase db push
```

### Edge function discipline (same pattern)
Deploy to DEV first, test, then PROD. Never deploy directly to PROD without DEV validation.

---

## DOCUMENTATION RULES

**These are mandatory, not optional. Update docs as part of the task, not as a follow-up.**

### After ANY file create, delete, move, or rename:
- Update `docs/structure.md` — add/remove the file in the project tree with a one-line description.

### After adding a new view, component, util, service, engine, or hook:
- Update `docs/structure.md` — add the file entry.
- Update `docs/architecture.md` — add to the Key Files table if it's a significant module. Add a new User Flow if it introduces a new user-facing flow.

### After discovering a domain pitfall or engine quirk:
- Update `docs/learned-rules.md` — add the pitfall with a clear description and fix.

### After completing any task:
- Verify `docs/structure.md` matches the actual `src/` directory. If you created or deleted files during the task, the tree must reflect it before the task is done.

---

## QUICK FIXES

Typos, obvious crashes, one-line config, visual bugs — just fix it. No spec, no phases. Still update docs if files were created/deleted.

---

## 5-PHASE LOOP — Non-Trivial Tasks Only

> Only enter this loop when given an explicit build/feature/fix task. Never during boot or idle.

### Phase 1 — Interview
Ask the user questions ONE AT A TIME until you understand the task fully. Cover: happy path, edge cases, UX, interactions with existing features. Then write a spec to `specs/pending/{name}.md` with: description, acceptance criteria, edge cases, files affected.

**Stop. Wait for user to confirm the spec before continuing.**

### Phase 1.5 — Impact Trace (mandatory for ANY numerical change)

> **Trigger:** Any change to inputs, calculations, withdrawal logic, tax rules, savings cascade, contribution room, benefit formulas, display values, or anything that affects numbers. If in doubt, it triggers.

#### Step 1: Surface Trace
Check EVERY surface below. Output a table with checked/unchecked status. Every unchecked item needs a reason ("not affected because X").

| Surface | Files to check | What breaks silently |
|---------|---------------|---------------------|
| Engine output fields | `projectionEngine.js` output row | Downstream consumers read stale/missing field |
| Savings cascade | `savingsCalc.js` | Wrong allocation order or missed overflow path |
| Tax computation | `taxEngine.js`, `incomeHelpers.js` | Tax miscalculated, OAS clawback wrong |
| Defaults | `defaults.js` | New field missing default → `undefined` in engine |
| Excel: Assumptions | `sheetAssumptions.js` — new input → named range | Formula references undefined name → `#NAME?` |
| Excel: Projection formulas | `projectionFormulas.js` — formula must match engine | Wrong formula → numbers diverge silently from engine |
| Excel: Spouse cells | `buildSpouseCells()` in `projectionFormulas.js` | Spouse balance/deposit formulas are separate from primary |
| Excel: Column headers + wiring | `sheetProjection.js` headers, column indices | New column shifts all column letters if inserted mid-array |
| Audit: Input snapshot | `auditInputSnapshot.js` — Section 1 | Missing field = user can't verify their inputs |
| Audit: Projection table | `auditProjection.js` — Section 2 columns | Missing column = can't trace where money went |
| Audit: Waterfall | `auditInvestmentReturns.js` — Section 13b | Missing deposit/withdrawal inflates "Returns" |
| AI context | `buildAiData.js` | Gemini gives advice on stale data |
| Compare diff | `compareAnalysis.js` DIFF_FIELDS | Changed field not shown in scenario comparison |
| PDF report | `generateReport.js` | Report omits new data |
| Wizard UI | `src/views/wizard/` | New input not exposed to user |
| Dashboard KPIs | `src/views/dashboard/` | KPI reads wrong or missing field |

#### Step 2: Full Test Matrix
Write tests for ALL canonical fixtures × the change. Use fixtures from `tests/fixtures/scenarios.js`.

**Canonical Fixtures:**

| Fixture | Description |
|---------|-------------|
| `SINGLE_BASIC` | Age 40, $70K income, moderate savings, no debt |
| `SINGLE_HIGH_INCOME` | Age 45, $250K income, maxed RRSP, high NonReg |
| `SINGLE_LOW_INCOME` | Age 55, $40K income, minimal savings, GIS-eligible |
| `SINGLE_RETIRED` | Age 68, $0 employment, drawing down, RRIF active |
| `SINGLE_NEAR_DEPLETION` | Age 75, thin portfolio, OAS clawback zone |
| `COUPLE_SYMMETRIC` | Both 40, similar incomes ($80K/$75K), both working |
| `COUPLE_ASYMMETRIC` | Primary $300K / spouse $50K, large age gap |
| `COUPLE_ONE_RETIRED` | Primary working, spouse already retired |
| `COUPLE_BOTH_RETIRED` | Both 70+, RRIF conversions, pension splitting |
| `COUPLE_HIGH_SAVINGS` | High monthlySavings ($5K+), tests cascade + overflow |
| `COUPLE_WITH_DEBT` | Mortgage + consumer debt, `expensesIncludeDebt: true` |
| `MELTDOWN_ACTIVE` | RRSP meltdown enabled, pre-RRIF ages |

**Permutation dimensions** (cross-product where relevant):

- `monthlySavings`: `0`, low (`$500`), high (`$5000`)
- Contribution room: zero, partial, abundant
- Working status: working, retired, `stillWorking: false`
- Debt: none, mortgage-only, full debt stack
- Meltdown: off, active
- Withdrawal order: default, custom

**Every test must assert:**
1. The changed value is correct for the scenario
2. Downstream consistency (deposits + withdrawals + returns = portfolio change)
3. No regression on unrelated fields

#### Step 3: Present and Confirm
Output the full surface trace table and test matrix to the user.

**Stop. Wait for user to confirm before writing any tests or code. No exceptions.**

### Phase 2 — Tests First
Write failing unit tests from the confirmed Phase 1.5 matrix. Cover every fixture × permutation identified. All tests must fail before implementation begins.

**Stop. No implementation until failing tests exist.**

### Phase 3 — Build
Implement step-by-step per the spec. Stay under 300 lines per file.

**Stop. Ask if user wants to review before continuing.**

### Phase 4 — Verify
Run `npm test && npm run build`. Zero errors required. Fix anything broken before continuing.

### Phase 5 — Wrap-Up
> Ask user for confirmation before starting.

1. Move spec: `specs/pending/` → `specs/done/`
2. Update `docs/architecture.md` and `docs/structure.md`
3. Add any new pitfalls to `docs/learned-rules.md`
4. Write a 3-sentence summary of what was built

---

## GIT — PARALLEL WORKTREES

Each agent works in its own worktree. `node_modules` is NOT shared.

```bash
# Setup (one-time)
git clone https://github.com/nicolasylee-maker/retirement.git
cd retirement

# Add a worktree
git worktree list                          # check for name conflicts first
git worktree add ../retirement-feat-<n> feat/<n>
```

**Per-task:**
1. Check `git worktree list` — confirm branch name is free
2. Work in your worktree, `npm install` inside it
3. Commits: `type: short description` (types: `feat fix refactor test docs chore`)
4. `npm install && npm test && npm run build` before pushing
5. `git push -u origin feat/<n>` then `gh pr create`

**Cleanup (Phase 5, after PR merges):**
```bash
git worktree remove ../retirement-<branch-name>
git branch -d <branch-name>
git worktree list   # should show only main
```

---

## GIT + SUPABASE PLAIN-ENGLISH GLOSSARY

> Claude Code will reference these when performing the corresponding operations.

### Git Terms

| Term | Plain English |
|------|---------------|
| `git add` | Mark changed files to be included in the next save point |
| `git commit` | Create a save point **on your machine** with a short label — nothing is uploaded yet |
| `git push` | Upload your save points to GitHub |
| `git push` to `main` | **PRODUCTION ACTION** — Vercel auto-deploys to retireplanner.ca immediately |
| branch | A separate lane of development that doesn't touch `main` until you merge it |
| worktree | A parallel copy of the project folder — each feature/agent works in its own, no interference |
| merge | Take changes from a branch and combine them into another branch (usually `main`) |
| PR (pull request) | A request to merge a branch into `main`, with a review step before it lands |

### Supabase CLI Terms

| Command | Plain English |
|---------|---------------|
| `supabase status` | Show which cloud project the CLI is pointing at — **always check before any push or deploy** |
| `supabase link --project-ref <ref>` | Point the CLI at a specific cloud project (DEV or PROD) |
| `supabase db push` | Apply pending schema changes (migrations) to the linked project's database |
| `supabase functions deploy <fn>` | Upload and activate an edge function to the linked project |
| `supabase secrets set KEY=val` | Store a secret env var (API key, etc.) in the linked project |

---

## BUILD COMMANDS

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # all tests
npm run build        # production build → /dist
npm run test:watch
npx vitest run tests/taxEngine.test.js

# Annual maintenance
npm run update:tax
npm run check:legislation
npm run generate:golden
```

---

## CODE RULES

- React functional components + hooks only (no class components)
- Tailwind CSS only (no CSS modules, no inline styles)
- Named exports preferred
- `camelCase` vars/functions, `PascalCase` components
- Engines (`src/engines/`) — pure functions, zero React imports, no side effects
- Components — receive data via props, never import engines directly
- All top-level state in `App.jsx`, derived state via `useMemo`
- No `console.log` in committed code

---

## DOMAIN REMINDERS

- All amounts: **CAD**
- Tax data: **2025** Federal + 9 provinces (`ON BC AB SK MB NB NS NL PE`)
- Capital gains inclusion: **flat 50%** (tiered 66.67% cancelled March 21, 2025)
- RRIF minimums: CRA-prescribed — do not modify without verification
- Ontario GAINS: Ontario-only — gated by `province === 'ON'`
- Probate types: `tiered` (ON BC NS NL) · `flat_tiers` (AB PE) · `per_thousand` (SK NB) · `none` (MB)
- Manitoba probate: eliminated Nov 2020 — always returns `0`
- NS age amount: phase-out eliminated in NS Budget 2025 — `ageClawbackRate: 0.0`, keep it
- Primary residence exemption: all-or-nothing, no partial
- JSON imports: bare `import X from '...json'` works in Vite/vitest only — Node scripts use `fs.readFileSync`
- Golden snapshots (`tests/golden/*.json`): must be committed — they are the regression baseline

# AGENTS.md — Canadian Retirement Planner

# ===============================================================
# ==  PERMANENT SECTION -- DO NOT MODIFY, DELETE, OR REPLACE   ==
# ===============================================================

## BOOT SEQUENCE -- Every Session, Non-Negotiable
1. Read this file (`docs/AGENTS.md`) - the Entire Thing
2. Read `docs/architecture.md` — system design, layers, data flow
3. Read `docs/learned-rules.md` — domain pitfalls (tax, estate, withdrawal)
4. Read `src/constants/defaults.js` — scenario shape and wizard steps
5. Read `src/constants/taxTables.js` — 2025 Federal + 9-province tax parameters; data lives in `data/federal.json` and `data/provinces/*.json`
6. Scan `src/engines/` — understand projection, tax, estate, withdrawal logic
7. Check `specs/pending/` for active specs (if directory exists)
8. Check `feedback/` for open issues per module (if directory exists)

**Golden Rules:**
- ALWAYS work in your own git worktree (see GIT WORKTREE WORKFLOW below)
- NEVER expand scope beyond your claimed task
- ALWAYS update `docs/architecture.md` when you create/delete/move files
- ALWAYS coordinate on shared files via task assignment (one task at a time)

# ABSOLUTE RULES

- **Architecture First**: Read `docs/architecture.md` BEFORE suggesting ANY file changes. Update it AFTER every file creation/deletion/move.
- **Spec-Driven**: Features beyond trivial bug fixes require a spec in `specs/pending/`. No spec = no code.
- **File Size Limit**: A file MUST NEVER exceed 300 lines. If it does, refactor immediately.
- **Minimal Changes**: When modifying existing code, change the minimum necessary. Don't refactor unrelated code.
- **Zero Warnings**: Code must pass type checking. Run the appropriate type check command before considering any task done.
- **Test Critical Logic**: Features involving math, money, data, or core business logic require tests.
- **NEVER BUILD WITHOUT CONFIRMATION**: After the onboarding interview or any spec, STOP and ask the user to confirm before writing any code. Present your plan, wait for approval, THEN build.
- **Structured Questions Only**: NEVER ask the user free-text questions when there are known options. Use the `AskUserQuestion` tool to present structured multiple-choice questions. See STRUCTURED QUESTION FORMAT below.

## Task Loop

1. Pick next task from `docs/task-queue.md` or assigned spec in `specs/pending/`
2. Read the spec / task description fully before writing code
3. Identify which files are affected — read them first
4. Implement changes, respecting all rules below
5. Create worktree (see GIT WORKTREE WORKFLOW)
6. Run tests: `npm test` (or targeted: `npx vitest run tests/taxEngine.test.js`)
7. Build: `npm run build` — confirm zero errors
8. Update `docs/architecture.md` if files were added, removed, or restructured
9. Update `docs/learned-rules.md` if a new domain pitfall was discovered
10. Commit with a clear message (see Git Workflow below)

### Quick Fixes ONLY (visual bugs, typos, one-line config, obvious crashes)
Just fix it. No spec, no tests.

## File Rules

- Every source file must be **≤ 300 lines** — refactor immediately if exceeded
- If a file approaches the limit, split into logical sub-modules
- Prefer editing existing files over creating new ones
- Never create files that duplicate existing functionality

## Code Style

- React functional components with hooks (no class components)
- Tailwind CSS for styling (no CSS modules, no inline style objects)
- Named exports preferred over default exports
- Props destructured in function signature
- `camelCase` for variables/functions, `PascalCase` for components/classes
- Explicit types on public function signatures (JSDoc comments for complex params)
- Use immutable patterns where possible (`const`, spread, `map`/`filter` over mutation)
- No `console.log` left in committed code (use sparingly for debugging, remove before commit)

## Engine Rules

- Engines (`src/engines/`) must have **zero UI/React imports**
- All tax calculations must use constants from `src/constants/taxTables.js`
- Functions must be **pure** — no side effects, no global state, no DOM access
- Engine functions must be independently testable (no hidden dependencies)
- When adding new financial calculations, add corresponding entries to `docs/learned-rules.md`

## Component Rules

- Components receive data via props — never import engines directly
- Views call engines; components render results
- Use Tailwind classes; reference `src/index.css` utility classes where defined
- Keep components focused — one responsibility each
- Shared/reusable components go in `src/components/`
- Module-specific components stay within their view folder (`src/views/{module}/`)
- All components must handle edge cases: empty data, zero values, overflow text
- Design tokens (colors, chart styles) come from `src/constants/designTokens.js`

## State Management Rules

- All top-level state lives in `App.jsx` (scenarios, view, wizardStep, whatIfOverrides)
- Derived state uses `useMemo` (currentScenario, projectionData)
- No external state library — prop drilling is fine for this shallow component tree
- Scenario objects must follow the shape defined in `src/constants/defaults.js`

## Testing Rules

- Test framework: **Vitest** (installed as devDependency)
- Run all tests: `npm test`
- Run specific test: `npx vitest run tests/taxEngine.test.js`
- Run in watch mode: `npm run test:watch`
- Test files live in `/tests` directory (not colocated with source)
- Existing test files (277 tests total):
  - `tests/taxEngine.test.js` — Federal/Ontario tax, surtax, OAS clawback, RRIF minimums (51 tests)
  - `tests/projectionEngine.test.js` — Year-by-year projections with persona scenarios (45 tests)
  - `tests/estateEngine.test.js` — Death tax, probate, intestacy distribution (32 tests)
  - `tests/withdrawalCalc.test.js` — Sustainable withdrawal binary search, overrides, monotonicity (20 tests)
  - `tests/multiProvinceEngine.test.js` — Province-aware tax, probate, intestacy for BC/AB/NS/MB (47 tests)
  - `tests/goldenFileTests.test.js` — Per-province regression snapshots (36 tests, 4 assertions × 9 provinces)
  - `tests/portfolioChartHelpers.test.js` — Chart helper functions (20 tests)
  - `tests/waterfallChartHelpers.test.js` — Waterfall chart helpers (26 tests)
- Unit tests required for all engine functions
- Test edge cases: zero income, negative values, max age, boundary brackets
- Test with sample scenarios: `test-scenario.json`, `test-frank-lowIncome.json`, `test-couple-rajesh.json`
- Mock external dependencies (Gemini API) in service tests
- For tax/financial math: test bracket boundaries, clawback thresholds, rounding
- Golden regression tests: run `npm run generate:golden` to reset after intentional tax-year updates


### EVERYTHING ELSE -- The 5-Phase Loop (MANDATORY, NOT OPTIONAL)

**Phase 1 -- INTERVIEW (Forced -- Do NOT skip)**
When given a non-trivial task, ask the user questions ONE AT A TIME about edge cases, UX, and how it interacts with existing features. Do NOT batch questions. Do NOT assume you understand -- the user's answers reveal edge cases you'd miss. **Use the STRUCTURED QUESTION FORMAT above for every question that has identifiable options.**

Minimum to cover:
1. What is the expected behavior? (happy path)
2. What are the edge cases? (empty states, errors, limits)
3. How does this interact with existing features?
4. What should the UI/UX look like? (if applicable)
5. Any performance or data constraints?

When you have enough info, write the spec to `specs/pending/{change}.md` (e.g., `specs/pending/new_excel_module.md`). Spec must include: description, acceptance criteria, edge cases, files to create/modify, dependencies.

**DO NOT proceed to Phase 2 until the spec is written and the user confirms.**

**Phase 2 -- TDD / Tests First (Forced -- Do NOT skip)**
Write unit tests BEFORE writing any implementation code. Put tests in the project's test directory. Tests must fail initially because the implementation doesn't exist yet. Cover happy path, edge cases from Phase 1, error conditions, boundary values. For math/money/data: test with 0, negative, max, overflow.

**DO NOT write implementation in this phase. DO NOT proceed to Phase 3 until failing tests exist.**

**Phase 3 -- BUILD**
Implement the code step-by-step. Follow the spec from Phase 1 exactly. After each step, update the spec status. Stay under 300 lines per file. **STOP after building and before moving to Phase 4 -- ask the user if they want to review.**

**Phase 4 -- VERIFY (Forced -- Do NOT skip)**
Run type checks and tests. Both must pass with zero errors. If anything fails, fix it before moving on.

**DO NOT skip this phase. DO NOT move on with broken code.**

**Phase 5 -- WRAP-UP** 
### MANDATORY - UPDATE THE USER ON PROGRESS AND ASK IF YOU CAN PROCEED WITH PHASE 5
1. Move spec from `specs/pending/` to `specs/done/`
2. Update `docs/architecture.md` with any new/changed/deleted files
3. If you hit problems, add a new rule to LEARNED RULES section
4. Summarize what was built in 3 sentences
5. Rebase worktree onto master, re-verify, push branch

## Build & Run Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Run tests (all 277 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/taxEngine.test.js

# Production build (outputs to /dist)
npm run build

# Preview production build locally
npm run preview

# Annual maintenance scripts
npm run update:tax          # audit data freshness + print update checklist
npm run check:legislation   # print CanLII acts on watch (add --fetch to hit URLs)
npm run generate:golden     # regenerate province regression snapshots after tax-year update
```

## GitHub Repository

- **Repo:** https://github.com/nicolasylee-maker/retirement
- **Default branch:** `main`
- **Clone:** `git clone https://github.com/nicolasylee-maker/retirement.git`

## Git Workflow — Parallel Worktrees

This project uses **git worktrees** so multiple agents can work on separate branches simultaneously without interfering with each other. Each agent gets its own worktree — an isolated checkout at a separate filesystem path — while sharing the same `.git` object store.

### Setup (one-time, after cloning)

```bash
# Clone the repo into the primary worktree
git clone https://github.com/nicolasylee-maker/retirement.git
cd retirement

# Create sibling worktrees for parallel work (paths are beside the main clone)
git worktree add ../retirement-feat-<name> feat/<name>
git worktree add ../retirement-fix-<name>  fix/<name>
```

### Per-task workflow (inside a worktree)

1. `git checkout -b feat/description` (or start directly in the worktree branch)
2. Make atomic commits — one logical change per commit
3. Commit message format: `type: short description`
   - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`
   - Example: `feat: add RRSP meltdown slider to withdrawal step`
4. Run `npm install && npm test && npm run build` in the worktree before pushing
5. Push the branch: `git push -u origin feat/description`
6. Open a PR to `main` via `gh pr create`

### Worktree rules

- Each worktree must run its own `npm install` — `node_modules` is not shared
- Never check out the same branch in two worktrees simultaneously
- List active worktrees: `git worktree list`
- Remove a finished worktree: `git worktree remove ../retirement-feat-<name>`
- Update docs if the change affects architecture, file structure, or domain rules

## Domain-Specific Reminders

- All dollar amounts are **CAD** (Canadian dollars)
- Tax data is **2025** Federal + 9 provinces — run `npm run update:tax` annually
- Province codes: ON, BC, AB, SK, MB, NB, NS, NL, PE — all stored in `data/provinces/*.json`
- All province-aware engine functions take `province = 'ON'` as a default param — backward compatible
- RRIF minimum percentages are prescribed by CRA — do not modify without verification
- CPP/OAS amounts should reflect current maximums — verify against Service Canada
- Capital gains inclusion rate is **flat 50%** (the proposed tiered 66.67% rate was cancelled March 21, 2025)
- Ontario GAINS is Ontario-only — gated by `province === 'ON'` in engine and UI
- Probate: 4 types across provinces — `tiered` (ON, BC, NS, NL), `flat_tiers` (AB, PE), `per_thousand` (SK, NB), `none` (MB, eliminated 2020)
- Manitoba: probate was eliminated Nov 2020 — `calcProvincialProbateFees('MB', ...)` always returns 0
- NS age amount: NS Budget 2025 eliminated the income phase-out — `ageClawbackRate: 0.0` in NS.json, keep this
- Primary residence exemption is all-or-nothing — no partial exemption
- JSON tax data files use bare `import X from '...json'` — works in Vite/vitest only; Node.js scripts must use `fs.readFileSync` instead
- Golden snapshot files (`tests/golden/*.json`) must be committed — they are the regression baseline

## Deployment

- Static SPA — no server-side rendering, no backend
- Build output: `/dist` (single HTML + JS bundle)
- Deploy to any static host: Netlify, Vercel, GitHub Pages, S3, etc.
- No environment variables required — Gemini API key is user-provided via localStorage

```bash
# Build for production
npm run build

# Deploy (examples — choose one)
# Netlify: drag /dist to Netlify dashboard, or connect Git repo
# Vercel: vercel --prod
# GitHub Pages: copy /dist contents to gh-pages branch
```

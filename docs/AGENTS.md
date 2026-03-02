# AGENTS.md — Ontario Retirement Planner

## Boot Sequence

1. Read this file (`docs/AGENTS.md`)
2. Read `docs/architecture.md` — system design, layers, data flow
3. Read `docs/learned-rules.md` — domain pitfalls (tax, estate, withdrawal)
4. Read `src/constants/defaults.js` — scenario shape and wizard steps
5. Read `src/constants/taxTables.js` — 2024 Federal/Ontario tax parameters
6. Scan `src/engines/` — understand projection, tax, estate, withdrawal logic
7. Check `specs/pending/` for active specs (if directory exists)
8. Check `feedback/` for open issues per module (if directory exists)

## Task Loop

1. Pick next task from `docs/task-queue.md` or assigned spec in `specs/pending/`
2. Read the spec / task description fully before writing code
3. Identify which files are affected — read them first
4. Implement changes, respecting all rules below
5. Run tests: `npm test` (or targeted: `npx vitest run tests/taxEngine.test.js`)
6. Build: `npm run build` — confirm zero errors
7. Update `docs/architecture.md` if files were added, removed, or restructured
8. Update `docs/learned-rules.md` if a new domain pitfall was discovered
9. Commit with a clear message (see Git Workflow below)

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
- Existing test files:
  - `tests/taxEngine.test.js` — Federal/Ontario tax, surtax, OAS clawback, RRIF minimums (51 tests)
  - `tests/projectionEngine.test.js` — Year-by-year projections with persona scenarios (28 tests)
  - `tests/estateEngine.test.js` — Death tax, probate, intestacy distribution (32 tests)
  - `tests/withdrawalCalc.test.js` — Sustainable withdrawal binary search, overrides, monotonicity (20 tests)
- Unit tests required for all engine functions
- Test edge cases: zero income, negative values, max age, boundary brackets
- Test with sample scenarios: `test-scenario.json`, `test-frank-lowIncome.json`, `test-couple-rajesh.json`
- Mock external dependencies (Gemini API) in service tests
- For tax/financial math: test bracket boundaries, clawback thresholds, rounding

## Build & Run Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/taxEngine.test.js

# Production build (outputs to /dist)
npm run build

# Preview production build locally
npm run preview
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
- Tax tables are **2024** Federal + Ontario — update annually
- RRIF minimum percentages are prescribed by CRA — do not modify without verification
- CPP/OAS amounts should reflect current maximums — verify against Service Canada
- Capital gains inclusion rate changed in 2024 ($250K threshold) — verify current rules
- Ontario GAINS is a provincial benefit separate from federal GIS
- Probate fees are Ontario-specific (Estate Administration Tax)
- Primary residence exemption is all-or-nothing — no partial exemption

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

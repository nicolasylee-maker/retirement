# AGENTS.md — Canadian Retirement Planner

## BOOT SEQUENCE

> **Read silently. Output only: `Ready.` then stop. No summaries. No questions. No narration.**

1. Read `docs/AGENTS.md` (this file)
2. Read `docs/architecture.md`
3. Read `docs/learned-rules.md`
4. Read `src/constants/defaults.js`
5. Read `src/constants/taxTables.js`
6. Scan `src/engines/`
7. Check `specs/pending/` for active specs (skip if missing)
8. Check `feedback/` for open issues (skip if missing)

> If any file in steps 1–6 is missing: output `BOOT FAILED: <filename> not found.` and stop.

---

## ABSOLUTE RULES

- **Read architecture.md first** — before any file changes. Update it after every create/delete/move.
- **Specs required** — any non-trivial feature needs a spec in `specs/pending/` before code is written.
- **300 line limit** — no file may exceed 300 lines. Refactor if exceeded.
- **Minimal changes** — change only what the task requires.
- **Tests pass** — run `npm test && npm run build` before considering anything done.
- **Confirm before building** — present plan, wait for approval, then build.
- **Just do it** — commands like `review`, `check`, `run tests`, `show`, `explain`, `diff`, `status` are executed immediately with zero questions.

---

## QUICK FIXES

Typos, obvious crashes, one-line config, visual bugs — just fix it. No spec, no phases.

---

## 5-PHASE LOOP — Non-Trivial Tasks Only

> Only enter this loop when given an explicit build/feature/fix task. Never during boot or idle.

### Phase 1 — Interview
Ask the user questions ONE AT A TIME until you understand the task fully. Cover: happy path, edge cases, UX, interactions with existing features. Then write a spec to `specs/pending/{name}.md` with: description, acceptance criteria, edge cases, files affected.

**Stop. Wait for user to confirm the spec before continuing.**

### Phase 2 — Tests First
Write failing unit tests before any implementation. Cover happy path, edge cases, boundaries, zero/negative/max values.

**Stop. No implementation until failing tests exist.**

### Phase 3 — Build
Implement step-by-step per the spec. Stay under 300 lines per file.

**Stop. Ask if user wants to review before continuing.**

### Phase 4 — Verify
Run `npm test && npm run build`. Zero errors required. Fix anything broken before continuing.

### Phase 5 — Wrap-Up
> Ask user for confirmation before starting.

1. Move spec: `specs/pending/` → `specs/done/`
2. Update `docs/architecture.md`
3. Add any new pitfalls to `docs/learned-rules.md`
4. Write a 3-sentence summary of what was built
5. Rebase onto `main`, re-verify, push branch
6. Clean up worktree (see Git section below)

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

## BUILD COMMANDS

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # all 277 tests
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

## TEST FILES (277 total)

| File | Coverage | Tests |
|------|----------|-------|
| `tests/taxEngine.test.js` | Federal/ON tax, OAS clawback, RRIF | 51 |
| `tests/projectionEngine.test.js` | Year-by-year projections | 45 |
| `tests/estateEngine.test.js` | Death tax, probate, intestacy | 32 |
| `tests/withdrawalCalc.test.js` | Sustainable withdrawal | 20 |
| `tests/multiProvinceEngine.test.js` | BC/AB/NS/MB province tax | 47 |
| `tests/goldenFileTests.test.js` | Province regression snapshots | 36 |
| `tests/portfolioChartHelpers.test.js` | Chart helpers | 20 |
| `tests/waterfallChartHelpers.test.js` | Waterfall helpers | 26 |

Test scenarios: `test-scenario.json`, `test-frank-lowIncome.json`, `test-couple-rajesh.json`

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

# Spec: Retirement Readiness Rank Screen

## Description

After completing either the Basic or Full wizard, users see a full-screen "readiness rank" interstitial before landing on the dashboard. Inspired by Wealthsimple's wealth rank, it shows where the user sits relative to other Canadians in their age bracket, using their registered savings (RRSP + TFSA) as the metric. The arc gauge animates in for a moment-of-reveal effect.

## User Flow

```
Basic Wizard (handleBasicComplete)  --+
                                      +--> view: 'readiness-rank' --> view: 'dashboard'
Full Wizard (handleWizardComplete)  --+
```

- New view state: `'readiness-rank'`
- Both `handleWizardComplete` and `handleBasicComplete` in `App.jsx` route to `'readiness-rank'` instead of `'dashboard'`
- Single CTA: "View My Plan ->" sets `view('dashboard')`
- Free for all users, no gating

## Acceptance Criteria

1. Screen appears after both Basic and Full wizard completion
2. Displays "You're in the top X% of Canadians aged Y-Y" headline
3. SVG arc gauge animates from 0 to the user's percentile rank over ~1 second
4. Arc coloured with an orange-to-purple gradient (matching Wealthsimple aesthetic)
5. Age bracket label shown inside/below the gauge
6. Two secondary stat cards: "Your savings" (RRSP + TFSA) and "Canadian median" for their bracket
7. If the user has a DB pension, a subtle note: "Have a pension? Your overall picture is likely stronger than this rank suggests."
8. "View My Plan ->" button navigates to dashboard
9. Works for both single and couple scenarios (uses primary person's age for bracket lookup)
10. Handles edge cases: $0 savings, very high savings (top 1%), age out of bounds

## Percentile Calculation

### Engine: `src/engines/readinessEngine.js`

Pure function: `computeReadinessRank(scenario)` returns `{ percentile, bracket, userSavings, medianSavings, topDecileSavings }`

### Benchmark Data (Stats Canada / Fidelity 2024)

Hardcoded in engine. Source: Statistics Canada Survey of Financial Security, Fidelity Canada retirement benchmarks.

```js
// Age bracket -> { median, p25, p75, p90 } for RRSP+TFSA combined (CAD)
const BRACKETS = [
  { label: 'Under 35',  ages: [18, 34], median: 15_000,  p25: 3_000,   p75: 45_000,  p90: 110_000 },
  { label: '35 to 44',  ages: [35, 44], median: 33_000,  p25: 8_000,   p75: 95_000,  p90: 220_000 },
  { label: '45 to 54',  ages: [45, 54], median: 58_000,  p25: 15_000,  p75: 170_000, p90: 380_000 },
  { label: '55 to 64',  ages: [55, 64], median: 120_000, p25: 30_000,  p75: 320_000, p90: 650_000 },
  { label: '65 and up', ages: [65, 99], median: 140_000, p25: 35_000,  p75: 360_000, p90: 720_000 },
];
```

### Percentile Interpolation

Model distribution as log-normal (right-skewed, typical for wealth data). Given `median` and `p90`, derive mu and sigma. Compute `1 - CDF(userSavings)` to get the user's top-X% rank.

- `userSavings <= 0`: rank = 95 (display "bottom 5%")
- `percentile < 1`: cap display at "top 1%"
- Returned `percentile` is the top-X% number (e.g. 18 means "top 18%")

## Visual Design

Dark background (`#0a0a0a`), large white headline, percentile in gradient text, SVG arc gauge, two dark stat cards, full-width CTA.

```
+------------------------------------------+
|   [logo small]                           |
|                                           |
|   You're in the top                      |
|   18% of Canadians                       |
|   aged 45-54                             |
|                                           |
|         [SVG arc gauge - animated]        |
|              18%                          |
|            Age 45-54                      |
|                                           |
|  [Your savings]    [Cdn. median]          |
|  [$145,000]        [$58,000]              |
|                                           |
|  [pension note if applicable]             |
|                                           |
|        [ View My Plan -> ]               |
+------------------------------------------+
```

## Files Affected

### New Files
- `src/views/readiness/ReadinessView.jsx` -- full-screen view, props: `scenario`, `onContinue`
- `src/engines/readinessEngine.js` -- pure `computeReadinessRank(scenario)`

### Modified Files
- `src/App.jsx` -- add `'readiness-rank'` view, reroute both wizard complete handlers
- `docs/structure.md` -- add new files
- `docs/architecture.md` -- add to key files, add user flow

## Edge Cases

| Scenario | Handling |
|----------|---------|
| `rrspBalance + tfsaBalance === 0` | Bottom bracket message: "You're just getting started" |
| Couple scenario | Use primary `currentAge` for bracket; note shows "combined household savings" if spouse RRSP included |
| DB pension holder (`pensionType === 'db'`) | Show pension disclaimer note |
| Age out of bounds | Clamp to nearest bracket |
| Top 1% savings | Cap display at "top 1%" |

## Tests

`tests/readinessEngine.test.js`:
- Correct bracket selected at boundary ages (34/35, 44/45, 54/55, 64/65)
- $0 savings -> bottom percentile (>= 90)
- Median savings -> approximately top 50%
- p90 savings -> approximately top 10%
- Very high savings -> capped at top 1% display
- Returns correct `medianSavings` and `bracket` for each age bracket
- DB pension flag correctly passed through

## Out of Scope

- Sharing / screenshot / social
- "Improve My Rank" CTA
- Non-registered or net worth percentile
- Persisting rank to DB

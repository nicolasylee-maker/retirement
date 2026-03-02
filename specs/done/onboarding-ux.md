# Spec: Onboarding UX — Wizard-First Experience

## Status
Pending implementation

## The Philosophy
The app IS the onboarding. There is no separate landing page, no hero section, no testimonials. A first-time visitor lands on yourdomain.com and wizard step 1 is already on the screen. They start answering questions immediately. By the time they've finished, they're invested — then we ask them to save.

This is how the best modern tools work (Duolingo, Typeform, Linear). The product IS the first impression.

---

## User Journey (new visitor)

```
yourdomain.com
  → Wizard Step 1 is rendered (full screen, first question visible)
  → They fill in 9 steps (3–10 min)
  → They hit "Finish" → see their retirement dashboard
  → Save nudge appears: "Save your plan — create a free account"
  → They sign in (Google or magic link)
  → Plan syncs to cloud
  → Done. They're a user.
```

No welcome screen. No "Start New Plan" button to click. No friction before value.

---

## User Journey (returning visitor — localStorage data exists)

```
yourdomain.com
  → App detects localStorage data (already works today)
  → Goes directly to Dashboard
  → Header shows "Sign in to save your plan" nudge (if not signed in)
```

This already works. No change needed except removing the current WelcomeScreen for anonymous returning users.

---

## User Journey (returning signed-in user)

```
yourdomain.com
  → Supabase session detected
  → Cloud scenarios load
  → If 1 scenario: go directly to Dashboard
  → If 2+ scenarios: show "Your Plans" picker (inline, not a landing page)
```

---

## The Wizard Step Design (new)

Each step is **full-viewport, one focus**. Not a form with 6 fields. One thing at a time.

### Layout for each step
```
┌──────────────────────────────────────────────┐
│  [AppName]                    Step 3 of 9 →  │  ← minimal header
├──────────────────────────────────────────────┤
│                                              │
│                                              │
│   How old are you?                           │  ← big, clear question
│                                              │
│   [ 58          ]                            │  ← large input, centered
│                                              │
│   (we use this to calculate your CPP         │  ← one line of context
│    and OAS eligibility)                      │
│                                              │
│                                              │
│              [ Continue → ]                  │  ← single CTA
│                                              │
│   ← Back                                     │  ← secondary, small
└──────────────────────────────────────────────┘
```

Key rules:
- One primary question per screen (group tightly related fields, e.g., "Your age + retirement age" together)
- Large type (48px+ for questions, 36px+ for inputs)
- Sensible defaults pre-filled so users can just tap Continue if they don't know
- Helper text is one sentence — no paragraphs
- "I don't know" escape hatch on ambiguous questions (e.g., CPP amount → use average)
- Step transitions: slide left on Continue, slide right on Back (CSS transition, 200ms)
- Progress: "Step 3 of 9" in top-right, not a bar — a bar feels like a progress report. A number feels conversational.

### Mobile-first
- Minimum touch target: 44px
- Inputs take full width on mobile
- Number inputs use `inputMode="numeric"` to show the numeric keyboard on mobile
- "Continue" button is always visible (not below the fold)
- No horizontal overflow on any step

---

## Wizard Progress — localStorage Checkpoint

Wizard progress is saved to localStorage after every step (already partially done via the main STORAGE_KEY). This means:
- If user closes tab on step 5, reopening the app resumes step 5
- The "return to your progress" experience is implicit — no modal, no "welcome back", just: step 5 is there

Checkpoint key: `retirement-planner-wizard-checkpoint` (separate from the full data key to avoid conflicts).

---

## The Save Nudge (post-wizard moment)

After the user clicks "Finish" on step 9, instead of going directly to the dashboard, show a **single interstitial screen** (not a modal, not a toast — a full screen moment):

```
┌──────────────────────────────────────────────┐
│                                              │
│   🎉  Your plan is ready.                    │
│                                              │
│   Save it so you can come back anytime.      │
│   It takes 10 seconds. Completely free.      │
│                                              │
│   [ Continue with Google    ]                │
│                                              │
│   ── or ──                                   │
│                                              │
│   [ your@email.com          ]                │
│   [ Send me a login link    ]                │
│                                              │
│   ───────────────────────────────            │
│   Skip for now → just show me my results     │  ← small, no button styling
│                                              │
└──────────────────────────────────────────────┘
```

Rules:
- This screen appears ONCE per session (if they skip, they go to dashboard; don't show again)
- If they're already signed in: skip this screen entirely, go straight to dashboard
- After sign-in: show dashboard, soft-animate in a "Plan saved!" toast

---

## WelcomeScreen — Replacement

The current `WelcomeScreen.jsx` is replaced. The new landing is just wizard step 1.

**What replaces it:**
- App.jsx initial state: if no data in localStorage AND not signed in → render `view = 'wizard'` at `wizardStep = 0`
- A "My Plans" view for signed-in users with multiple scenarios (not a welcome screen — just a clean list)

**What to do with "Load Saved Plan":**
- Move to the header / AccountMenu as "Import from file..."
- Keep the JSON import functionality but remove it from the primary entry point
- A first-time user doesn't know they have a JSON file to import

---

## "My Plans" View (for signed-in users with multiple scenarios)

Shown when a signed-in user has 2+ scenarios. Clean, not a landing page.

```
┌──────────────────────────────────────────────┐
│  [AppName]            [Account ▾] [+ New]    │
├──────────────────────────────────────────────┤
│                                              │
│  Your Plans                                  │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Conservative Plan          Updated 2d ago│ │
│  │ Net worth at 85: $480,000               │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ Aggressive Plan            Updated 5d ago│ │
│  │ Net worth at 85: $720,000               │ │
│  └─────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

Each plan card is a button that opens the dashboard for that scenario. No other content on this screen.

---

## Header (minimal, always visible)

The header is minimal and consistent across all views after the wizard:
```
[AppName]   [Dashboard] [Debt] [Compare] [Estate]   [Account ▾]
```

- No logo that takes up space
- No tagline
- For anonymous users in the wizard: just `[AppName]` left-aligned + `Step N of 9` right-aligned (no nav tabs)
- After wizard: nav tabs appear

---

## Acceptance Criteria
- [ ] New anonymous visitor lands on yourdomain.com → wizard step 1 is rendered (no welcome screen)
- [ ] Wizard progress autosaves to localStorage after every step
- [ ] Closing and reopening the browser resumes the wizard at the correct step
- [ ] Completing the wizard → save nudge screen (with Google + magic link options)
- [ ] "Skip for now" on save nudge → goes to dashboard (nudge not shown again this session)
- [ ] Signing in via save nudge → dashboard with "Plan saved!" toast
- [ ] Returning anonymous user (localStorage data) → dashboard directly (no welcome screen)
- [ ] Returning signed-in user with 1 scenario → dashboard directly
- [ ] Returning signed-in user with 2+ scenarios → "My Plans" list
- [ ] Each wizard step is full-viewport on desktop AND mobile
- [ ] Number inputs use `inputMode="numeric"` on mobile
- [ ] "Continue" button always visible without scrolling on mobile (375px width)
- [ ] Step transitions: slide animation left on Continue, right on Back
- [ ] Progress shown as "Step N of 9" text (not a progress bar)
- [ ] "Load from file" (JSON import) accessible from AccountMenu / header, not the primary entry

## Edge Cases
- User is mid-wizard and signs in (e.g., from a save nudge mid-flow): wizard state preserved, continue from current step
- User has localStorage data but signs in with an account that has different cloud data: prefer cloud data (with a "Your cloud plan has been loaded" toast)
- User clears localStorage mid-session: app returns to wizard step 1 as if new user
- Wizard step 1 feels abrupt without context for a truly first-time user: consider a 1-second full-screen "splash" before step 1 (just the app name + tagline — no buttons). Evaluate during implementation.

## Files to Create
- `src/views/plans/MyPlansView.jsx` — plan list for multi-scenario signed-in users

## Files to Modify / Replace
- `src/views/WelcomeScreen.jsx` — gut and replace with a stub that redirects to wizard or MyPlansView
- `src/App.jsx` — change initial `view` state logic: start at `'wizard'` for new users; remove `'welcome'` as a meaningful state
- `src/views/wizard/WizardShell.jsx` — add post-wizard save nudge screen; full-viewport step layout; step slide transitions; localStorage checkpoint per step
- Each wizard step component — apply full-viewport layout, large type, single-focus design, `inputMode="numeric"` on number fields

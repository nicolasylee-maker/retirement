# Spec: AI Model Testing Admin Tab

## Status: pending

## Description
An admin-only tab in the Admin panel that lets the admin A/B test AI insight quality by comparing Gemini (production model) against a rival provider (OpenAI, Anthropic, OpenRouter, xAI, Kimi) side-by-side, for any of the 5 insight types (Dashboard, Debt, Estate, Compare, Optimize).

API calls go through a new passthrough edge function (`ai-test-proxy`). The rival API key is entered per-session, never stored.

## Acceptance Criteria

1. "AI Testing" nav item appears in Admin sidebar.
2. Admin can search for a user by email and select them.
3. Scenarios for the selected user load into a dropdown.
4. All 5 insight types are selectable (Dashboard, Debt, Estate, Compare, Optimize).
5. Compare type shows a second scenario picker.
6. Admin selects a rival provider and enters their API key (hidden input).
7. "Fetch Models" loads available models from the provider's /models endpoint into a datalist.
8. Model field is a free-text input with datalist suggestions (not a locked select).
9. "Run Test" fires both Gemini and rival calls in parallel.
10. Column 1 shows Gemini result (with model name in header).
11. Column 2 shows rival result (with provider + model in header).
12. Column 3 shows the fully resolved prompt (base + body with all variables substituted) with a Copy button.
13. Each column scrolls independently (`overflow-y-auto max-h-[70vh]`).
14. Loading spinners shown in columns 1 and 2 while requests are in flight.
15. Errors in column 2 don't prevent column 1 from displaying (independent settle).
16. API key is NOT persisted (no localStorage, no sessionStorage, no cookie).
17. API key field is hidden (type="password") and empty on mount.
18. Gemini uses the server's `GEMINI_API_KEY` — caller sends `null` for apiKey.
19. `npm test && npm run build` passes with zero errors.

## Edge Cases

- **No scenarios for user**: Picker shows disabled state, "No scenarios found" text, Run disabled.
- **Compare type with <2 scenarios**: Run button disabled with tooltip "Need 2 scenarios to compare".
- **Model fetch fails**: Inline error shown below the fetch button; text input remains functional.
- **Rival API call fails**: Error message shown in column 2, column 1 still shows Gemini result.
- **Wrong API key**: Edge function passes through the 4xx error from provider; shown as error in col 2.
- **Admin closes panel and reopens**: API key field is empty.
- **Optimize type**: Runs `runOptimization(scenario)` client-side before building prompt — may take ~200ms.
- **Estate type**: `ageAtDeath` defaults to `scenario.lifeExpectancy` in the AI context builder.

## Files Affected

### New
- `specs/pending/ai-model-testing.md` (this file)
- `supabase/functions/ai-test-proxy/index.ts` — admin passthrough edge function
- `src/utils/buildAiPrompt.js` — client-side prompt resolver (port of gemini-proxy buildPrompt)
- `src/views/admin/sections/AiTestingSection.jsx` — orchestrator with all state
- `src/views/admin/components/AiTestConfigPanel.jsx` — config UI panel
- `src/views/admin/components/AiTestResultPanel.jsx` — 3-column result display

### Modified
- `src/views/admin/AdminView.jsx` — add AI Testing nav item
- `src/services/adminService.js` — add `testAi` and `fetchAiModels` methods
- `docs/architecture.md` — version history entry
- `docs/structure.md` — add new files to project tree

## Providers Supported

| Provider   | Run endpoint                                          | Models endpoint                         | Auth |
|------------|-------------------------------------------------------|-----------------------------------------|------|
| gemini     | Gemini generateContent API (server GEMINI_API_KEY)   | Static list from admin_config           | Server key |
| openai     | POST https://api.openai.com/v1/chat/completions       | GET https://api.openai.com/v1/models    | Bearer |
| anthropic  | POST https://api.anthropic.com/v1/messages            | GET https://api.anthropic.com/v1/models | x-api-key |
| openrouter | POST https://openrouter.ai/api/v1/chat/completions    | GET https://openrouter.ai/api/v1/models | Bearer |
| xai        | POST https://api.x.ai/v1/chat/completions             | GET https://api.x.ai/v1/models          | Bearer |
| kimi       | POST https://api.moonshot.cn/v1/chat/completions      | GET https://api.moonshot.cn/v1/models   | Bearer |

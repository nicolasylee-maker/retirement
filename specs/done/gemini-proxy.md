# Spec: Gemini API Proxy (App-Managed Key + Usage Quota)

## Status
Pending implementation

## Overview
Move the Gemini API key from user-provided (localStorage) to app-managed (Supabase Edge Function). AI insights become a paid feature. Paid users get 30 generations per calendar month. Free and anonymous users see an upsell prompt. The server-side proxy ensures the API key never reaches the client.

## Current State
- `src/services/geminiService.js` calls Gemini API directly from the browser
- API key stored in `localStorage` (user provides their own)
- `src/components/AiInsight.jsx` calls `geminiService` and shows a "set up your API key" prompt if missing

## Target State
- All Gemini API calls go through a Supabase Edge Function (`/functions/gemini-proxy`)
- Edge Function holds the API key as a secret (never exposed to client)
- Edge Function enforces per-user monthly quota (max 30)
- Client code removes all localStorage key logic
- Free/anonymous users: blocked before reaching the Edge Function (feature-gating spec handles this)

---

## Supabase Edge Function: `supabase/functions/gemini-proxy/index.ts`

### Request
```
POST /functions/v1/gemini-proxy
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json

{ "prompt": "...", "context": { ... } }
```

### Response (success)
```json
{ "text": "AI insight text..." }
```

### Response (quota exceeded)
```json
{ "error": "quota_exceeded", "used": 30, "limit": 30, "resetAt": "2026-04-01" }
```
HTTP 429

### Response (not a paid user)
```json
{ "error": "subscription_required" }
```
HTTP 403

### Logic
1. Verify Supabase JWT — extract `user_id`. Reject if missing/invalid (401).
2. Look up subscription for `user_id`. Reject if not `active` or `trialing` (403).
3. Get current month period (`YYYY-MM`). Query `ai_usage` for this user + period.
4. If `count >= 30`: return 429 with quota info.
5. Atomically increment `ai_usage.count` (upsert with `count = count + 1`).
6. Call Gemini API with the prompt from the request body.
7. Return the Gemini response text to the client.

### Environment variables (Edge Function secrets)
```
GEMINI_API_KEY=AIza...
SUPABASE_SERVICE_ROLE_KEY=...   # for writing ai_usage (bypasses RLS)
SUPABASE_URL=...
```

### Atomic increment SQL
```sql
insert into public.ai_usage (user_id, period, count)
values ($1, $2, 1)
on conflict (user_id, period)
do update set count = ai_usage.count + 1, updated_at = now()
returning count;
```
Run this before calling Gemini. If the returned count exceeds 30, reject (and decrement, or accept that one over-count — keep it simple: check before incrementing).

**Correct order:**
1. Read current count (select)
2. If count >= 30: reject (don't increment)
3. Increment (update count = count + 1)
4. Call Gemini
5. Return response

---

## Client Changes: `src/services/geminiService.js`

**Remove:**
- All localStorage API key reading/writing
- Direct `fetch` to `generativelanguage.googleapis.com`
- API key validation logic

**Replace with:**
```javascript
export async function getGeminiInsight(prompt, context) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, context }),
  })

  if (response.status === 429) {
    const body = await response.json()
    throw new QuotaExceededError(body.used, body.limit, body.resetAt)
  }
  if (response.status === 403) throw new Error('subscription_required')
  if (!response.ok) throw new Error('AI service error')

  const { text } = await response.json()
  return text
}

export class QuotaExceededError extends Error {
  constructor(used, limit, resetAt) {
    super('Monthly AI quota reached')
    this.used = used
    this.limit = limit
    this.resetAt = resetAt
  }
}
```

---

## `src/components/AiInsight.jsx` Changes

**Remove:**
- "Enter your Gemini API key" setup prompt
- localStorage key input/storage

**Add:**
- Handle `QuotaExceededError`: show "You've used all 30 AI insights this month. Resets [date]." (not an upsell)
- Handle `subscription_required`: this shouldn't happen (feature-gating blocks the component for free users) — log a warning and show nothing
- Show usage indicator (optional): "22 of 30 AI insights used this month" — read from `ai_usage` table via Supabase client

### Usage indicator (optional enhancement)
```javascript
// In AiInsight.jsx (if implementing usage counter)
const { data: usage } = await supabase
  .from('ai_usage')
  .select('count')
  .eq('user_id', user.id)
  .eq('period', currentPeriod)
  .maybeSingle()

// Show: "22 of 30 AI insights used this month"
```

---

## Acceptance Criteria
- [ ] Gemini API key no longer lives in localStorage or client code
- [ ] Anonymous users: AI insight shows UpgradePrompt (handled by feature-gating spec)
- [ ] Free signed-in users: AI insight shows UpgradePrompt (handled by feature-gating spec)
- [ ] Paid users: AI insight calls Edge Function and returns insight text
- [ ] After 30th generation in a month: Edge Function returns 429, AiInsight shows quota message
- [ ] 31st attempt is rejected (not processed by Gemini)
- [ ] Quota resets on the 1st of each month (new `YYYY-MM` period)
- [ ] `ai_usage` row is written by Edge Function (service role), not client
- [ ] Invalid/missing JWT is rejected with 401
- [ ] Non-paid user JWT is rejected with 403

## Edge Cases
- Two simultaneous AI requests from same user: both may increment, slightly over-count is acceptable (simpler than a distributed lock)
- Gemini API returns an error: return a 502 to client, do not increment usage count
- User's subscription expires mid-month: next AI request returns 403 (subscription check happens each time)
- New month starts: `YYYY-MM` period changes, count resets naturally (new row, starts at 0)
- User with no `ai_usage` row for this period: upsert creates it with count = 1

## Files to Create
- `supabase/functions/gemini-proxy/index.ts`

## Files to Modify
- `src/services/geminiService.js` — remove direct API call, add proxy call + error classes
- `src/components/AiInsight.jsx` — remove API key setup UI, add quota messaging

## Supabase CLI Setup
```bash
supabase functions new gemini-proxy
supabase secrets set GEMINI_API_KEY=AIza...
supabase functions deploy gemini-proxy
```

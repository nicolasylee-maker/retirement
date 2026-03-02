# Spec: Database Schema (Supabase / Postgres)

## Status
Pending implementation

## Overview
Define the Supabase (Postgres) database schema for user accounts, scenarios, and subscription state. All data stored in **Canada Central (ca-central-1)** region for PIPEDA compliance.

## Supabase Project Setup
- Region: **Canada (Central)** — `ca-central-1`
- Plan: Free tier sufficient to start; upgrade to Pro when needed
- Enable: Auth (Google provider), Database, Edge Functions

---

## Tables

### `public.users`
Mirrors Supabase Auth users with app-specific profile data.

```sql
create table public.users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  display_name          text,
  avatar_url            text,
  subscription_override text,              -- null | 'beta' | 'lifetime'
  stripe_customer_id    text,              -- set by create-checkout-session Edge Function
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index users_stripe_customer_id_idx on public.users(stripe_customer_id);
```

- `id` matches `auth.users.id` exactly (Supabase Auth manages the auth record)
- Created/updated via trigger on `auth.users` insert (both Google and magic link)
- Auth methods supported: Google OAuth + magic link (passwordless email)
- `subscription_override`: set manually (via Supabase Studio) or by the admin-invites Edge Function. When non-null, grants full paid access regardless of Stripe subscription status. Values: `'beta'` or `'lifetime'`.
- `stripe_customer_id`: set by `create-checkout-session` Edge Function when user starts a Stripe checkout. Indexed for webhook lookups.

---

### `public.scenarios`
Each user's retirement planning scenarios.

```sql
create table public.scenarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null default 'My Retirement Plan',
  data        jsonb not null,             -- full scenario object (matches defaults.js shape)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index scenarios_user_id_idx on public.scenarios(user_id);
```

- `data` stores the full scenario JSON (same shape as current in-memory scenario object)
- `name` is denormalized for display in scenario list without parsing `data`
- One row per scenario — no version history (keep it simple)
- Free tier limit: enforced at application layer (check count before insert)

---

### `public.subscriptions`
Subscription state synced from Stripe webhooks.

```sql
create table public.subscriptions (
  id                   text primary key,   -- Stripe subscription ID (sub_xxx)
  user_id              uuid not null references public.users(id) on delete cascade,
  stripe_customer_id   text not null,      -- cus_xxx
  status               text not null,      -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  price_id             text not null,      -- Stripe price ID (monthly or annual)
  current_period_start timestamptz,
  current_period_end   timestamptz,
  trial_end            timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);
```

- Written exclusively by Stripe webhook handler (Edge Function) — never by client
- Client reads via RLS-protected query to determine feature access
- `status` is the source of truth for feature gating:
  - `trialing` → full paid access (within trial period)
  - `active` → full paid access
  - `past_due` → show payment failure warning, maintain access briefly
  - `canceled` → revoke paid features
  - `incomplete` → payment setup failed, no paid access

---

### `public.ai_usage`
Track per-user monthly AI generation counts.

```sql
create table public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  period      text not null,              -- 'YYYY-MM' (billing month)
  count       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, period)
);

create index ai_usage_user_period_idx on public.ai_usage(user_id, period);
```

- `period` = `'YYYY-MM'` derived from current UTC date (e.g., `'2026-03'`)
- Incremented atomically via Edge Function (Gemini proxy) before proxying the request
- Quota: 30 generations per period for paid users
- Free users: 0 (never incremented — blocked before reaching the Edge Function)
- Check: `count >= 30` → reject with `429` status and quota-exceeded message

---

## Row-Level Security (RLS)

**Enable RLS on all tables:**

```sql
alter table public.users enable row level security;
alter table public.scenarios enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_usage enable row level security;
```

### `users` policies
```sql
-- Users can read and update their own record
create policy "Users: read own" on public.users
  for select using (auth.uid() = id);

create policy "Users: update own" on public.users
  for update using (auth.uid() = id);
```

### `scenarios` policies
```sql
-- Users can CRUD their own scenarios only
create policy "Scenarios: read own" on public.scenarios
  for select using (auth.uid() = user_id);

create policy "Scenarios: insert own" on public.scenarios
  for insert with check (auth.uid() = user_id);

create policy "Scenarios: update own" on public.scenarios
  for update using (auth.uid() = user_id);

create policy "Scenarios: delete own" on public.scenarios
  for delete using (auth.uid() = user_id);
```

### `subscriptions` policies
```sql
-- Users can only read their own subscription
create policy "Subscriptions: read own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- No client insert/update/delete — written by webhook Edge Function (service role)
```

### `ai_usage` policies
```sql
-- Users can only read their own usage
create policy "AI usage: read own" on public.ai_usage
  for select using (auth.uid() = user_id);

-- No client insert/update — written by Edge Function (service role)
```

---

## Helper Function: User Upsert on Auth

Trigger to create a `public.users` record when a new `auth.users` record is created:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url, subscription_override)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'subscription_override'   -- set by admin invite, null for regular signups
  )
  on conflict (id) do update set
    email        = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    avatar_url   = coalesce(excluded.avatar_url, public.users.avatar_url),
    updated_at   = now();
    -- NOTE: subscription_override is NOT updated on conflict — only set on first insert.
    --       To change it, update the row directly (via Supabase Studio or admin Edge Function).
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## Acceptance Criteria
- [ ] All 4 tables created in Supabase project (Canada Central region)
- [ ] `users` table has `subscription_override` column (null | 'beta' | 'lifetime')
- [ ] `users` table has `stripe_customer_id` column (indexed)
- [ ] RLS enabled and policies applied to all tables
- [ ] New Google sign-in creates a `public.users` record (trigger, `subscription_override` = null)
- [ ] New magic link sign-in creates a `public.users` record (same trigger)
- [ ] Admin-invited user's `subscription_override` is written to `users` row on first sign-in (from metadata)
- [ ] `subscription_override` is NOT overwritten on subsequent sign-ins (upsert preserves it)
- [ ] A user can only read/write their own scenarios (RLS enforced)
- [ ] Subscription table is read-only from the client (no client-side insert policy)
- [ ] `ai_usage` is read-only from the client (no client-side insert policy)
- [ ] Indexes exist on all foreign key and lookup columns

## Files to Create
- `supabase/migrations/001_initial_schema.sql` — all table DDL
- `supabase/migrations/002_rls_policies.sql` — all RLS policies and trigger

## Notes
- Never use the Supabase service role key in frontend code
- Migration files should be idempotent (`create if not exists`, `on conflict`)
- Test RLS locally with `supabase db reset` and `supabase start`

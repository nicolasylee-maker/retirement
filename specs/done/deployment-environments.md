# Spec: Deployment Environments (Local + Remote-Dev + Prod)

## Status
Pending implementation

## Overview (Why this exists)
You asked for **1-click switching** + **always-know-which-server-I'm-on** + super simple instructions.

This spec gives you:
- 3 environments (Local, Remote-Dev, Production)
- One big colored badge in the top-right corner that says **LOCAL** (red) / **DEV** (orange) / **PROD** (green)
- 3 simple npm commands you can run with one click
- No guessing ever again

When you open the real website (yourdomain.com) → it is always **PROD**.  
When you run on your computer → you choose which backend it talks to.

## Environment Table (Super Clear)

| Name          | Supabase Backend          | Frontend Where It Runs          | Who Uses It          | Real Google Sign-in? |
|---------------|---------------------------|---------------------------------|----------------------|----------------------|
| **LOCAL**     | Your laptop (supabase start) | npm run dev:local              | You (daily coding)   | Yes (test Google)   |
| **REMOTE DEV**| Cloud “retirement-dev” project | npm run dev:dev                | You + friends testing| Yes (real)          |
| **PRODUCTION**| Cloud main project        | vercel.com (main branch)       | Real users           | Yes (real)          |

## Visual Indicator (The “I’m Not Smart” Feature)
New component: `src/components/EnvironmentBadge.jsx`

- Tiny colored pill in the **top-right header** (always visible)
- LOCAL → red background “LOCAL”
- REMOTE DEV → orange “DEV”
- PRODUCTION → green “PROD”
- Clicking it opens a small modal with:
  - Exact Supabase URL it is connected to
  - “You are safe — no real users can see this”

## 1-Click Commands (This is what you will use every day)

Open your terminal in the project folder and run **one** of these:

```bash
# 1. Fastest – everything on your laptop (recommended for daily work)
npm run dev:local

# 2. Test with real cloud (good for final checks before live)
npm run dev:dev

# 3. See exactly what real users see (rarely needed)
npm run dev:prod
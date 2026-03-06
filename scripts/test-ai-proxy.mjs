/**
 * Smoke test for ai-proxy edge function.
 * Reads from .env.local. Run after deploying ai-proxy and setting provider+key in admin UI.
 *
 * Usage: node scripts/test-ai-proxy.mjs
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const env = {}
try {
  readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  })
} catch {
  console.error('Could not read .env.local')
  process.exit(1)
}

const SUPABASE_URL = env['VITE_SUPABASE_URL']
const ANON_KEY = env['VITE_SUPABASE_ANON_KEY']
const SERVICE_ROLE = env['SUPABASE_SERVICE_ROLE_KEY']
const ADMIN_EMAIL = env['VITE_ADMIN_EMAIL']

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE || !ADMIN_EMAIL) {
  console.error('Missing required env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_ADMIN_EMAIL')
  process.exit(1)
}

// Get admin session token via magic link
async function getAdminToken() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ADMIN_EMAIL })
  if (linkErr) throw new Error(`generateLink failed: ${linkErr.message}`)
  const { data: sessionData, error: sessionErr } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })
  if (sessionErr) throw new Error(`verifyOtp failed: ${sessionErr.message}`)
  return sessionData.session.access_token
}

// Minimal context payloads per type
const TEST_CASES = [
  {
    type: 'dashboard',
    context: {
      currentAge: 45, retirementAge: 65, lifeExpectancy: 90, inflationRatePct: 2,
      monthlyExpenses: 5000, portfolioAtRetirement: 800000, sustainableMonthly: 3200,
      portfolioAtEnd: 150000, annualTax: 12000, pensionIncome: 0,
    },
  },
  {
    type: 'compare',
    context: {
      scenarios: [
        { name: 'Base', netWorthAtRetirement: 800000, sustainableMonthly: 3200, annualTax: 12000, portfolioAtEnd: 150000, lifeExpectancy: 90 },
        { name: 'Retire at 60', netWorthAtRetirement: 600000, sustainableMonthly: 2800, annualTax: 10000, portfolioAtEnd: 0, lifeExpectancy: 90 },
      ],
      diffs: [{ label: 'Retirement Age', fmtA: '65', fmtB: '60' }],
      phaseSummaries: [[], []],
      monthlySnapshots: [],
      inflationRatePct: 2,
    },
  },
  {
    type: 'estate',
    context: {
      ageAtDeath: 90, inflationRatePct: 2, yearsToDeath: 45, grossEstate: 1200000,
      grossEstateToday: 600000, totalTax: 80000, netToHeirs: 1120000, netToHeirsToday: 560000,
      hasWill: true, primaryBeneficiary: 'Children', rrspBalance: 200000, spouseRollover: false,
    },
  },
  {
    type: 'debt',
    context: {
      totalDebt: 50000, totalInterest: 12000, consumerDebt: 20000, consumerRate: 0.19,
      mortgageBalance: 30000, mortgageRate: 0.05, currentAge: 45, retirementAge: 65,
      debtFreeAge: 52, monthlyPayments: 1500,
    },
  },
  {
    type: 'optimize',
    context: {
      currentAge: 45, lifeExpectancy: 90, monthlyExpenses: 5000, planDepletes: false,
      depletionAge: null, recommendations: [
        { title: 'Max TFSA contributions', monthlyImpact: 120 },
        { title: 'Delay CPP to 70', monthlyImpact: 280 },
      ],
      alreadyOptimal: ['OAS timing', 'RRSP contributions'],
      recommendationCount: 2, totalMonthlyGain: 400,
    },
  },
]

async function runTest(token, { type, context }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, context }),
  })
  const body = await res.json()
  const ok = res.ok && typeof body.text === 'string' && body.text.length > 0 && !body.error
  const fallback = res.headers.get('x-ai-fallback') === 'true'
  return { ok, status: res.status, text: body.text?.slice(0, 120) ?? '', error: body.error, fallback }
}

async function main() {
  console.log('Getting admin token...')
  const token = await getAdminToken()
  console.log('Token obtained. Running tests...\n')

  let passed = 0
  let failed = 0

  for (const tc of TEST_CASES) {
    process.stdout.write(`  [${tc.type}] `)
    try {
      const result = await runTest(token, tc)
      if (result.ok) {
        passed++
        console.log(`PASS${result.fallback ? ' (fallback)' : ''} — "${result.text}..."`)
      } else {
        failed++
        console.log(`FAIL (${result.status}) — ${result.error}`)
      }
    } catch (e) {
      failed++
      console.log(`ERROR — ${e.message}`)
    }
  }

  console.log(`\n${passed}/${TEST_CASES.length} passed`)
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const VALID_PROVINCES = ['federal', 'ON', 'BC', 'AB', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE']

// Hardcoded: the 18 CanLII acts tracked for amendment changes.
// The canlii-state.json file is not accessible at Deno runtime — /DATA is FUSE.
const ACTS = [
  { province: 'ON', type: 'probate',   act: 'Estate Administration Tax Act, 1998',             url: 'https://www.canlii.org/en/on/laws/stat/so-1998-c-34-sched/latest/',       lastKnownAmendment: '2021' },
  { province: 'ON', type: 'intestacy', act: 'Succession Law Reform Act',                        url: 'https://www.canlii.org/en/on/laws/stat/rso-1990-c-s26/latest/',           lastKnownAmendment: '2021' },
  { province: 'BC', type: 'probate',   act: 'Probate Fee Act',                                  url: 'https://www.canlii.org/en/bc/laws/stat/sbc-1999-c-4/latest/',             lastKnownAmendment: '1999' },
  { province: 'BC', type: 'intestacy', act: 'Wills, Estates and Succession Act',                url: 'https://www.canlii.org/en/bc/laws/stat/sbc-2009-c-13/latest/',            lastKnownAmendment: '2023' },
  { province: 'AB', type: 'probate',   act: "Surrogate Rules (Court of King's Bench)",          url: 'https://www.canlii.org/en/ab/laws/regu/alta-reg-130-1995/latest/',         lastKnownAmendment: '2024' },
  { province: 'AB', type: 'intestacy', act: 'Wills and Succession Act',                         url: 'https://www.canlii.org/en/ab/laws/stat/sa-2010-c-w-12.2/latest/',         lastKnownAmendment: '2022' },
  { province: 'SK', type: 'probate',   act: 'Probate Court Act, 1998',                          url: 'https://www.canlii.org/en/sk/laws/stat/ss-1998-c-p-32.21/latest/',        lastKnownAmendment: '2022' },
  { province: 'SK', type: 'intestacy', act: 'Intestate Succession Act, 1996',                   url: 'https://www.canlii.org/en/sk/laws/stat/ss-1996-c-i-13.1/latest/',         lastKnownAmendment: '2019' },
  { province: 'MB', type: 'probate',   act: "Court of King's Bench Surrogate Practice Act",     url: 'https://www.canlii.org/en/mb/laws/stat/ccsm-c-c290/latest/',              lastKnownAmendment: '2020' },
  { province: 'MB', type: 'intestacy', act: 'Intestate Succession Act',                         url: 'https://www.canlii.org/en/mb/laws/stat/ccsm-c-i85/latest/',               lastKnownAmendment: '2014' },
  { province: 'NB', type: 'probate',   act: 'Probate Court Act',                                url: 'https://www.canlii.org/en/nb/laws/stat/snb-1982-c-p-17.1/latest/',        lastKnownAmendment: '2023' },
  { province: 'NB', type: 'intestacy', act: 'Devolution of Estates Act',                        url: 'https://www.canlii.org/en/nb/laws/stat/rsnb-2011-c-115/latest/',          lastKnownAmendment: '2011' },
  { province: 'NS', type: 'probate',   act: 'Probate Act',                                      url: 'https://www.canlii.org/en/ns/laws/stat/rsns-1989-c-359/latest/',          lastKnownAmendment: '2020' },
  { province: 'NS', type: 'intestacy', act: 'Intestate Succession Act',                         url: 'https://www.canlii.org/en/ns/laws/stat/rsns-1989-c-236/latest/',          lastKnownAmendment: '2010' },
  { province: 'NL', type: 'probate',   act: 'Judicature Act (probate fees in Rules)',            url: 'https://www.canlii.org/en/nl/laws/stat/rsnl-1990-c-j-4/latest/',          lastKnownAmendment: '2023' },
  { province: 'NL', type: 'intestacy', act: 'Intestate Succession Act, 1981',                   url: 'https://www.canlii.org/en/nl/laws/stat/rsnl-1990-c-i-21/latest/',         lastKnownAmendment: '1990' },
  { province: 'PE', type: 'probate',   act: 'Probate Act',                                      url: 'https://www.canlii.org/en/pe/laws/stat/rspei-1988-c-p-21/latest/',        lastKnownAmendment: '2022' },
  { province: 'PE', type: 'intestacy', act: 'Intestate Succession Act',                         url: 'https://www.canlii.org/en/pe/laws/stat/rspei-1988-c-i-5/latest/',         lastKnownAmendment: '2022' },
]

async function fetchAmendmentYear(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; retirement-planner-admin/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const html = await res.text()
  // CanLII pages show amendment info in patterns like:
  //   "amended to 2024-01-01", "S.O. 2023", "last amended 2022", "2024, c 5"
  // Extract the most recent 4-digit year >= 2000 from the first 8KB of HTML
  const snippet = html.slice(0, 8000)
  const matches = snippet.match(/20\d{2}/g)
  if (!matches) return null
  // Most recent year found (largest value)
  return matches.reduce((max, y) => (y > max ? y : max), '2000')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Missing authorization header', 401)

    const supabaseUrl     = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const adminEmail      = Deno.env.get('ADMIN_EMAIL')
    const anonKey         = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) return errorResponse('Invalid token', 401)
    if (!adminEmail || caller.email !== adminEmail) return errorResponse('Forbidden', 403)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()

    // ---------- UPSERT-TAX ----------
    if (body.action === 'upsert-tax') {
      const { province, taxYear, data } = body
      if (!VALID_PROVINCES.includes(province)) return errorResponse('Invalid province', 400)
      if (!taxYear || typeof taxYear !== 'number') return errorResponse('taxYear must be a number', 400)
      if (!data || typeof data !== 'object') return errorResponse('data must be an object', 400)

      const { error } = await supabaseAdmin
        .from('tax_data')
        .upsert({ province, tax_year: taxYear, data, updated_at: new Date().toISOString() }, { onConflict: 'province,tax_year' })

      if (error) return errorResponse(error.message, 500)
      return jsonResponse({ success: true })
    }

    // ---------- SEED-ALL ----------
    if (body.action === 'seed-all') {
      const payload = body.payload as Record<string, unknown>
      if (!payload || typeof payload !== 'object') return errorResponse('payload required', 400)

      const currentYear = new Date().getFullYear()
      const rows = Object.entries(payload)
        .filter(([province]) => VALID_PROVINCES.includes(province))
        .map(([province, data]) => ({
          province,
          tax_year: currentYear,
          data,
          updated_at: new Date().toISOString(),
        }))

      const { error } = await supabaseAdmin
        .from('tax_data')
        .upsert(rows, { onConflict: 'province,tax_year' })

      if (error) return errorResponse(error.message, 500)
      return jsonResponse({ success: true, seeded: rows.map(r => r.province) })
    }

    // ---------- CHECK-LEGISLATION ----------
    if (body.action === 'check-legislation') {
      const fetchResults = await Promise.allSettled(
        ACTS.map(async (act) => {
          try {
            const foundYear = await fetchAmendmentYear(act.url)
            const changed = foundYear !== null && foundYear > act.lastKnownAmendment
            return {
              province: act.province,
              type: act.type,
              act: act.act,
              url: act.url,
              lastKnownAmendment: act.lastKnownAmendment,
              foundYear,
              changed,
              error: null,
            }
          } catch (e) {
            return {
              province: act.province,
              type: act.type,
              act: act.act,
              url: act.url,
              lastKnownAmendment: act.lastKnownAmendment,
              foundYear: null,
              changed: false,
              error: e instanceof Error ? e.message : 'Fetch failed',
            }
          }
        })
      )

      const results = fetchResults.map(r => r.status === 'fulfilled' ? r.value : { error: 'Promise rejected' })
      const changedCount = results.filter(r => r.changed).length
      const errorCount = results.filter(r => r.error).length
      const summary = `${results.length} acts checked — ${changedCount} changed, ${errorCount} errors`

      const { data: row, error } = await supabaseAdmin
        .from('legislation_checks')
        .insert({ results, summary })
        .select()
        .single()

      if (error) return errorResponse(error.message, 500)
      return jsonResponse(row)
    }

    return errorResponse('Unknown action', 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})

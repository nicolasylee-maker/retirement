import { supabase } from './supabaseClient'

export async function fetchScenarios(userId) {
  const { data, error } = await supabase
    .from('scenarios')
    .select('id, name, data, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({ ...row.data, id: row.id, name: row.name }))
}

export async function saveScenario(userId, scenario) {
  const { error } = await supabase
    .from('scenarios')
    .upsert({
      id: scenario.id,
      user_id: userId,
      name: scenario.name,
      data: scenario,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteScenario(userId, scenarioId) {
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getScenarioCount(userId) {
  const { count, error } = await supabase
    .from('scenarios')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count
}

/**
 * Idempotent default-scenario insert: only inserts if the user has zero scenarios.
 * This closes the race window where concurrent handleSignIn calls could each
 * see an empty cloud and both insert a default row.
 *
 * Note: the SELECT + INSERT is not truly atomic at the DB level — two concurrent
 * SELECTs could both see 0. This is acceptable because the syncInProgress guard
 * and TOKEN_REFRESHED filter make concurrent client calls practically impossible.
 * A DB-level guard (unique partial index or PL/pgSQL function) would be needed
 * if a second client entry point is ever added.
 */
export async function ensureDefaultScenario(userId, scenario) {
  const count = await getScenarioCount(userId)
  if (count > 0) return
  await saveScenario(userId, scenario)
}

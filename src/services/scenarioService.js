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

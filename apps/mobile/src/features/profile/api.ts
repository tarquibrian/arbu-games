import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type MyStats = {
  username: string
  createdAt: string
  coins: number
  mapped: number
  validated: number
  redemptions: number
  co2Kg: number
  points: number
  level: number
  levelFloor: number
  nextLevelAt: number
}

// Factor de captura de CO2 provisional por árbol/año — placeholder hasta tener
// modelo real (depende de especie/DAP, ver 13.4). Solo para el tile de impacto.
const CO2_PER_TREE_KG = 21

// Puntos de la capa hábito (13.6): mapear y verificar suman progreso. Perilla simple,
// no la recompensa en monedas (esa la fija el trigger 1+3).
const P_MAP = 10
const P_VERIFY = 15
const LEVEL_SIZE = 100 // puntos por nivel

export async function getMyStats(): Promise<MyStats> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  const [{ data: profile, error: pErr }, { count: redemptions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username,created_at,coins,total_trees_mapped,total_trees_validated')
      .eq('id', user.id)
      .single(),
    supabase
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true }),
  ])
  if (pErr) throw pErr
  const p = profile as Pick<ProfileRow, 'username' | 'created_at' | 'coins' | 'total_trees_mapped' | 'total_trees_validated'>

  const mapped = p.total_trees_mapped
  const validated = p.total_trees_validated
  const points = mapped * P_MAP + validated * P_VERIFY
  const level = Math.floor(points / LEVEL_SIZE) + 1

  return {
    username: p.username,
    createdAt: p.created_at,
    coins: p.coins,
    mapped,
    validated,
    redemptions: redemptions ?? 0,
    co2Kg: mapped * CO2_PER_TREE_KG,
    points,
    level,
    levelFloor: (level - 1) * LEVEL_SIZE,
    nextLevelAt: level * LEVEL_SIZE,
  }
}

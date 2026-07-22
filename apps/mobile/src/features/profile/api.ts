import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type MyStats = {
  username: string
  createdAt: string
  coins: number
  mapped: number
  /** Verificaciones que HIZO el usuario (filas propias en tree_validations). */
  verifications: number
  /** Árboles propios que llegaron a validarse (contador de profiles). */
  myTreesValidated: number
  redemptions: number
  co2Kg: number
  points: number
  level: number
  levelFloor: number
  nextLevelAt: number
  /** Puesto histórico; null si todavía no sumó puntos. */
  place: number | null
}

// Factor de captura de CO2 provisional por árbol/año — placeholder hasta tener
// modelo real (depende de especie/DAP, ver 13.4). Solo para el tile de impacto.
// Exportado: también lo usa el stat de impacto agregado en Explorar Árboles.
export const CO2_PER_TREE_KG = 21

const LEVEL_SIZE = 100 // puntos por nivel

export async function getMyStats(): Promise<MyStats> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  // Los puntos NO se recalculan acá: salen del mismo RPC que arma el ranking
  // (perilla app_config.points_rate). Duplicar la fórmula en el cliente es cómo
  // el perfil y la tabla de posiciones terminan mostrando números distintos.
  const [{ data: profile, error: pErr }, { count: redemptions }, { data: pos, error: posErr }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('username,created_at,coins,total_trees_mapped,total_trees_validated')
        .eq('id', user.id)
        .single(),
      supabase
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase.rpc('leaderboard_me', { p_period: 'all' }),
    ])
  if (pErr) throw pErr
  if (posErr) throw posErr

  const p = profile as Pick<ProfileRow, 'username' | 'created_at' | 'coins' | 'total_trees_mapped' | 'total_trees_validated'>
  const me = (Array.isArray(pos) ? pos[0] : pos) as
    | { trees_mapped: number; validations_done: number; points: number; place: number | null }
    | undefined

  const mapped = me?.trees_mapped ?? p.total_trees_mapped
  const points = me?.points ?? 0
  const level = Math.floor(points / LEVEL_SIZE) + 1

  return {
    username: p.username,
    createdAt: p.created_at,
    coins: p.coins,
    mapped,
    verifications: me?.validations_done ?? 0,
    myTreesValidated: p.total_trees_validated,
    redemptions: redemptions ?? 0,
    co2Kg: mapped * CO2_PER_TREE_KG,
    points,
    level,
    levelFloor: (level - 1) * LEVEL_SIZE,
    nextLevelAt: level * LEVEL_SIZE,
    place: me?.place ?? null,
  }
}

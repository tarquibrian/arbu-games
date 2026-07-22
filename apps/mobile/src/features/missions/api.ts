import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

// Misiones diarias (13.6). El progreso lo calcula el servidor a partir de los
// árboles y verificaciones del día — el cliente no lleva contadores propios.

export type MissionKind = Database['public']['Enums']['mission_kind']

export type DailyMission = {
  mission_id: string
  code: string
  kind: MissionKind
  title: string
  description: string
  target: number
  reward_coins: number
  progress: number
  completed: boolean
  claimed: boolean
}

export async function listDailyMissions(): Promise<DailyMission[]> {
  const { data, error } = await supabase.rpc('daily_missions')
  if (error) throw error
  return (data ?? []) as DailyMission[]
}

export async function claimMission(missionId: string): Promise<{ coins: number; balance: number }> {
  const { data, error } = await supabase.rpc('claim_mission', { p_mission_id: missionId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return { coins: row?.coins_awarded ?? 0, balance: row?.new_balance ?? 0 }
}

// Cuánto falta para que roten las misiones (medianoche en Bolivia, igual que el
// corte del RPC). Bolivia es UTC-4 todo el año.
export function missionsResetLabel(now = new Date()): string {
  const laPaz = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const msIntoDay =
    laPaz.getUTCHours() * 3600000 + laPaz.getUTCMinutes() * 60000 + laPaz.getUTCSeconds() * 1000
  const hoursLeft = Math.ceil((86400000 - msIntoDay) / 3600000)
  return hoursLeft <= 1 ? 'Actualiza en menos de 1 h' : `Actualiza en ${hoursLeft} h`
}

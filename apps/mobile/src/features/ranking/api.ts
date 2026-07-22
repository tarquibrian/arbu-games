import { supabase } from '@/lib/supabase'

// Ranking de la capa hábito (13.6): sólo estatus en el MVP, sin premio en dinero.
// Los puntos los calcula el servidor (RPC leaderboard) con la perilla
// app_config.points_rate — misma fuente que el nivel del perfil, para que no
// puedan mostrar números distintos.

export type LeaderboardPeriod = 'week' | 'all'

export type LeaderboardRow = {
  user_id: string
  username: string
  trees_mapped: number
  validations_done: number
  points: number
  place: number
}

export type MyPosition = {
  username: string
  trees_mapped: number
  validations_done: number
  points: number
  place: number | null   // null = sin actividad en el período
  total_ranked: number
}

export async function listLeaderboard(
  period: LeaderboardPeriod,
  limit = 50
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('leaderboard', { p_period: period, p_limit: limit })
  if (error) throw error
  return (data ?? []) as LeaderboardRow[]
}

export async function getMyPosition(period: LeaderboardPeriod): Promise<MyPosition | null> {
  const { data, error } = await supabase.rpc('leaderboard_me', { p_period: period })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as MyPosition | null
}

// Cuánto falta para que el ranking semanal se reinicie (lunes 00:00 en Bolivia,
// igual que el corte del RPC).
export function weekResetInfo(now = new Date()): { days: number; label: string } {
  // Bolivia es UTC-4 todo el año (sin horario de verano).
  const laPaz = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const dow = (laPaz.getUTCDay() + 6) % 7            // 0 = lunes
  const msIntoWeek =
    dow * 86400000 + laPaz.getUTCHours() * 3600000 +
    laPaz.getUTCMinutes() * 60000 + laPaz.getUTCSeconds() * 1000
  const msLeft = 7 * 86400000 - msIntoWeek
  const days = Math.ceil(msLeft / 86400000)
  const hours = Math.ceil(msLeft / 3600000)
  return {
    days,
    label: hours <= 24 ? `Se reinicia en ${hours} h` : `Se reinicia en ${days} días`,
  }
}

// Iniciales para el avatar: "invitado.a" → "IA", "sofia" → "SO".
export function initialsOf(username: string): string {
  const parts = username.split(/[.\-_\s]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

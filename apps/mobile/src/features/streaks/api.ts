import { supabase } from '@/lib/supabase'

export type Streak = {
  /** Días consecutivos con actividad que terminan hoy o ayer; 0 si está rota. */
  current: number
  /** Racha más larga histórica. */
  best: number
  /** Si el usuario ya mapeó o verificó hoy (racha ya asegurada por hoy). */
  activeToday: boolean
}

// La racha la calcula el servidor de las acciones reales (0010). El cliente no
// lleva contador: acá sólo se lee.
export async function getMyStreak(): Promise<Streak> {
  const { data, error } = await supabase.rpc('my_streak')
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as
    | { current_streak: number; best_streak: number; active_today: boolean }
    | undefined
  return {
    current: row?.current_streak ?? 0,
    best: row?.best_streak ?? 0,
    activeToday: row?.active_today ?? false,
  }
}

// Copy de la racha según su estado. La racha viva-pero-no-hoy es el momento de
// mayor valor de recordatorio: "no la pierdas" es más fuerte que "van N días".
export function streakLabel(s: Streak): string {
  if (s.current === 0) return 'Empieza tu racha hoy'
  if (s.activeToday) return `Racha de ${s.current} ${s.current === 1 ? 'día' : 'días'}`
  return `¡No pierdas tu racha de ${s.current}!`
}

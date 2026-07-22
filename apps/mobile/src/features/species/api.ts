import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Species = Pick<
  Database['public']['Tables']['species']['Row'],
  'id' | 'common_name' | 'scientific_name'
>

// Catálogo de especies locales (sembrado, compartido con Arbu — 5.2).
// Cambia poco: se cachea toda la sesión como app_config.
export async function listSpecies(): Promise<Species[]> {
  const { data, error } = await supabase
    .from('species')
    .select('id,common_name,scientific_name')
    .order('common_name')
  if (error) throw error
  return data ?? []
}

export const speciesQuery = {
  queryKey: ['species'] as const,
  queryFn: listSpecies,
  staleTime: Infinity,
}

// "Desconocido" existe en el catálogo (seed) y es una respuesta válida: forzar
// una especie inventada es peor dato que admitir que no se sabe (13.1).
export const isUnknownSpecies = (s: Pick<Species, 'common_name'>) =>
  s.common_name.toLowerCase() === 'desconocido'

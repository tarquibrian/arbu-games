import { supabase } from '@/lib/supabase'

// Perillas de servidor (app_config). El cliente las lee, nunca las asume:
// earn_rate, radios y umbrales se ajustan en vivo desde la DB (13.3, 13.1).
export type AppConfig = {
  validateReward: number      // coins por participante al validarse un árbol
  coinsPerBs: number          // referencia interna de solvencia (1 Bs = N coins)
  validationThreshold: number // verificadores distintos para validar (1+3)
  verifyRadiusM: number       // distancia máxima para verificar en el lugar
  duplicateRadiusM: number    // radio de búsqueda de duplicados al registrar
  gpsAccuracyMaxM: number     // precisión GPS por encima de la cual se advierte
}

export const DEFAULT_CONFIG: AppConfig = {
  validateReward: 30,
  coinsPerBs: 10,
  validationThreshold: 3,
  verifyRadiusM: 30,
  duplicateRadiusM: 25,
  gpsAccuracyMaxM: 15,
}

const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

export async function getAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from('app_config').select('key,value')
  if (error) throw error

  const map = new Map((data ?? []).map((r) => [r.key, r.value as any]))
  const earn = map.get('earn_rate') ?? {}
  const value = map.get('value_rate') ?? {}

  return {
    validateReward: num(earn?.validate_tree, DEFAULT_CONFIG.validateReward),
    coinsPerBs: num(value?.coins_per_bs, DEFAULT_CONFIG.coinsPerBs),
    validationThreshold: num(map.get('validation_threshold'), DEFAULT_CONFIG.validationThreshold),
    verifyRadiusM: num(map.get('verify_radius_m'), DEFAULT_CONFIG.verifyRadiusM),
    duplicateRadiusM: num(map.get('duplicate_radius_m'), DEFAULT_CONFIG.duplicateRadiusM),
    gpsAccuracyMaxM: num(map.get('gps_accuracy_max_m'), DEFAULT_CONFIG.gpsAccuracyMaxM),
  }
}

// Config cambia poco: cachearla toda la sesión evita un round-trip por pantalla.
export const appConfigQuery = {
  queryKey: ['appConfig'] as const,
  queryFn: getAppConfig,
  staleTime: Infinity,
}

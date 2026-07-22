import type { Database } from '@/types/database.types'

type E = Database['public']['Enums']

// Etiquetas ES de los enums del schema. Viven acá y no en cada pantalla para que
// registro, verificación y detalle nombren lo mismo — si el registrante ve
// "camellón" y el verificador "mediana", el consenso mide ruido de redacción.

export const HEALTH: { value: E['tree_health']; label: string; hint: string; dot: string }[] = [
  { value: 'good',    label: 'Bueno',   hint: 'Follaje sano, sin daños visibles', dot: 'bg-green-500' },
  { value: 'regular', label: 'Regular', hint: 'Daño menor o follaje ralo',        dot: 'bg-yellow-500' },
  { value: 'poor',    label: 'Pobre',   hint: 'Enfermo, seco en partes, crítico', dot: 'bg-orange-500' },
  { value: 'dead',    label: 'Muerto',  hint: 'Sin follaje vivo',                 dot: 'bg-red-500' },
]

export const HEIGHT_BANDS: { value: E['tree_height_band']; label: string; hint: string }[] = [
  { value: 'lt3',   label: 'Menos de 3 m', hint: 'No supera un poste de luz bajo' },
  { value: 'b3_6',  label: '3 a 6 m',      hint: 'Entre 1 y 2 pisos' },
  { value: 'b6_12', label: '6 a 12 m',     hint: 'Entre 2 y 4 pisos' },
  { value: 'gt12',  label: 'Más de 12 m',  hint: 'Supera 4 pisos' },
]

export const SITE_CONTEXTS: { value: E['tree_site_context']; label: string; hint: string }[] = [
  { value: 'sidewalk',     label: 'Acera / jardinera', hint: 'Vereda, franja entre calle y vereda' },
  { value: 'median',       label: 'Camellón',          hint: 'Mediana o separador de avenida' },
  { value: 'plaza_park',   label: 'Plaza o parque',    hint: 'Área verde pública' },
  { value: 'riverside',    label: 'Área de río',       hint: 'Ribera, canal, torrentera' },
  { value: 'private_yard', label: 'Patio privado',     hint: 'Dentro de un predio, visible desde la vía' },
  { value: 'other',        label: 'Otro',              hint: '' },
]

export const CONFLICTS: { value: E['tree_conflict']; label: string }[] = [
  { value: 'overhead_cables', label: 'Cables sobre la copa' },
  { value: 'sidewalk_damage', label: 'Vereda levantada' },
  { value: 'pole_or_light',   label: 'Poste o luminaria en la copa' },
  { value: 'small_pit',       label: 'Alcorque chico (< 1 m)' },
  { value: 'against_wall',    label: 'Pegado a un muro' },
]

export const URGENCIES: { value: E['tree_urgency']; label: string }[] = [
  { value: 'none',              label: 'Nada urgente' },
  { value: 'dry_dead',          label: 'Seco / muerto en pie' },
  { value: 'burned',            label: 'Quemado' },
  { value: 'pest',              label: 'Plaga o enfermedad visible' },
  { value: 'mechanical_damage', label: 'Daño mecánico' },
  { value: 'being_felled',      label: 'Tala en curso' },
]

const labelOf = <T extends string>(list: { value: T; label: string }[], v: T | null | undefined) =>
  list.find((o) => o.value === v)?.label ?? null

export const healthLabel  = (v: E['tree_health'] | null | undefined) => labelOf(HEALTH, v)
export const heightLabel  = (v: E['tree_height_band'] | null | undefined) => labelOf(HEIGHT_BANDS, v)
export const contextLabel = (v: E['tree_site_context'] | null | undefined) => labelOf(SITE_CONTEXTS, v)
export const urgencyLabel = (v: E['tree_urgency'] | null | undefined) => labelOf(URGENCIES, v)
export const conflictLabel = (v: E['tree_conflict']) => labelOf(CONFLICTS, v) ?? v

// Circunferencia (lo que se mide con cinta) → DAP. El servidor recalcula esto
// mismo al guardar (trigger de 0007); acá es sólo para mostrarlo en vivo.
export const dapFromCircumference = (cm: number) => Math.round((cm / Math.PI) * 10) / 10

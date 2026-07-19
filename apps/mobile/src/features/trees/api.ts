import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type TreeInsert = Database['public']['Tables']['trees']['Insert']
type TreeRow = Database['public']['Tables']['trees']['Row']
type TreeHealth = Database['public']['Enums']['tree_health']

// Etiquetas del formulario (español) -> enum del schema (inglés).
const HEALTH_MAP = {
  Bueno: 'good',
  Regular: 'regular',
  Pobre: 'poor',
  Muerto: 'dead',
} as const

export type HealthLabel = keyof typeof HEALTH_MAP

const PHOTO_BUCKET = 'tree-photos'

// base64 -> bytes (RN 0.85 trae atob global; sin deps extra)
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Sube la foto en vivo (base64 de expo-image-picker) a Storage bajo {uid}/... y
// devuelve la URL pública. RLS exige que la carpeta raíz sea el uid del usuario.
export async function uploadTreePhoto(base64: string): Promise<string> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export type NewTreeInput = {
  latitude: number
  longitude: number
  gpsAccuracy?: number | null
  photoUrl: string
  dap: number
  health: HealthLabel
  speciesId?: string | null
  speciesName?: string | null
  notes?: string | null
}

// Inserta un árbol como el usuario autenticado.
// status / validations_count los fija el servidor (default + trigger); el cliente no los envía.
export async function createTree(input: NewTreeInput): Promise<TreeRow> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  const payload: TreeInsert = {
    user_id: user.id,
    latitude: input.latitude,
    longitude: input.longitude,
    gps_accuracy: input.gpsAccuracy ?? null,
    photo_url: input.photoUrl,
    dap: input.dap,
    health: HEALTH_MAP[input.health],
    species_id: input.speciesId ?? null,
    species_name: input.speciesName ?? null,
    notes: input.notes ?? null,
  }

  const { data, error } = await supabase
    .from('trees')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Verificación comunitaria 1+3 (13.2)
// ============================================================

export type PendingTree = Pick<
  TreeRow,
  'id' | 'latitude' | 'longitude' | 'photo_url' | 'dap' | 'health' | 'status' | 'validations_count' | 'species_name' | 'created_at'
> & { validatedByMe: boolean; isMine: boolean }

// Árboles pendientes/estancados cerca, incluidos los propios y los que el usuario ya
// verificó — ambos se mantienen visibles en el mapa (marcados isMine / validatedByMe)
// en vez de desaparecer, para que el usuario vea que su árbol quedó cargado y sigue
// su progreso, y no pierda de vista lo que ya verificó (la constraint
// unique(tree_id,user_id) y el trigger anti-autoverificación igual lo protegen
// server-side; esto es solo para que la UI no confunda "no aparece" con "no se guardó").
export async function listPendingTrees(): Promise<PendingTree[]> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  const { data: mine } = await supabase
    .from('tree_validations')
    .select('tree_id')
    .eq('user_id', user.id)
  const validatedByMe = new Set((mine ?? []).map((v) => v.tree_id))

  const { data, error } = await supabase
    .from('trees')
    .select('id,latitude,longitude,photo_url,dap,health,status,validations_count,species_name,created_at,user_id')
    .in('status', ['pending', 'stalled'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []).map((t) => ({
    ...t,
    validatedByMe: validatedByMe.has(t.id),
    isMine: t.user_id === user.id,
  })) as PendingTree[]
}

// ============================================================
// Explorar árboles — lectura pública, todos los estados (13.1)
// ============================================================

export type ExploreTree = Pick<
  TreeRow,
  | 'id' | 'latitude' | 'longitude' | 'photo_url' | 'dap' | 'health' | 'status'
  | 'validations_count' | 'species_name' | 'origin' | 'planted_date' | 'created_at'
>

// Todos los árboles activos (pendientes, estancados y validados), sin excluir
// propios — pantalla de sólo lectura para curiosear/investigar, no de acción.
// No verificables/rechazados quedan fuera: son estado de auditoría (13.7), no
// datos útiles para mostrar al público.
export async function listAllTrees(): Promise<ExploreTree[]> {
  const { data, error } = await supabase
    .from('trees')
    .select('id,latitude,longitude,photo_url,dap,health,status,validations_count,species_name,origin,planted_date,created_at')
    .in('status', ['pending', 'stalled', 'validated'])
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return (data ?? []) as ExploreTree[]
}

export type NewValidationInput = {
  treeId: string
  photoUrl: string
  health: TreeHealth
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
}

// Registra una verificación en el lugar. El trigger handle_new_validation() cuenta,
// y al 3er verificador distinto valida el árbol y reparte la recompensa (13.2).
// Devuelve el status del árbol tras verificar (para saber si recién se validó).
export async function createValidation(
  input: NewValidationInput
): Promise<{ treeStatus: TreeRow['status']; validationsCount: number }> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  const { error } = await supabase.from('tree_validations').insert({
    tree_id: input.treeId,
    user_id: user.id,
    photo_url: input.photoUrl,
    health: input.health,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    notes: input.notes ?? null,
  })
  if (error) throw error

  // Releer el árbol: el trigger pudo haberlo validado.
  const { data: tree } = await supabase
    .from('trees')
    .select('status,validations_count')
    .eq('id', input.treeId)
    .single()

  return {
    treeStatus: tree?.status ?? 'pending',
    validationsCount: tree?.validations_count ?? 0,
  }
}

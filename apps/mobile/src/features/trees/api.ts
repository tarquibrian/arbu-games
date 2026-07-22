import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type TreeInsert = Database['public']['Tables']['trees']['Insert']
type TreeRow = Database['public']['Tables']['trees']['Row']
type TreeHealth = Database['public']['Enums']['tree_health']
type TreeHeightBand = Database['public']['Enums']['tree_height_band']
type TreeSiteContext = Database['public']['Enums']['tree_site_context']
type TreeConflict = Database['public']['Enums']['tree_conflict']
type TreeUrgency = Database['public']['Enums']['tree_urgency']

// Las pantallas trabajan directo con los enums del schema y traducen sólo al
// pintar (src/features/trees/vocab.ts). Antes había un mapa ES→EN acá; con
// registro y verificación compartiendo vocabulario, sobraba.

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
  photoUrl: string        // copa completa
  photoTrunkUrl?: string | null  // tronco a la altura del pecho (evidencia de la medida)
  circumferenceCm: number // el DAP lo deriva el servidor (trigger de 0007)
  health: TreeHealth
  heightBand?: TreeHeightBand | null
  siteContext?: TreeSiteContext | null
  conflicts?: TreeConflict[]
  urgency?: TreeUrgency
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
    photo_trunk_url: input.photoTrunkUrl ?? null,
    circumference_cm: input.circumferenceCm,
    // dap es NOT NULL desde 0001; se manda el derivado y el trigger lo recalcula
    // para que circunferencia y DAP no puedan divergir.
    dap: Math.round((input.circumferenceCm / Math.PI) * 10) / 10,
    health: input.health,
    height_band: input.heightBand ?? null,
    site_context: input.siteContext ?? null,
    conflicts: input.conflicts ?? [],
    urgency: input.urgency ?? 'none',
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
  | 'id' | 'latitude' | 'longitude' | 'photo_url' | 'photo_trunk_url' | 'dap' | 'circumference_cm'
  | 'health' | 'status' | 'validations_count' | 'species_id' | 'species_name' | 'height_band'
  | 'site_context' | 'conflicts' | 'urgency' | 'created_at'
> & { validatedByMe: boolean; isMine: boolean }

// Literal (no concatenado): supabase-js infiere el tipo de la fila desde el
// string exacto del select, y una concatenación lo degrada a `string`.
const PENDING_TREE_COLUMNS =
  'id,latitude,longitude,photo_url,photo_trunk_url,dap,circumference_cm,health,status,validations_count,species_id,species_name,height_band,site_context,conflicts,urgency,created_at,user_id' as const

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
    .select(PENDING_TREE_COLUMNS)
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

// ============================================================
// Ficha completa de un árbol (13.1) — lo que quedó tras el consenso 1+3
// ============================================================

export type TreeValidationEntry = {
  id: string
  created_at: string
  user_id: string
  health: TreeHealth
  circumference_cm: number | null
  height_band: TreeHeightBand | null
  site_context: TreeSiteContext | null
  conflicts: TreeConflict[] | null
  urgency: TreeUrgency | null
  photo_url: string
  verifier: { username: string } | null
  species: { common_name: string } | null
}

export type TreeDetail = TreeRow & {
  species: { common_name: string; scientific_name: string | null } | null
  owner: { username: string } | null
  validations: TreeValidationEntry[]
  validatedByMe: boolean
  isMine: boolean
}

export async function getTreeDetail(id: string): Promise<TreeDetail> {
  const { data: { user } } = await supabase.auth.getUser()

  const [treeRes, validationsRes] = await Promise.all([
    supabase
      .from('trees')
      .select('*, species:species(common_name, scientific_name), owner:profiles!trees_user_id_fkey(username)')
      .eq('id', id)
      .single(),
    // Las verificaciones individuales son públicas (RLS de 0001): sin ver quién
    // respondió qué, un campo "sin acuerdo" es una etiqueta sin sustento.
    supabase
      .from('tree_validations')
      .select(
        'id,created_at,user_id,health,circumference_cm,height_band,site_context,conflicts,urgency,photo_url,' +
        'verifier:profiles!tree_validations_user_id_fkey(username),species:species(common_name)'
      )
      .eq('tree_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (treeRes.error) throw treeRes.error
  const tree = treeRes.data as any
  const validations = (validationsRes.data ?? []) as unknown as TreeValidationEntry[]

  return {
    ...tree,
    validations,
    isMine: !!user && tree.user_id === user.id,
    validatedByMe: !!user && validations.some((v) => v.user_id === user.id),
  }
}

// ============================================================
// Detección de duplicados al registrar (13.1)
// ============================================================

export type NearbyTree = {
  id: string
  latitude: number
  longitude: number
  photo_url: string
  species_name: string | null
  status: TreeRow['status']
  validations_count: number
  dap: number
  health: TreeHealth
  created_at: string
  distance_meters: number
}

// Árboles ya conocidos dentro del radio (default: app_config.duplicate_radius_m).
// Sirve para ofrecer "¿es uno de estos?" y mandar a verificar en vez de duplicar.
export async function findNearbyTrees(
  latitude: number,
  longitude: number,
  radiusM?: number
): Promise<NearbyTree[]> {
  const { data, error } = await supabase.rpc('nearby_trees', {
    p_lat: latitude,
    p_lng: longitude,
    p_radius_m: radiusM ?? undefined,
  })
  if (error) throw error
  return (data ?? []) as NearbyTree[]
}

// El verificador responde por su cuenta los mismos campos que el registrante:
// al 3ro, el servidor aplica mayoría y corrige el árbol (0007). Por eso esto NO
// es "confirmar la ficha ajena" — es un voto propio.
export type NewValidationInput = {
  treeId: string
  photoUrl: string
  photoTrunkUrl?: string | null
  health: TreeHealth
  circumferenceCm?: number | null
  speciesId?: string | null
  speciesName?: string | null
  heightBand?: TreeHeightBand | null
  siteContext?: TreeSiteContext | null
  conflicts?: TreeConflict[] | null
  urgency?: TreeUrgency | null
  // Obligatorias: el trigger rechaza la verificación sin coordenadas o fuera del
  // radio de verify_radius_m (migración 0006). El chequeo en cliente es sólo UX.
  latitude: number
  longitude: number
  gpsAccuracy?: number | null
  notes?: string | null
}

// Registra una verificación en el lugar. El trigger handle_new_validation() cuenta,
// y al 3er verificador distinto valida el árbol y reparte la recompensa (13.2).
// Devuelve el status del árbol tras verificar (para saber si recién se validó).
export async function createValidation(
  input: NewValidationInput
): Promise<{ treeStatus: TreeRow['status']; validationsCount: number; disputedFields: string[] }> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('No autenticado')

  const { error } = await supabase.from('tree_validations').insert({
    tree_id: input.treeId,
    user_id: user.id,
    photo_url: input.photoUrl,
    photo_trunk_url: input.photoTrunkUrl ?? null,
    health: input.health,
    circumference_cm: input.circumferenceCm ?? null,
    species_id: input.speciesId ?? null,
    species_name: input.speciesName ?? null,
    height_band: input.heightBand ?? null,
    site_context: input.siteContext ?? null,
    conflicts: input.conflicts ?? null,
    urgency: input.urgency ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    gps_accuracy: input.gpsAccuracy ?? null,
    notes: input.notes ?? null,
  })
  if (error) throw error

  // Releer el árbol: el trigger pudo haberlo validado y, en ese caso, haber
  // reescrito la ficha con los valores consensuados (0007).
  const { data: tree } = await supabase
    .from('trees')
    .select('status,validations_count,disputed_fields')
    .eq('id', input.treeId)
    .single()

  return {
    treeStatus: tree?.status ?? 'pending',
    validationsCount: tree?.validations_count ?? 0,
    disputedFields: tree?.disputed_fields ?? [],
  }
}

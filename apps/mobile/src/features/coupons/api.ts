import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type CouponRow = Database['public']['Tables']['coupons']['Row']
type RedemptionRow = Database['public']['Tables']['coupon_redemptions']['Row']

// Cupón del catálogo + datos del comercio (join).
export type CouponWithMerchant = CouponRow & {
  merchant: { name: string; category: string | null } | null
}

// Redención del usuario + info del cupón/comercio para "Mis Cupones".
export type RedemptionWithCoupon = RedemptionRow & {
  coupon: (Pick<CouponRow, 'title' | 'redemption_location' | 'benefit_type'> & {
    merchant: { name: string } | null
  }) | null
}

// Estado efectivo en cliente: 'expired' no lo setea la DB (sin cron); una redención
// 'claimed' con use_expires_at ya pasado se muestra como expirada.
export type RedemptionState = 'active' | 'used' | 'expired'

export function redemptionState(r: Pick<RedemptionRow, 'status' | 'use_expires_at'>): RedemptionState {
  if (r.status === 'used') return 'used'
  if (r.status === 'expired') return 'expired'
  if (r.use_expires_at && new Date(r.use_expires_at).getTime() < Date.now()) return 'expired'
  return 'active' // 'claimed' vigente
}

// Saldo de ArbuCoins del usuario actual (server-authoritative).
export async function getMyBalance(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase
    .from('profiles').select('coins').eq('id', user.id).single()
  if (error) throw error
  return data.coins
}

// Catálogo de cupones activos + comercio.
export async function listCoupons(): Promise<CouponWithMerchant[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*, merchant:merchants(name, category)')
    .eq('active', true)
    .order('price_coins', { ascending: true })
  if (error) throw error
  return (data ?? []) as CouponWithMerchant[]
}

// Canje atómico vía RPC redeem_coupon() (verifica cupo/ventana/saldo, descuenta, crea redención).
export async function redeemCoupon(couponId: string): Promise<RedemptionRow> {
  const { data, error } = await supabase.rpc('redeem_coupon', { p_coupon_id: couponId })
  if (error) throw error
  return data as RedemptionRow
}

// Redenciones del usuario (Mis Cupones), más recientes primero.
export async function listMyRedemptions(): Promise<RedemptionWithCoupon[]> {
  const { data, error } = await supabase
    .from('coupon_redemptions')
    .select('*, coupon:coupons(title, redemption_location, benefit_type, merchant:merchants(name))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as RedemptionWithCoupon[]
}

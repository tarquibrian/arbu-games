'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth'

function str(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? '').trim()
  return v === '' ? null : v
}
function num(fd: FormData, k: string): number | null {
  const v = str(fd, k)
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Crea la cuenta del comercio y la vincula (merchant_members).
// Usa la Admin API (service_role) → el usuario queda confirmado sin email.
async function attachAccount(merchantId: string, email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Comercio creado, pero falló la cuenta: ${error.message}`)

  const { error: mErr } = await supabaseAdmin
    .from('merchant_members')
    .insert({ merchant_id: merchantId, user_id: data.user.id })
  if (mErr) throw new Error(`Cuenta creada, pero falló la membresía: ${mErr.message}`)
}

export async function createMerchant(fd: FormData) {
  await requireAdmin()
  const name = str(fd, 'name')
  if (!name) throw new Error('Nombre requerido')

  const email = str(fd, 'email')
  const password = str(fd, 'password')
  if (email && !password) throw new Error('Falta la contraseña de la cuenta')

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .insert({ name, category: str(fd, 'category'), address: str(fd, 'address') })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  // Cuenta inicial opcional: se puede agregar después con addMerchantMember.
  if (email && password) await attachAccount(data.id, email, password)

  revalidatePath('/')
}

export async function addMerchantMember(fd: FormData) {
  await requireAdmin()
  const merchantId = str(fd, 'merchant_id')
  const email = str(fd, 'email')
  const password = str(fd, 'password')
  if (!merchantId) throw new Error('Comercio requerido')
  if (!email || !password) throw new Error('Correo y contraseña requeridos')

  await attachAccount(merchantId, email, password)
  revalidatePath('/')
}

export async function createCoupon(fd: FormData) {
  await requireAdmin()
  const merchant_id = str(fd, 'merchant_id')
  const title = str(fd, 'title')
  const price_coins = num(fd, 'price_coins')
  if (!merchant_id) throw new Error('Comercio requerido')
  if (!title) throw new Error('Título requerido')
  if (price_coins == null || price_coins <= 0) throw new Error('Precio en monedas inválido')

  const quota = num(fd, 'quota')
  const { error } = await supabaseAdmin.from('coupons').insert({
    merchant_id,
    title,
    description: str(fd, 'description'),
    category: str(fd, 'category'),
    benefit_type: (str(fd, 'benefit_type') ?? 'product') as 'product' | 'discount' | 'service' | 'ticket',
    price_coins,
    tier: str(fd, 'tier') as 'short' | 'medium' | 'long' | null,
    redemption_location: (str(fd, 'redemption_location') ?? 'on_site') as 'app' | 'on_site',
    quota,
    quota_remaining: quota, // inicia igual al cupo
    use_window_days: num(fd, 'use_window_days'),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function toggleCoupon(fd: FormData) {
  await requireAdmin()
  const id = str(fd, 'id')
  const active = str(fd, 'active') === 'true'
  if (!id) return
  const { error } = await supabaseAdmin.from('coupons').update({ active: !active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

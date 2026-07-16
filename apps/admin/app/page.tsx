import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminUser } from '@/lib/auth'
import { createMerchant, createCoupon, toggleCoupon, addMerchantMember } from './actions'
import { LogoutButton } from './LogoutButton'

export const dynamic = 'force-dynamic'

function merchName(m: unknown): string {
  if (Array.isArray(m)) return m[0]?.name ?? ''
  return (m as { name?: string } | null)?.name ?? ''
}

export default async function AdminHome() {
  // Puerta: autenticado + en la allowlist admin_users. Si no, al login.
  const admin = await getAdminUser()
  if (!admin) redirect('/login')

  const [{ data: merchants }, { data: coupons }, { data: members }, usersRes] = await Promise.all([
    supabaseAdmin.from('merchants').select('id,name,category,active').order('name'),
    supabaseAdmin
      .from('coupons')
      .select('id,title,price_coins,category,benefit_type,redemption_location,quota_remaining,active,merchant:merchants(name)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('merchant_members').select('merchant_id,user_id'),
    supabaseAdmin.auth.admin.listUsers(),
  ])

  // auth.users no se expone por PostgREST → los correos salen por la Admin API.
  const emailById = new Map(usersRes.data.users.map((u) => [u.id, u.email ?? '']))
  const accountsByMerchant = new Map<string, string[]>()
  for (const m of members ?? []) {
    const list = accountsByMerchant.get(m.merchant_id) ?? []
    list.push(emailById.get(m.user_id) ?? m.user_id.slice(0, 8))
    accountsByMerchant.set(m.merchant_id, list)
  }

  const field = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white text-neutral-900'
  const label = 'block text-xs font-semibold text-neutral-600 mb-1'
  const btn = 'rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700'

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 bg-white min-h-screen">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Arbu Games — Admin</h1>
          <p className="text-sm text-neutral-500">Alta de comercios, cuentas y cupones · piloto Cochabamba</p>
        </div>
        <LogoutButton email={admin.email ?? ''} />
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
        {/* ---- Comercios ---- */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-800">Comercios</h2>
          <div className="space-y-3 mb-4">
            {(merchants ?? []).length === 0 ? (
              <p className="rounded-lg border border-neutral-200 p-3 text-sm text-neutral-400">Sin comercios.</p>
            ) : (
              (merchants ?? []).map((m) => {
                const accounts = accountsByMerchant.get(m.id) ?? []
                return (
                  <div key={m.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-800">{m.name}</span>
                      <span className="text-xs text-neutral-400">{m.category ?? '—'}</span>
                    </div>

                    {accounts.length > 0 ? (
                      <ul className="mt-2 space-y-0.5">
                        {accounts.map((a) => (
                          <li key={a} className="text-xs text-emerald-700">● {a}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-amber-600">Sin cuenta — no puede validar canjes</p>
                    )}

                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-neutral-500">agregar cuenta</summary>
                      <form action={addMerchantMember} className="mt-2 space-y-2">
                        <input type="hidden" name="merchant_id" value={m.id} />
                        <input name="email" type="email" required className={field} placeholder="correo" />
                        <input name="password" type="text" required minLength={6} className={field} placeholder="contraseña (mín 6)" />
                        <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white">
                          Crear cuenta
                        </button>
                      </form>
                    </details>
                  </div>
                )
              })
            )}
          </div>

          <form action={createMerchant} className="rounded-lg border border-neutral-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-700">Nuevo comercio</p>
            <div>
              <label className={label}>Nombre *</label>
              <input name="name" required className={field} placeholder="Café Verde" />
            </div>
            <div>
              <label className={label}>Categoría</label>
              <input name="category" className={field} placeholder="Cafeterías" />
            </div>
            <div>
              <label className={label}>Dirección</label>
              <input name="address" className={field} placeholder="Av. Ballivián" />
            </div>
            <div className="border-t border-neutral-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-neutral-500">Cuenta inicial (opcional — se puede agregar después)</p>
              <div className="grid grid-cols-2 gap-2">
                <input name="email" type="email" className={field} placeholder="correo" />
                <input name="password" type="text" minLength={6} className={field} placeholder="contraseña" />
              </div>
            </div>
            <button className={btn}>Agregar comercio</button>
          </form>
        </section>

        {/* ---- Cupones ---- */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-800">Cupones</h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="p-2">Título</th>
                  <th className="p-2">Comercio</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Canje</th>
                  <th className="p-2">Cupo</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(coupons ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="p-3 text-neutral-400">Sin cupones.</td></tr>
                ) : (
                  (coupons ?? []).map((c) => (
                    <tr key={c.id} className={c.active ? '' : 'opacity-40'}>
                      <td className="p-2 font-medium text-neutral-800">{c.title}</td>
                      <td className="p-2 text-neutral-600">{merchName(c.merchant)}</td>
                      <td className="p-2 text-neutral-600">{c.price_coins} AC</td>
                      <td className="p-2 text-neutral-500">{c.redemption_location === 'on_site' ? 'en comercio' : 'app'}</td>
                      <td className="p-2 text-neutral-500">{c.quota_remaining ?? '∞'}</td>
                      <td className="p-2">
                        <form action={toggleCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={String(c.active)} />
                          <button className="text-xs text-emerald-700 hover:underline">
                            {c.active ? 'desactivar' : 'activar'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form action={createCoupon} className="rounded-lg border border-neutral-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-700">Nuevo cupón</p>
            <div>
              <label className={label}>Comercio *</label>
              <select name="merchant_id" required className={field} defaultValue="">
                <option value="" disabled>Elegí un comercio…</option>
                {(merchants ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Título *</label>
              <input name="title" required className={field} placeholder="1 Café Express gratis" />
            </div>
            <div>
              <label className={label}>Descripción</label>
              <input name="description" className={field} placeholder="Canjea un café espresso mediano." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Categoría</label>
                <input name="category" className={field} placeholder="Cafeterías" />
              </div>
              <div>
                <label className={label}>Precio (monedas) *</label>
                <input name="price_coins" type="number" min="1" required className={field} placeholder="150" />
              </div>
              <div>
                <label className={label}>Tipo</label>
                <select name="benefit_type" className={field} defaultValue="product">
                  <option value="product">producto</option>
                  <option value="discount">descuento</option>
                  <option value="service">servicio</option>
                  <option value="ticket">ticket</option>
                </select>
              </div>
              <div>
                <label className={label}>Canje</label>
                <select name="redemption_location" className={field} defaultValue="on_site">
                  <option value="on_site">en comercio</option>
                  <option value="app">en app</option>
                </select>
              </div>
              <div>
                <label className={label}>Tier</label>
                <select name="tier" className={field} defaultValue="short">
                  <option value="short">corto</option>
                  <option value="medium">medio</option>
                  <option value="long">largo</option>
                </select>
              </div>
              <div>
                <label className={label}>Cupo</label>
                <input name="quota" type="number" min="0" className={field} placeholder="50" />
              </div>
              <div>
                <label className={label}>Ventana uso (días)</label>
                <input name="use_window_days" type="number" min="1" className={field} placeholder="30" />
              </div>
            </div>
            <button className={btn}>Agregar cupón</button>
          </form>
        </section>
      </div>
    </main>
  )
}

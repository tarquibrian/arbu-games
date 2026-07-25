'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Panel de actividad del comercio (Hipótesis 3): sin esto el comercio valida
// códigos a ciegas y no tiene forma de saber si participar le sirve.
//
// Todo sale de RPCs security definer (0013) acotadas por merchant_members: el
// comercio ve su actividad, no la de otros, y nunca la identidad del ciudadano.

type Summary = {
  coupons_active: number
  claimed_total: number
  used_total: number
  pending_use: number
  coins_total: number
  used_last_7d: number
  used_last_30d: number
}

type CouponStat = {
  coupon_id: string
  title: string
  price_coins: number
  active: boolean
  quota_remaining: number | null
  claimed: number
  used: number
}

type Recent = {
  redemption_code: string
  coupon_title: string
  status: string
  claimed_at: string
  used_at: string | null
  coins_spent: number
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xl font-bold text-neutral-900">{value}</div>
      <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
    </div>
  )
}

export function Activity() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [coupons, setCoupons] = useState<CouponStat[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.rpc('merchant_activity'),
      supabase.rpc('merchant_coupon_stats'),
      supabase.rpc('merchant_recent_redemptions', { p_limit: 10 }),
    ])
      .then(([s, c, r]) => {
        if (s.error || c.error || r.error) {
          setError(s.error?.message ?? c.error?.message ?? r.error?.message ?? '')
          return
        }
        setSummary((Array.isArray(s.data) ? s.data[0] : s.data) as Summary)
        setCoupons((c.data ?? []) as CouponStat[])
        setRecent((r.data ?? []) as Recent[])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-neutral-400">Cargando actividad…</p>
  if (error) return <p className="text-sm text-red-600">No se pudo cargar la actividad: {error}</p>

  const nada = !summary || summary.claimed_total === 0

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-bold text-neutral-800">Tu actividad</h2>
        <div className="grid grid-cols-3 gap-2">
          <Tile value={summary?.used_total ?? 0} label="Canjes usados" />
          <Tile value={summary?.pending_use ?? 0} label="Por venir" />
          <Tile value={summary?.used_last_7d ?? 0} label="Últimos 7 días" />
        </div>
        {nada ? (
          <p className="mt-2 text-xs text-neutral-400">
            Todavía no hay canjes. Aparecerán acá apenas un cliente use un cupón tuyo.
          </p>
        ) : (
          <p className="mt-2 text-xs text-neutral-500">
            {summary!.pending_use > 0
              ? `${summary!.pending_use} ${summary!.pending_use === 1 ? 'cliente reclamó' : 'clientes reclamaron'} un cupón y todavía no ${summary!.pending_use === 1 ? 'vino' : 'vinieron'} a usarlo.`
              : 'Todos los cupones reclamados ya se usaron.'}
          </p>
        )}
      </section>

      {coupons.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-neutral-800">Tus cupones</h2>
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.coupon_id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900">{c.title}</span>
                  {!c.active ? (
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                      inactivo
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-neutral-500">
                  <span><strong className="text-neutral-800">{c.used}</strong> usados</span>
                  <span><strong className="text-neutral-800">{c.claimed}</strong> reclamados</span>
                  <span>{c.price_coins} AC</span>
                  {c.quota_remaining != null ? <span>quedan {c.quota_remaining}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-neutral-800">Últimos canjes</h2>
          <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {recent.map((r) => (
              <div key={r.redemption_code} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm text-neutral-800">{r.coupon_title}</div>
                  <div className="text-[11px] text-neutral-400">
                    {r.status === 'used' && r.used_at
                      ? `usado ${fmtDate(r.used_at)}`
                      : `reclamado ${fmtDate(r.claimed_at)} · sin usar`}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    r.status === 'used'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {r.status === 'used' ? 'usado' : 'pendiente'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Se muestra qué se canjeó y cuándo. Los datos personales de los clientes no se comparten.
          </p>
        </section>
      ) : null}
    </div>
  )
}

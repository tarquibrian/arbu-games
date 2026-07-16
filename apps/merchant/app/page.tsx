'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Result = {
  code: string
  coupon_title: string
  merchant_name: string
  coins_spent: number
  used_at: string
}

const input = 'w-full rounded-lg border border-neutral-300 px-4 py-3 text-base text-neutral-900 bg-white'
const btn = 'w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-50'

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setBooting(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (booting) return <Shell><p className="text-neutral-500 text-sm">Cargando…</p></Shell>
  return session ? <Validate /> : <Login />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8">
          <h1 className="text-xl font-bold text-neutral-900">Arbu Games — Comercio</h1>
          <p className="text-sm text-neutral-500">Validá el código del cliente</p>
        </header>
        {children}
      </div>
    </main>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <p className="font-semibold text-neutral-800">Iniciá sesión</p>
        <input className={input} type="email" placeholder="correo del comercio" value={email}
          onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" required />
        <input className={input} type="password" placeholder="contraseña" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className={btn} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </Shell>
  )
}

function Validate() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [merchant, setMerchant] = useState<string>('')

  // Qué comercio soy (RLS: solo veo mi propia membresía).
  useEffect(() => {
    supabase
      .from('merchant_members')
      .select('merchant:merchants(name)')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const m = (data as { merchant?: { name?: string } | { name?: string }[] } | null)?.merchant
        setMerchant(Array.isArray(m) ? (m[0]?.name ?? '') : (m?.name ?? ''))
      })
  }, [])

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    const { data, error: err } = await supabase.rpc('validate_redemption', { p_code: code.trim() })
    if (err) setError(err.message)
    else setResult((Array.isArray(data) ? data[0] : data) as Result)
    setLoading(false)
  }, [code])

  return (
    <Shell>
      {merchant ? (
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">{merchant}</p>
      ) : null}

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-800">Código del cliente</label>
        <input
          className={`${input} font-mono tracking-widest uppercase`}
          placeholder="ARBU-XXXXXXXX"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); setResult(null) }}
          autoCapitalize="characters"
          required
        />
        <button className={btn} disabled={loading || !code.trim()}>
          {loading ? 'Validando…' : 'Validar y entregar'}
        </button>
        <p className="text-xs text-neutral-400">El código es de un solo uso. Al validar, se marca como entregado.</p>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">No válido</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <p className="text-lg font-bold text-emerald-800">✓ Válido — entregar</p>
          <p className="mt-2 text-xl font-bold text-neutral-900">{result.coupon_title}</p>
          <p className="text-sm text-neutral-600">{result.merchant_name}</p>
          <p className="mt-3 font-mono text-xs text-neutral-500">{result.code}</p>
          <button
            onClick={() => { setCode(''); setResult(null) }}
            className="mt-4 w-full rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700"
          >
            Validar otro
          </button>
        </div>
      ) : null}

      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-8 w-full text-center text-xs text-neutral-400 underline"
      >
        Cerrar sesión
      </button>
    </Shell>
  )
}

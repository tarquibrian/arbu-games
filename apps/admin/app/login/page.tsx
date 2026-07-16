'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabaseBrowser.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    // El server revalida contra la allowlist; si no es del equipo, la home lo rebota.
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-xl font-bold text-neutral-900">Arbu Games — Admin</h1>
        <p className="mb-6 text-sm text-neutral-500">Acceso del equipo</p>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
          <input
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            type="email" placeholder="correo" value={email} autoCapitalize="none"
            onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            type="password" placeholder="contraseña" value={password}
            onChange={(e) => setPassword(e.target.value)} required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

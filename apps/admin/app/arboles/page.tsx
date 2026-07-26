import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// El doc deja fuera del MVP el "dashboard de datos avanzado" pero incluye
// explícitamente una tabla simple de árboles. Esto es eso: ver el dato que el
// piloto produce, y las métricas con las que se evalúan las hipótesis (§16).

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  validated: 'Validado',
  unverifiable: 'No verificable',
  rejected: 'Rechazado',
  stalled: 'Estancado',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  validated: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  unverifiable: 'bg-neutral-100 text-neutral-500 ring-neutral-500/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
}

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'stalled', label: 'Estancados' },
  { key: 'validated', label: 'Validados' },
  { key: 'unverifiable', label: 'No verificables' },
] as const

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function Metric({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs font-semibold text-neutral-600">{label}</div>
      {hint ? <div className="text-[11px] text-neutral-400 mt-0.5">{hint}</div> : null}
    </div>
  )
}

// Next 16: searchParams es una promesa, el acceso síncrono se removió.
export default async function TreesPage(props: { searchParams: Promise<{ estado?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/login')

  const { estado = 'todos' } = await props.searchParams

  const [{ data: metrics }, { data: trees }] = await Promise.all([
    supabaseAdmin.from('pilot_metrics').select('*').single(),
    supabaseAdmin
      .from('trees')
      .select('id,status,is_stalled,species_name,validations_count,created_at,dap,health,latitude,longitude,user_id,profiles:profiles!trees_user_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  // "Estancado" no es un status almacenado sino una columna computada, así que
  // el filtro se aplica acá y no en el where.
  const rows = (trees ?? []).filter((t) => {
    if (estado === 'todos') return true
    if (estado === 'stalled') return t.is_stalled
    if (estado === 'pending') return t.status === 'pending' && !t.is_stalled
    return t.status === estado
  })

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 bg-white min-h-screen">
      <header className="mb-8">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">← Volver</Link>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">Árboles del piloto</h1>
        <p className="text-sm text-neutral-500">
          El dato que produce la ciencia ciudadana, y cómo va la validación comunitaria.
        </p>
      </header>

      {/* ---- Métricas (§16: las preguntas que el MVP existe para responder) ---- */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-800">Métricas</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Metric value={String(metrics?.trees_total ?? 0)} label="Mapeados" />
          <Metric
            value={metrics?.pct_validated != null ? `${metrics.pct_validated}%` : '—'}
            label="Validados"
            hint={`${metrics?.validated ?? 0} de ${metrics?.trees_total ?? 0}`}
          />
          <Metric
            value={String(metrics?.stalled ?? 0)}
            label="Estancados"
            hint="sin llegar a 3 verificaciones"
          />
          <Metric
            value={metrics?.avg_days_to_validate != null ? `${metrics.avg_days_to_validate} d` : '—'}
            label="Tiempo a validar"
            hint="promedio"
          />
          <Metric
            value={String(metrics?.unverifiable ?? 0)}
            label="No verificables"
            hint="nadie los encontró"
          />
        </div>
        {(metrics?.pending ?? 0) > 0 ? (
          <p className="mt-3 text-xs text-neutral-500">
            Los {metrics!.pending} pendientes llevan {metrics!.avg_validations_pending ?? 0} verificaciones en promedio.
            Un pendiente que no llega a 3 no le paga a nadie — de ahí el bono de rescate.
          </p>
        ) : null}
      </section>

      {/* ---- Filtros ---- */}
      <nav className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = estado === f.key
          return (
            <Link
              key={f.key}
              href={f.key === 'todos' ? '/arboles' : `/arboles?estado=${f.key}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                active
                  ? 'bg-emerald-600 text-white ring-emerald-600'
                  : 'bg-white text-neutral-600 ring-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      {/* ---- Tabla ---- */}
      {rows.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-400">
          No hay árboles con ese filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-600">
              <tr>
                <th className="px-3 py-2">Especie</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Verificaciones</th>
                <th className="px-3 py-2">DAP</th>
                <th className="px-3 py-2">Salud</th>
                <th className="px-3 py-2">Registró</th>
                <th className="px-3 py-2">Hace</th>
                <th className="px-3 py-2">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((t) => {
                // El estancado se muestra como estado propio aunque en la base
                // siga siendo `pending`: para el equipo es lo relevante.
                const shown = t.is_stalled ? 'stalled' : t.status
                const owner = (t.profiles as { username?: string } | null)?.username
                return (
                  <tr key={t.id} className="text-neutral-700">
                    <td className="px-3 py-2 font-medium text-neutral-900">{t.species_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                          t.is_stalled
                            ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                            : STATUS_STYLE[t.status] ?? 'bg-neutral-100 text-neutral-600 ring-neutral-500/20'
                        }`}
                      >
                        {STATUS_LABEL[shown] ?? shown}
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.validations_count}/3</td>
                    <td className="px-3 py-2">{t.dap != null ? `${t.dap} cm` : '—'}</td>
                    <td className="px-3 py-2">{t.health}</td>
                    <td className="px-3 py-2">{owner ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{daysAgo(t.created_at)} d</td>
                    <td className="px-3 py-2 tabular-nums text-xs text-neutral-500">
                      {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-neutral-400">
        Mostrando {rows.length} de {trees?.length ?? 0} (últimos 300 registros).
      </p>
    </main>
  )
}

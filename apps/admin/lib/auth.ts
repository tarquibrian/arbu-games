import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from './supabaseAdmin'
import type { Database } from './database.types'

// Cliente ligado a la sesión del usuario (cookies). Publishable key, sin poderes.
export async function createSessionClient() {
  const store = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          // En Server Components no se pueden setear cookies; el cliente del browser
          // ya las escribe al iniciar sesión.
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

/**
 * Puerta del admin. Devuelve el usuario si está autenticado Y en la allowlist
 * `admin_users`; si no, lanza.
 *
 * Estar autenticado NO alcanza: cualquiera puede crearse cuenta en Supabase (la app
 * ciudadana usa el mismo proyecto). La allowlist es lo que separa al equipo.
 *
 * Se llama al inicio de CADA server action: los actions son alcanzables por POST
 * directo, no solo desde la UI.
 */
export async function requireAdmin() {
  const supa = await createSessionClient()
  // getUser() valida el JWT contra el servidor (no solo decodifica la cookie).
  const { data: { user } } = await supa.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No autorizado — tu cuenta no es del equipo')

  return user
}

// Igual que requireAdmin pero sin lanzar — para decidir qué renderizar.
export async function getAdminUser() {
  try {
    return await requireAdmin()
  } catch {
    return null
  }
}

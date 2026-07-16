// Alta de un miembro del equipo en la allowlist del admin.
// No hay UI para esto a propósito: quien puede crear admins controla toda la DB.
//
//   node --env-file=.env.local scripts/create-admin.mjs correo@arbu.games unaClave123
//
// Si el usuario ya existe en auth, lo reutiliza y solo lo agrega a admin_users.

import { createClient } from '@supabase/supabase-js'

const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error('uso: node --env-file=.env.local scripts/create-admin.mjs <correo> <clave>')
  process.exit(1)
}

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let userId

const { data: created, error: createErr } = await supa.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (createErr) {
  // Probablemente ya existe: buscarlo.
  const { data: list, error: listErr } = await supa.auth.admin.listUsers()
  if (listErr) throw listErr
  const found = list.users.find((u) => u.email === email)
  if (!found) throw createErr
  userId = found.id
  console.log(`usuario existente reutilizado: ${email}`)
} else {
  userId = created.user.id
  console.log(`usuario creado: ${email}`)
}

const { error: insErr } = await supa
  .from('admin_users')
  .upsert({ user_id: userId, email }, { onConflict: 'user_id' })
if (insErr) throw insErr

console.log(`✓ ${email} es admin (${userId})`)

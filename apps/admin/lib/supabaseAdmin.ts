import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Cliente admin: usa service_role → BYPASSA RLS. Solo server-side (import 'server-only'
// + variable sin NEXT_PUBLIC). Nunca exponer al navegador.
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Cliente del browser: escribe la cookie de sesión que después lee el server.
// Publishable key — sin poderes; la autorización real la hace requireAdmin().
export const supabaseBrowser = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

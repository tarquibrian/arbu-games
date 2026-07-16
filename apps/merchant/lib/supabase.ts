'use client'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Cliente de comercio: publishable key + sesión del usuario. La autorización la
// imponen RLS y validate_redemption() (chequea membresía del comercio).
// Acá NO va service_role — el comercio no debe tener poder sobre toda la DB.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

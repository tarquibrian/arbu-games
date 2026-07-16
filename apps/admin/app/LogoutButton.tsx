'use client'

import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export function LogoutButton({ email }: { email: string }) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-3 text-xs text-neutral-500">
      <span>{email}</span>
      <button
        onClick={async () => {
          await supabaseBrowser.auth.signOut()
          router.replace('/login')
          router.refresh()
        }}
        className="underline hover:text-neutral-800"
      >
        salir
      </button>
    </div>
  )
}

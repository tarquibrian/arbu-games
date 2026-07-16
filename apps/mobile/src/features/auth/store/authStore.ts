import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'

type AuthState = {
  session: Session | null
  loading: boolean
  hasSeenOnboarding: boolean | null  // null = not yet read from storage
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setHasSeenOnboarding: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  hasSeenOnboarding: null,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
}))

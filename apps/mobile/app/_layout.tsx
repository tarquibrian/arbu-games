import '../global.css'
import { useEffect } from 'react'
import { Slot } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/store/authStore'

export default function RootLayout() {
  const { setSession, setLoading, setHasSeenOnboarding } = useAuthStore()

  useEffect(() => {
    // Read both in parallel — single pass on app start, never re-read on navigation
    AsyncStorage.getItem('hasSeenOnboarding').then(v => setHasSeenOnboarding(v === 'true'))

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading, setHasSeenOnboarding])

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  )
}

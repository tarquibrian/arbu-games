import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '@/features/auth/store/authStore'
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen'

export default function AuthLayout() {
  const { session, loading, hasSeenOnboarding } = useAuthStore()

  // loading = Supabase session not yet resolved
  // hasSeenOnboarding === null = AsyncStorage not yet read (both happen in root _layout)
  if (loading || hasSeenOnboarding === null) return <LoadingScreen />
  if (session) return <Redirect href="/(tabs)" />
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}

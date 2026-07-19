import { router } from 'expo-router'

// router.back() throws "GO_BACK was not handled by any navigator" when the
// current screen has no history to pop — e.g. opened via deep link (as this
// app's tree/* screens are, for direct navigation/testing). Falls back to
// home instead of crashing the back button.
export function goBack() {
  if (router.canGoBack()) {
    router.back()
  } else {
    router.replace('/(tabs)')
  }
}

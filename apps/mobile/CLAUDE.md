# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm start          # start Metro bundler (then press i for iOS, a for Android)
npm run ios        # start + open iOS simulator directly
npm run android    # start + open Android emulator directly
```

Always run with `npm start` and press `i` manually if the simulator times out on `npm run ios`.

## Stack Versions (critical)

- **Expo SDK 56** — docs at https://docs.expo.dev/versions/v56.0.0/
- React Native 0.85.3 / React 19.2.3 / TypeScript 6
- **NativeWind v4 requires Tailwind CSS v3** — v4 is not supported. Never upgrade tailwindcss past `^3.x`.
- `react-native-reanimated` v4 + `react-native-worklets` — required by NativeWind's css-interop babel preset. The babel plugin is `react-native-worklets/plugin` (not the old `react-native-reanimated/plugin`).
- `react-native-mmkv` v4 uses Nitro Modules — **incompatible with Expo Go**. Use `AsyncStorage` for any persistence that needs to work in Expo Go.

## Architecture

### Routing — Expo Router (file-based)

```
app/
  _layout.tsx          # root: QueryClientProvider + Supabase auth listener
  onboarding.tsx       # shown once (flag in AsyncStorage)
  (auth)/
    _layout.tsx        # guards: redirects to /(tabs) if session, /onboarding if not seen
    login.tsx          # Sign In / Sign Up combined
    register.tsx
  (tabs)/
    _layout.tsx        # guards: redirects to /(auth)/login if no session
    index.tsx          # Mapa
    explore.tsx        # Verificar
    wallet.tsx         # Billetera
    profile.tsx        # Perfil
  tree/
    new.tsx            # register a new tree
    [id].tsx           # tree detail
```

### State Management

- **Auth state** — Zustand store at `src/features/auth/store/authStore.ts`. Session is set by the root layout's `supabase.auth.onAuthStateChange` listener. Guards in `(auth)/_layout` and `(tabs)/_layout` read from this store.
- **Server state** — TanStack React Query via `src/lib/queryClient.ts`.
- **Simple persistence** — `AsyncStorage` (Expo Go compatible).

### Path Alias

`@/*` maps to `./src/*`. E.g. `import { supabase } from '@/lib/supabase'`.

### Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=     ← publishable/anon key (not SUPABASE_ANON_KEY)
```

## Design System

Reference designs live in `/test/design/` as plain JSX/HTML web files. When migrating visuals to React Native:

- **CSS `radial-gradient`** → `<RadialGradient>` from `react-native-svg` with `gradientTransform="translate(cx,cy) scale(rx,ry)"` to produce elliptical gradients. The shared `<ScreenBackground />` component (`src/shared/components/ui/ScreenBackground.tsx`) owns the app background.
- **CSS `filter: blur()`** → not available on iOS via SVG filters. Simulate with a second, tighter radial gradient layer at higher opacity.
- **CSS `box-shadow: 0 0 Xpx`** (glow) → wrap the target in a plain `View` with `shadowOffset: { width: 0, height: 0 }`. Applying shadow directly to `LinearGradient` does not render on iOS.
- **Animated color + size together** → use a single `Animated.Value` (0→1) and `interpolate()` for each property. Memoize interpolated values with `useRef` — calling `.interpolate()` on every render creates new object references that cause visual flickers.

### Colors (dark green theme)

| Token | Value |
|---|---|
| Background | `#08160e` |
| Accent green | `#2fe06a` |
| Accent deep | `#19c455` |
| Text | `#eaf6ee` |
| Muted | `rgba(205,225,212,0.62)` |
| Field background | `#0d2419` |
| Border | `rgba(120,230,150,0.32)` |

## Key Constraints

- **Programmatic FlatList scroll + `onScroll` conflict**: when calling `scrollToIndex`, use an `isProgrammatic` ref to block `onScroll` from overwriting the index state while the scroll animation is in flight. Release the lock in `onMomentumScrollEnd`.
- **TypeScript 6** deprecates `baseUrl` — use only `paths` in tsconfig. `ignoreDeprecations: "6.0"` is set.
- **`app.json`**: splash screen is configured via the `expo-splash-screen` plugin, not the top-level `splash` key (SDK 56 change).

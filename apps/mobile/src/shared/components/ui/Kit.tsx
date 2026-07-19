// Arbu UI kit — small primitives that carry the auth-screen DNA into the app:
// translucent surfaces over the background glow, soft green hairlines,
// gradient CTAs with a quiet glow. Layout stays in NativeWind classes;
// gradients/shadows live here because RN needs style props for them.
import { ReactNode } from 'react'
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T, CTA_GRADIENT, glow, lift } from '@/shared/theme'

// — Card: base translucent surface with a soft hairline.
//   variant="dim" is the disabled/completed state: darker fill, no hairline,
//   so live cards visibly pop against it (contrast by fill, not opacity).
//   Default variant fills with a diagonal light-to-dark gradient (top-left
//   lighter, bottom-right darker) for a subtle "lit card" sheen — same idea
//   as a premium card mockup, just a soft version of it. —
export function Card({
  children,
  className = '',
  style,
  variant = 'default',
}: {
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
  variant?: 'default' | 'dim'
}) {
  if (variant === 'dim') {
    return (
      <View
        className={`bg-surface-dim border border-transparent rounded-3xl ${className}`}
        style={style}
      >
        {children}
      </View>
    )
  }
  return (
    <View
      className={`overflow-hidden border border-hairline-2 rounded-3xl ${className}`}
      style={style}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

// — HeroCard: the one elevated card per screen. Subtle green gradient wash
//   + slightly stronger hairline + neutral lift shadow. —
export function HeroCard({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ borderRadius: 26 }, lift, style]}>
      <LinearGradient
        colors={['rgba(48,224,106,0.16)', 'rgba(48,224,106,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 26,
          borderWidth: 1,
          borderColor: 'rgba(120,230,150,0.22)',
        }}
      >
        <View className={className}>{children}</View>
      </LinearGradient>
    </View>
  )
}

// — PrimaryButton: same gradient + glow language as the login CTA —
export function PrimaryButton({
  title,
  onPress,
  size = 'md',
  disabled = false,
  loading = false,
}: {
  title: string
  onPress?: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
  loading?: boolean
}) {
  const height = size === 'sm' ? 34 : 48
  const radius = size === 'sm' ? 11 : 15
  const fontSize = size === 'sm' ? 12 : 14.5

  // Disabled = flat dark surface + muted text. A washed-out gradient reads as
  // "broken active"; a dark flat pill reads unmistakably as "can't do this".
  if (disabled && !loading) {
    return (
      <View
        style={{
          height,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: size === 'sm' ? 12 : 18,
          backgroundColor: T.surfaceDim,
          borderWidth: 1,
          borderColor: T.hairline2,
        }}
      >
        <Text style={{ color: T.faint, fontSize, fontWeight: '700', letterSpacing: 0.2 }}>
          {title}
        </Text>
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: radius, opacity: pressed ? 0.88 : 1 },
        glow(0.35, 10),
      ]}
    >
      <LinearGradient
        colors={[...CTA_GRADIENT]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          height,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: size === 'sm' ? 12 : 18,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={T.ink} />
        ) : (
          <Text style={{ color: T.ink, fontSize, fontWeight: '800', letterSpacing: 0.2 }}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  )
}

// — Chip: category / filter pill —
export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string
  active?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [active && glow(0.3, 8), { opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        className={`px-4 py-2 rounded-full border ${
          active ? 'bg-bright border-bright' : 'bg-surface border-hairline-2'
        }`}
      >
        <Text
          className={`text-xs font-bold ${active ? 'text-ink' : 'text-muted'}`}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

// — SectionTitle: heading row with optional action link —
export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <View className="flex-row justify-between items-baseline mb-3.5">
      <Text
        className="text-body text-[17px] font-extrabold"
        style={{ letterSpacing: -0.3 }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-leaf text-xs font-bold">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// — IconWell: soft accent-tinted circle-square behind an icon.
//   dim=true drops the green tint for inactive/disabled contexts. —
export function IconWell({
  children,
  size = 46,
  className = '',
  dim = false,
}: {
  children: ReactNode
  size?: number
  className?: string
  dim?: boolean
}) {
  return (
    <View
      className={`${dim ? 'bg-surface-hi' : 'bg-well'} items-center justify-center ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.36 }}
    >
      {children}
    </View>
  )
}

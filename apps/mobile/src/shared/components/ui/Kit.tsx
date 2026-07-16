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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T, CTA_GRADIENT, glow, lift } from '@/shared/theme'

// — Card: base translucent surface with a soft hairline —
export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      className={`bg-surface border border-hairline-2 rounded-3xl ${className}`}
      style={style}
    >
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: radius, opacity: pressed ? 0.88 : 1 },
        !disabled && glow(0.35, 10),
      ]}
    >
      <LinearGradient
        colors={disabled ? ['rgba(48,224,106,0.28)', 'rgba(25,196,85,0.28)'] : [...CTA_GRADIENT]}
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
          <Text
            style={{
              color: disabled ? 'rgba(4,35,15,0.75)' : T.ink,
              fontSize,
              fontWeight: '800',
              letterSpacing: 0.2,
            }}
          >
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

// — IconWell: soft accent-tinted circle-square behind an icon —
export function IconWell({
  children,
  size = 46,
  className = '',
}: {
  children: ReactNode
  size?: number
  className?: string
}) {
  return (
    <View
      className={`bg-well items-center justify-center ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.36 }}
    >
      {children}
    </View>
  )
}

import { useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T } from '@/shared/theme'
import { Card } from '@/shared/components/ui/Kit'
import { CrownIcon } from '@/shared/components/ui/Icons'

// Mock Leaderboard Data
const LEADERBOARD_WEEKLY = [
  { rank: 1, name: 'sofiaplantas', trees: 28, points: 1420, active: false, initials: 'SP' },
  { rank: 2, name: 'alejandro_verde', trees: 24, points: 1280, active: false, initials: 'AV' },
  { rank: 3, name: 'tarquibrian', trees: 18, points: 1140, active: true, initials: 'TB' }, // Current User
  { rank: 4, name: 'carla.eco', trees: 15, points: 950, active: false, initials: 'CE' },
  { rank: 5, name: 'lucas_arbol', trees: 12, points: 820, active: false, initials: 'LA' },
  { rank: 6, name: 'mariana_valle', trees: 10, points: 740, active: false, initials: 'MV' },
  { rank: 7, name: 'cochala_green', trees: 8, points: 610, active: false, initials: 'CG' },
]

const LEADERBOARD_ALL_TIME = [
  { rank: 1, name: 'sofiaplantas', trees: 245, points: 12450, active: false, initials: 'SP' },
  { rank: 2, name: 'cochala_green', trees: 198, points: 9890, active: false, initials: 'CG' },
  { rank: 3, name: 'alejandro_verde', trees: 184, points: 9280, active: false, initials: 'AV' },
  { rank: 4, name: 'tarquibrian', trees: 142, points: 7140, active: true, initials: 'TB' }, // Current User
  { rank: 5, name: 'carla.eco', trees: 95, points: 4750, active: false, initials: 'CE' },
  { rank: 6, name: 'lucas_arbol', trees: 72, points: 3620, active: false, initials: 'LA' },
  { rank: 7, name: 'mariana_valle', trees: 50, points: 2500, active: false, initials: 'MV' },
]

// Podium accents — metal tint per position, kept translucent to stay in-theme
const PODIUM = {
  1: { height: 148, ring: 'rgba(255,176,32,0.75)', tint: 'rgba(255,176,32,0.16)', label: T.gold },
  2: { height: 108, ring: 'rgba(199,206,214,0.55)', tint: 'rgba(199,206,214,0.10)', label: T.silver },
  3: { height: 88, ring: 'rgba(208,138,78,0.55)', tint: 'rgba(208,138,78,0.12)', label: T.bronze },
} as const

export default function RankingScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly')

  const list = tab === 'weekly' ? LEADERBOARD_WEEKLY : LEADERBOARD_ALL_TIME
  const podium = list.slice(0, 3)
  const remaining = list.slice(3)

  // Order podium for visual rendering: 2nd on left, 1st in center, 3rd on right
  const visualPodium = [podium[1], podium[0], podium[2]]

  return (
    <View className="flex-1 bg-canvas">
      <ScreenBackground />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 104,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-[22px] mb-6">
          <Text className="text-body text-[26px] font-extrabold" style={{ letterSpacing: -0.5 }}>
            Tabla de Posiciones
          </Text>
          <Text className="text-muted text-sm mt-1.5 leading-5">
            Conoce a los máximos protectores del arbolado de Cochabamba
          </Text>
        </View>

        {/* Weekly / All-time segmented control */}
        <View className="px-[22px] mb-8">
          <View className="flex-row bg-surface border border-hairline-2 rounded-2xl p-1">
            {([['weekly', 'Semanal'], ['alltime', 'Histórico']] as const).map(([key, label]) => {
              const active = tab === key
              return (
                <Pressable key={key} onPress={() => setTab(key)} className="flex-1">
                  {active ? (
                    <LinearGradient
                      colors={[T.bright, T.brightDeep]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{ borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}
                    >
                      <Text className="font-extrabold text-sm text-ink">{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View className="py-[11px] items-center">
                      <Text className="font-bold text-sm text-muted">{label}</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Podium */}
        <View className="flex-row items-end justify-center px-[22px] mb-8">
          {visualPodium.map((user) => {
            if (!user) return null
            const p = PODIUM[user.rank as 1 | 2 | 3]
            return (
              <View key={user.name} className="items-center mx-1.5 flex-1">
                {user.rank === 1 && (
                  <View className="mb-1.5">
                    <CrownIcon size={18} color={T.gold} />
                  </View>
                )}

                {/* Avatar */}
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{
                    backgroundColor: p.tint,
                    borderWidth: 1.5,
                    borderColor: p.ring,
                  }}
                >
                  <Text className="text-sm font-extrabold" style={{ color: user.rank === 1 ? T.gold : T.text }}>
                    {user.initials}
                  </Text>
                </View>

                <Text className="text-body text-xs font-bold text-center w-20 mb-0.5" numberOfLines={1}>
                  {user.active ? 'Tú' : `@${user.name}`}
                </Text>
                <Text className="text-leaf text-[10px] font-bold mb-2.5">{user.points} pts</Text>

                {/* Pillar — translucent gradient fading into the background */}
                <LinearGradient
                  colors={[p.tint, 'rgba(255,255,255,0.015)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{
                    width: '100%',
                    height: p.height,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text className="text-2xl font-extrabold" style={{ color: p.label, letterSpacing: -0.5 }}>
                    {user.rank}
                  </Text>
                  <Text className="text-faint text-[10px] mt-1 font-semibold">
                    {user.trees} {user.trees === 1 ? 'árbol' : 'árboles'}
                  </Text>
                </LinearGradient>
              </View>
            )
          })}
        </View>

        {/* Remaining list */}
        <View className="px-[22px]">
          {remaining.map((user) => (
            <Card
              key={user.name}
              className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${
                user.active ? 'bg-well border-hairline' : ''
              }`}
            >
              <View className="flex-row items-center">
                <Text className="text-faint font-bold text-sm w-6 text-center">{user.rank}</Text>
                <View className="w-10 h-10 rounded-full bg-surface-hi items-center justify-center mx-3">
                  <Text className="text-xs font-bold text-body">{user.initials}</Text>
                </View>
                <View>
                  <Text className="text-body font-bold text-sm">
                    {user.active ? 'Tú' : `@${user.name}`}
                  </Text>
                  <Text className="text-muted text-xs mt-0.5">
                    {user.trees} árboles registrados
                  </Text>
                </View>
              </View>

              <Text className="text-leaf font-extrabold text-sm">{user.points} pts</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

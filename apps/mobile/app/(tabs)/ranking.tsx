import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { UserIcon } from '@/shared/components/ui/Icons'

// Mock Leaderboard Data
const LEADERBOARD_WEEKLY = [
  { rank: 1, name: 'sofiaplantas', trees: 28, points: 1420, active: false, initials: 'SP', color: '#ffb020' },
  { rank: 2, name: 'alejandro_verde', trees: 24, points: 1280, active: false, initials: 'AV', color: '#9ca3af' },
  { rank: 3, name: 'tarquibrian', trees: 18, points: 1140, active: true, initials: 'TB', color: '#2fe06a' }, // Current User
  { rank: 4, name: 'carla.eco', trees: 15, points: 950, active: false, initials: 'CE', color: '#16a34a' },
  { rank: 5, name: 'lucas_arbol', trees: 12, points: 820, active: false, initials: 'LA', color: '#15803d' },
  { rank: 6, name: 'mariana_valle', trees: 10, points: 740, active: false, initials: 'MV', color: '#14532d' },
  { rank: 7, name: 'cochala_green', trees: 8, points: 610, active: false, initials: 'CG', color: '#0d2419' },
]

const LEADERBOARD_ALL_TIME = [
  { rank: 1, name: 'sofiaplantas', trees: 245, points: 12450, active: false, initials: 'SP', color: '#ffb020' },
  { rank: 2, name: 'cochala_green', trees: 198, points: 9890, active: false, initials: 'CG', color: '#ffb020' },
  { rank: 3, name: 'alejandro_verde', trees: 184, points: 9280, active: false, initials: 'AV', color: '#9ca3af' },
  { rank: 4, name: 'tarquibrian', trees: 142, points: 7140, active: true, initials: 'TB', color: '#2fe06a' }, // Current User
  { rank: 5, name: 'carla.eco', trees: 95, points: 4750, active: false, initials: 'CE', color: '#16a34a' },
  { rank: 6, name: 'lucas_arbol', trees: 72, points: 3620, active: false, initials: 'LA', color: '#15803d' },
  { rank: 7, name: 'mariana_valle', trees: 50, points: 2500, active: false, initials: 'MV', color: '#14532d' },
]

export default function RankingScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly')

  const list = tab === 'weekly' ? LEADERBOARD_WEEKLY : LEADERBOARD_ALL_TIME
  const podium = list.slice(0, 3)
  const remaining = list.slice(3)

  // Order podium for visual rendering: 2nd on left, 1st in center, 3rd on right
  const visualPodium = [
    podium[1], // 2nd Place
    podium[0], // 1st Place
    podium[2], // 3rd Place
  ]

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 mb-6">
          <Text className="text-white text-2xl font-bold font-sans">Tabla de Posiciones</Text>
          <Text className="text-gray-400 text-sm mt-1">Conoce a los máximos protectores del arbolado de Cochabamba</Text>
        </View>

        {/* Weekly / All Time Toggle */}
        <View className="px-5 mb-8">
          <View className="flex-row bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-1">
            <TouchableOpacity
              onPress={() => setTab('weekly')}
              className={`flex-1 py-3 rounded-xl items-center ${
                tab === 'weekly' ? 'bg-[#2fe06a]' : ''
              }`}
            >
              <Text className={`font-bold text-sm ${tab === 'weekly' ? 'text-[#04230f]' : 'text-gray-400'}`}>
                Semanal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTab('alltime')}
              className={`flex-1 py-3 rounded-xl items-center ${
                tab === 'alltime' ? 'bg-[#2fe06a]' : ''
              }`}
            >
              <Text className={`font-bold text-sm ${tab === 'alltime' ? 'text-[#04230f]' : 'text-gray-400'}`}>
                Histórico
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Visually Stunning Podium */}
        <View className="flex-row items-end justify-center px-5 mb-8 h-56">
          {visualPodium.map((user, idx) => {
            if (!user) return null
            const isFirst = user.rank === 1
            const isSecond = user.rank === 2
            const isThird = user.rank === 3

            let heightClass = 'h-32'
            let bgPodium = 'bg-green-950/40 border-green-900/30'
            let trophyColor = 'text-gray-400'
            let borderProfile = 'border-gray-500'

            if (isFirst) {
              heightClass = 'h-40'
              bgPodium = 'bg-green-900/50 border-[#2fe06a]/30'
              trophyColor = 'text-[#ffb020]'
              borderProfile = 'border-[#ffb020]'
            } else if (isSecond) {
              heightClass = 'h-28'
              bgPodium = 'bg-green-950/30 border-gray-700/30'
              trophyColor = 'text-gray-300'
              borderProfile = 'border-gray-300'
            } else if (isThird) {
              heightClass = 'h-24'
              bgPodium = 'bg-green-950/20 border-orange-900/30'
              trophyColor = 'text-amber-600'
              borderProfile = 'border-amber-600'
            }

            return (
              <View key={user.name} className="items-center mx-2 flex-1">
                {/* Profile bubble with custom initials */}
                <View
                  className={`w-14 h-14 rounded-full border-2 ${borderProfile} items-center justify-center bg-[#0d2419] mb-2`}
                >
                  <Text className={`text-sm font-black ${isFirst ? 'text-[#ffb020]' : 'text-white'}`}>
                    {user.initials}
                  </Text>
                  {isFirst && (
                    <View className="absolute -top-5">
                      <Text style={{ fontSize: 13, color: '#ffb020', fontWeight: 'bold' }}>⭐</Text>
                    </View>
                  )}
                </View>

                <Text className="text-white text-xs font-bold text-center w-20 mb-1" numberOfLines={1}>
                  {user.active ? 'Tú' : `@${user.name}`}
                </Text>
                <Text className="text-[#2fe06a] text-[10px] font-bold mb-2">
                  {user.points} pts
                </Text>

                {/* Podium pillar */}
                <View className={`w-full ${heightClass} ${bgPodium} border-t border-x rounded-t-2xl items-center justify-center`}>
                  <Text className={`text-2xl font-extrabold ${trophyColor}`}>
                    {user.rank}
                  </Text>
                  <Text className="text-gray-400 text-[10px] mt-1 font-semibold">
                    {user.trees} {user.trees === 1 ? 'árbol' : 'árboles'}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Scrollable Leaderboard List */}
        <View className="px-5">
          {remaining.map((user) => (
            <View
              key={user.name}
              className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 border ${
                user.active
                  ? 'bg-[#122e20] border-[#2fe06a]/30'
                  : 'bg-[#0d2419] border-[#2fe06a]/10'
              }`}
            >
              <View className="flex-row items-center">
                <Text className="text-gray-400 font-bold text-sm w-6 text-center">{user.rank}</Text>
                <View className="w-10 h-10 rounded-full bg-[#122e20] border border-green-900 items-center justify-center mx-3">
                  <Text className="text-xs font-bold text-white">{user.initials}</Text>
                </View>
                <View>
                  <Text className="text-white font-bold text-sm">
                    {user.active ? 'Tú' : `@${user.name}`}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {user.trees} árboles registrados
                  </Text>
                </View>
              </View>

              <Text className="text-[#2fe06a] font-extrabold text-sm">{user.points} pts</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

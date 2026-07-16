import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMyStats } from '@/features/profile/api'
import {
  WalletIcon,
  LeafIcon,
  SearchIcon,
  CoffeeIcon,
  BikeIcon,
} from '@/shared/components/ui/Icons'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const statsQ = useQuery({ queryKey: ['myStats'], queryFn: getMyStats })
  const s = statsQ.data
  const rank = 'Guardián del Valle'
  const inLevel = s ? s.points - s.levelFloor : 0
  const levelSpan = s ? s.nextLevelAt - s.levelFloor : 100
  const progress = s ? inLevel / levelSpan : 0

  const dailyMissions = [
    {
      id: 'm1',
      title: 'Mapeador Iniciado',
      desc: 'Mapea 1 árbol nuevo en tu zona',
      reward: '50 AC',
      completed: false,
      Icon: LeafIcon,
    },
    {
      id: 'm2',
      title: 'Ojo de Halcón',
      desc: 'Verifica 2 árboles en Queru Queru',
      reward: '30 AC',
      completed: true,
      Icon: SearchIcon,
    },
  ]

  const featuredStores = [
    {
      id: 's1',
      name: 'Café Cocha',
      discount: '1 Café Express gratis',
      price: '150 AC',
      Icon: CoffeeIcon,
    },
    {
      id: 's2',
      name: 'BiciCochala',
      discount: '1 hora de alquiler',
      price: '200 AC',
      Icon: BikeIcon,
    },
  ]

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-gray-400 text-sm font-medium">¡Hola de nuevo!</Text>
            <Text className="text-white text-2xl font-bold font-sans">@{s?.username ?? '…'}</Text>
          </View>
          <View className="bg-[#123020] border border-white/[0.06] rounded-full px-3.5 py-2 flex-row items-center">
            <View className="mr-1.5">
              <WalletIcon size={16} color="#2fe06a" />
            </View>
            <Text className="text-white font-bold text-sm">{s?.coins ?? 0} AC</Text>
          </View>
        </View>

        {/* User Level Card */}
        <View
          className="bg-[#123020] rounded-3xl p-5 mb-6"
          style={{ shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-[#7fd6a0] text-xs font-bold tracking-widest uppercase">{rank}</Text>
              <Text className="text-white text-lg font-bold mt-0.5">Nivel {s?.level ?? 1}</Text>
            </View>
            <View className="bg-[#2fe06a]/[0.12] rounded-full px-3 py-1">
              <Text className="text-[#7fd6a0] text-xs font-bold">{s?.points ?? 0} pts</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="h-2 w-full bg-black/30 rounded-full overflow-hidden mb-2">
            <View className="h-full bg-[#2fe06a] rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[#8aa596] text-xs">{inLevel} / {levelSpan} pts</Text>
            <Text className="text-[#8aa596] text-xs">{levelSpan - inLevel} pts para Nivel {(s?.level ?? 1) + 1}</Text>
          </View>
        </View>

        {/* Quick actions direct links */}
        <View className="flex-row gap-4 mb-6">
          <TouchableOpacity
            className="flex-1 bg-[#0e2418] rounded-2xl p-4 items-center"
            activeOpacity={0.85}
            onPress={() => router.push('/tree/new')}
          >
            <View className="bg-[#2fe06a]/[0.12] w-12 h-12 rounded-2xl items-center justify-center mb-2">
              <LeafIcon size={24} color="#2fe06a" />
            </View>
            <Text className="text-white font-bold text-sm">Mapear Árbol</Text>
            <Text className="text-[#8aa596] text-xs mt-1 text-center">Registrar ejemplar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-[#0e2418] rounded-2xl p-4 items-center"
            activeOpacity={0.85}
            onPress={() => router.push('/tree/verify')}
          >
            <View className="bg-[#2fe06a]/[0.12] w-12 h-12 rounded-2xl items-center justify-center mb-2">
              <SearchIcon size={24} color="#2fe06a" />
            </View>
            <Text className="text-white font-bold text-sm">Verificar Árbol</Text>
            <Text className="text-[#8aa596] text-xs mt-1 text-center">Validación 1+3</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Missions */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-lg font-bold">Misiones Diarias</Text>
            <Text className="text-[#6cc78f] text-xs font-bold">Actualiza en 12h</Text>
          </View>

          {dailyMissions.map((mission) => (
            <View
              key={mission.id}
              className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${
                mission.completed
                  ? 'bg-[#0e2418]/50 opacity-60'
                  : 'bg-[#0e2418]'
              }`}
            >
              <View className="flex-row items-center flex-1 pr-4">
                <View className="mr-3">
                  <mission.Icon size={22} color={mission.completed ? '#9ca3af' : '#2fe06a'} />
                </View>
                <View className="flex-1">
                  <Text className={`font-bold text-sm ${mission.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {mission.title}
                  </Text>
                  <Text className="text-[#8aa596] text-xs mt-0.5" numberOfLines={1}>
                    {mission.desc}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <View className={`px-2.5 py-1 rounded-full ${mission.completed ? 'bg-green-950/40' : 'bg-green-900/40'}`}>
                  <Text className={`text-xs font-bold ${mission.completed ? 'text-gray-400' : 'text-[#2fe06a]'}`}>
                    {mission.completed ? 'Completado ✓' : `+${mission.reward}`}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Featured Green Rewards */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-lg font-bold">Recompensas Destacadas</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/rewards')}>
              <Text className="text-[#6cc78f] text-xs font-bold">Ver catálogo</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-4">
            {featuredStores.map((store) => (
              <View
                key={store.id}
                className="flex-1 bg-[#0e2418] rounded-2xl p-4"
              >
                <View className="bg-[#2fe06a]/[0.12] w-10 h-10 rounded-xl items-center justify-center mb-3">
                  <store.Icon size={20} color="#2fe06a" />
                </View>
                <Text className="text-white font-bold text-sm" numberOfLines={1}>
                  {store.name}
                </Text>
                <Text className="text-[#8aa596] text-xs mt-0.5" numberOfLines={1}>
                  {store.discount}
                </Text>
                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-white/[0.05]">
                  <Text className="text-[#7fd6a0] font-bold text-xs">{store.price}</Text>
                  <TouchableOpacity
                    className="bg-[#2fe06a] px-2.5 py-1 rounded-lg"
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/rewards')}
                  >
                    <Text className="text-[#04230f] font-bold text-[10px]">Canjear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Novedades / Comunidad */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">Noticias Verdes</Text>
          <View className="bg-[#0e2418] rounded-2xl p-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-[#7fd6a0] text-xs font-bold bg-[#2fe06a]/[0.12] px-2.5 py-0.5 rounded-full mr-2">Cochabamba</Text>
              <Text className="text-[#8aa596] text-xs">Ayer</Text>
            </View>
            <Text className="text-white font-bold text-sm mb-1">Campaña de reforestación masiva en la zona norte</Text>
            <Text className="text-[#8aa596] text-xs leading-5">
              Esta semana la comunidad de Arbu Games ha validado más de 120 nuevos Jacarandás en Queru Queru. ¡Felicidades a todos los Guardianes!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

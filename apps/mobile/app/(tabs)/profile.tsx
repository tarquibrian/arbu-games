import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMyStats, type MyStats } from '@/features/profile/api'
import {
  UserIcon,
  LeafIcon,
  SearchIcon,
  CO2Icon,
  BoltIcon,
  TrophyIcon,
  TicketIcon,
  LockIcon,
} from '@/shared/components/ui/Icons'

// Insignias derivadas de contadores reales (sin schema nuevo). Las de racha/ranking
// quedan bloqueadas hasta construir esas capas (13.6 Fase 2).
function buildBadges(s: MyStats) {
  return [
    { id: 'b1', name: 'Primer Brote', desc: 'Mapea tu 1er árbol', Icon: LeafIcon, unlocked: s.mapped >= 1 },
    { id: 'b2', name: 'Inspector Verde', desc: 'Realiza 10 verificaciones', Icon: SearchIcon, unlocked: s.validated >= 10 },
    { id: 'b3', name: 'Guardián Activo', desc: 'Mantén una racha de 7 días', Icon: BoltIcon, unlocked: false },
    { id: 'b4', name: 'Eco Héroe', desc: 'Llega al top 3 semanal', Icon: TrophyIcon, unlocked: false },
    { id: 'b5', name: 'Silvicultor', desc: 'Mapea 50 árboles', Icon: LeafIcon, unlocked: s.mapped >= 50 },
    { id: 'b6', name: 'Oro Verde', desc: 'Canjea 5 recompensas', Icon: TicketIcon, unlocked: s.redemptions >= 5 },
  ]
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const statsQ = useQuery({ queryKey: ['myStats'], queryFn: getMyStats })

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const s = statsQ.data
  const joined = s ? `Miembro desde ${MONTHS[new Date(s.createdAt).getMonth()]} ${new Date(s.createdAt).getFullYear()}` : ''
  const badges = s ? buildBadges(s) : []

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
        {/* Header */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-[#122e20] border-2 border-[#2fe06a] items-center justify-center mb-3 shadow-lg">
            <UserIcon size={36} color="#2fe06a" />
          </View>
          <Text className="text-white text-xl font-bold font-sans">@{s?.username ?? '…'}</Text>
          {s ? (
            <Text className="text-[#2fe06a] text-xs font-bold mt-1">Nivel {s.level} · {s.points} pts</Text>
          ) : null}
          {joined ? (
            <Text className="text-[#2fe06a] text-[10px] font-bold mt-2.5 uppercase tracking-widest bg-[#2fe06a]/10 px-3 py-1 rounded-full">
              {joined}
            </Text>
          ) : null}
        </View>

        {/* Stats Grid */}
        {statsQ.isLoading ? (
          <View className="items-center py-8 mb-8"><ActivityIndicator color="#2fe06a" /></View>
        ) : (
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-4 items-center shadow-sm">
              <LeafIcon size={28} color="#2fe06a" />
              <Text className="text-white text-xl font-extrabold mt-1.5">{s?.mapped ?? 0}</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">Mapeados</Text>
            </View>
            <View className="flex-1 bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-4 items-center shadow-sm">
              <SearchIcon size={28} color="#2fe06a" />
              <Text className="text-white text-xl font-extrabold mt-1.5">{s?.validated ?? 0}</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">Verificados</Text>
            </View>
            <View className="flex-1 bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-4 items-center shadow-sm">
              <CO2Icon size={28} color="#2fe06a" />
              <Text className="text-white text-xl font-extrabold mt-1.5">{s?.co2Kg ?? 0} kg</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">CO2 estim.</Text>
            </View>
          </View>
        )}

        {/* Badges / Medals Section */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Mis Logros e Insignias</Text>

          <View className="flex-row flex-wrap gap-4 justify-between">
            {badges.map((badge) => (
              <View
                key={badge.id}
                className={`w-[47%] bg-[#0d2419] border rounded-2xl p-4 items-center ${
                  badge.unlocked
                    ? 'border-[#2fe06a]/20'
                    : 'border-green-950/20 opacity-50'
                }`}
              >
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
                    badge.unlocked ? 'bg-[#122e20]' : 'bg-gray-900/60'
                  }`}
                >
                  {badge.unlocked ? (
                    <badge.Icon size={22} color="#2fe06a" />
                  ) : (
                    <LockIcon size={20} color="#9ca3af" />
                  )}
                </View>
                <Text
                  className={`font-bold text-center text-xs ${
                    badge.unlocked ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {badge.name}
                </Text>
                <Text className="text-gray-400 text-[9px] text-center mt-1 leading-4">
                  {badge.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Configuration Shortcuts */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-4 mb-8">
          <TouchableOpacity className="flex-row justify-between items-center py-2.5 border-b border-green-950">
            <Text className="text-white text-sm font-semibold">Editar Perfil</Text>
            <Text className="text-gray-400">➡️</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row justify-between items-center py-2.5 border-b border-green-950">
            <Text className="text-white text-sm font-semibold">Historial de Transacciones</Text>
            <Text className="text-gray-400">➡️</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row justify-between items-center py-2.5">
            <Text className="text-white text-sm font-semibold">Términos y Privacidad</Text>
            <Text className="text-gray-400">➡️</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="border border-red-500/30 bg-red-950/10 rounded-xl py-4 items-center mb-8"
          onPress={handleSignOut}
        >
          <Text className="text-red-500 font-bold text-sm">Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { goBack } from '@/shared/lib/navigation'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { ScreenHeader } from '@/shared/components/ui/ScreenHeader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LeafIcon } from '@/shared/components/ui/Icons'

export default function TreeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // Mock tree data based on ID
  const tree = {
    id: id || '1',
    species: 'Jacarandá (Brotes jóvenes)',
    dap: '12 cm',
    reporter: '@sofiaplantas',
    health: 'Bueno',
    healthColor: 'bg-green-500',
    status: 'Pendiente (2/3)',
    coords: '-17.37894, -66.15492',
    date: 'Mapeado el 25/05/2026',
  }

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScreenHeader title="Detalle del Árbol" subtitle={tree.species} onBack={goBack} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tree Icon & Title Card */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/20 rounded-3xl p-6 items-center mb-6 shadow-sm">
          <View className="bg-[#122e20] w-20 h-20 rounded-full items-center justify-center mb-4 border border-green-900">
            <LeafIcon size={36} color="#2fe06a" />
          </View>
          <Text className="text-white text-lg font-bold text-center">{tree.species}</Text>
          <Text className="text-gray-400 text-xs mt-1">Registrado por {tree.reporter}</Text>
          <View className="mt-3 px-3 py-1 rounded-full bg-green-900/30 border border-[#2fe06a]/10">
            <Text className="text-[#2fe06a] text-xs font-semibold">{tree.status}</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5 mb-6">
          <Text className="text-white text-sm font-bold mb-4">Información Forestal</Text>

          <View className="gap-3.5">
            <View className="flex-row justify-between pb-3 border-b border-green-950">
              <Text className="text-gray-400 text-xs">Diámetro (DAP):</Text>
              <Text className="text-white text-xs font-bold">{tree.dap}</Text>
            </View>
            <View className="flex-row justify-between pb-3 border-b border-green-950">
              <Text className="text-gray-400 text-xs">Salud Fitosanitaria:</Text>
              <View className="flex-row items-center">
                <View className={`w-2.5 h-2.5 rounded-full mr-1.5 ${tree.healthColor}`} />
                <Text className="text-white text-xs font-bold">{tree.health}</Text>
              </View>
            </View>
            <View className="flex-row justify-between pb-3 border-b border-green-950">
              <Text className="text-gray-400 text-xs">Coordenadas:</Text>
              <Text className="text-white text-xs font-mono text-[10px]">{tree.coords}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-400 text-xs">Fecha de Registro:</Text>
              <Text className="text-white text-xs font-semibold">{tree.date}</Text>
            </View>
          </View>
        </View>

        {/* Community Actions */}
        <TouchableOpacity
          className="bg-[#2fe06a] rounded-xl py-3.5 items-center mb-3"
          onPress={() => router.push('/tree/verify')}
        >
          <Text className="text-[#04230f] font-bold text-sm">Verificar este Árbol</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-transparent border border-green-950 rounded-xl py-3.5 items-center"
          onPress={goBack}
        >
          <Text className="text-gray-300 text-sm">Volver</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { goBack } from '@/shared/lib/navigation'
import { useQuery } from '@tanstack/react-query'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { ScreenHeader } from '@/shared/components/ui/ScreenHeader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { listAllTrees, type ExploreTree } from '@/features/trees/api'
import { LeafIcon } from '@/shared/components/ui/Icons'
import { MapPin } from '@/shared/components/ui/MapPin'
import { StatTile } from '@/shared/components/ui/StatTile'
import { CO2_PER_TREE_KG } from '@/features/profile/api'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const HEALTH_ES: Record<string, { label: string; dot: string }> = {
  good: { label: 'Bueno', dot: 'bg-green-500' },
  regular: { label: 'Regular', dot: 'bg-yellow-500' },
  poor: { label: 'Pobre', dot: 'bg-orange-500' },
  dead: { label: 'Muerto', dot: 'bg-red-500' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ExploreTreesScreen() {
  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<ExploreTree | null>(null)

  const treesQ = useQuery({ queryKey: ['allTrees'], queryFn: listAllTrees })
  const trees = treesQ.data ?? []

  // Stats agregados de la población mostrada — sin esto la pantalla es solo un mapa
  // vacío hasta que tocás un marker; acá se ve de un vistazo qué tan activa/diversa
  // es la comunidad sin tener que ir árbol por árbol.
  const stats = useMemo(() => {
    const weekAgo = Date.now() - WEEK_MS
    const species = new Set(trees.map((t) => t.species_name).filter(Boolean))
    return {
      total: trees.length,
      species: species.size,
      validated: trees.filter((t) => t.status === 'validated').length,
      newThisWeek: trees.filter((t) => new Date(t.created_at).getTime() >= weekAgo).length,
      co2Kg: trees.length * CO2_PER_TREE_KG,
    }
  }, [trees])

  const region = selected
    ? { latitude: selected.latitude, longitude: selected.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
    : trees.length > 0
      ? { latitude: trees[0].latitude, longitude: trees[0].longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }
      : { latitude: -17.38, longitude: -66.155, latitudeDelta: 0.04, longitudeDelta: 0.04 }

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScreenHeader
        title="Explorar Árboles"
        subtitle={treesQ.isLoading ? 'Cargando…' : `${trees.length} árbol${trees.length === 1 ? '' : 'es'} registrado${trees.length === 1 ? '' : 's'}`}
        onBack={goBack}
      />

      <View className="flex-1 relative">
        <MapView style={{ flex: 1 }} region={region} showsPointsOfInterests={false}>
          {trees.map((tree) => {
            const validated = tree.status === 'validated'
            return (
              <Marker
                key={tree.id}
                coordinate={{ latitude: tree.latitude, longitude: tree.longitude }}
                onPress={() => setSelected(tree)}
              >
                {/* El marker representa "acá hay un árbol": una hoja, coloreada por
                    estado. El detalle de verificaciones vive en la ficha, no acá —
                    esta pantalla es para conocer árboles, no para trackear su progreso. */}
                <MapPin size={34} color={validated ? '#2fe06a' : '#fbbf24'}>
                  <LeafIcon size={14} color={validated ? '#04230f' : '#5c3a00'} />
                </MapPin>
              </Marker>
            )
          })}
        </MapView>

        {/* Empty state */}
        {!treesQ.isLoading && trees.length === 0 && !selected && (
          <View className="absolute top-6 left-5 right-5 bg-[#0d2419] border border-[#2fe06a]/20 rounded-2xl p-4">
            <Text className="text-white text-sm font-bold text-center">Todavía no hay árboles registrados</Text>
            <Text className="text-gray-400 text-xs text-center mt-1">Sé el primero en mapear uno.</Text>
          </View>
        )}

        {/* Stats de la comunidad — el total ya está en el header, acá va lo que no se
            ve de un vistazo en el mapa. */}
        {!treesQ.isLoading && trees.length > 0 && !selected && (
          <View
            className="absolute bottom-0 left-0 right-0 bg-[#0d2419]/95 border-t border-[#2fe06a]/20 px-4 pt-3.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-row">
              <StatTile value={stats.species} label="Especies" />
              <StatTile value={stats.validated} label="Validados" color="#2fe06a" />
              <StatTile value={stats.newThisWeek} label="Esta semana" />
              <StatTile value={`${stats.co2Kg}kg`} label="CO2 estim." />
            </View>
          </View>
        )}

        {/* Detalle del árbol seleccionado — solo consulta, sin acción */}
        {selected && (
          <View className="absolute bottom-0 left-0 right-0 bg-[#0d2419] border-t border-x border-[#2fe06a]/25 rounded-t-3xl p-5 shadow-2xl z-20" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-bold flex-1 pr-3">{selected.species_name ?? 'Especie desconocida'}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} className="bg-[#122e20] w-7 h-7 rounded-full items-center justify-center border border-green-950">
                <Text className="text-gray-400 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row">
              {selected.photo_url ? (
                <Image source={{ uri: selected.photo_url }} className="w-20 h-20 rounded-xl mr-4" resizeMode="cover" />
              ) : null}

              <View className="bg-[#122e20] border border-green-950 rounded-2xl p-4 flex-1">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-xs">DAP:</Text>
                  <Text className="text-white text-xs font-bold">{selected.dap} cm</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-xs">Salud:</Text>
                  <View className="flex-row items-center">
                    <View className={`w-2.5 h-2.5 rounded-full mr-1.5 ${HEALTH_ES[selected.health]?.dot ?? 'bg-gray-500'}`} />
                    <Text className="text-white text-xs font-bold">{HEALTH_ES[selected.health]?.label ?? selected.health}</Text>
                  </View>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-xs">Origen:</Text>
                  <Text className="text-white text-xs font-bold">
                    {selected.origin === 'planted'
                      ? `Plantado${selected.planted_date ? ' · ' + formatDate(selected.planted_date) : ''}`
                      : 'Existente'}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-2 mt-1 border-t border-green-950/60">
                  <Text className="text-gray-500 text-[11px]">Estado:</Text>
                  {selected.status === 'validated' ? (
                    <Text className="text-gray-400 text-[11px]">Validado ✓</Text>
                  ) : (
                    <Text className="text-gray-400 text-[11px]">{selected.validations_count}/3 verificaciones</Text>
                  )}
                </View>
              </View>
            </View>

            <Text className="text-gray-500 text-[11px] text-center mt-3">
              Registrado el {formatDate(selected.created_at)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

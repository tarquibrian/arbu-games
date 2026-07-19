import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native'
import { goBack } from '@/shared/lib/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { ScreenHeader } from '@/shared/components/ui/ScreenHeader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { CameraIcon, CheckIcon, LeafIcon } from '@/shared/components/ui/Icons'
import { MapPin } from '@/shared/components/ui/MapPin'
import { StatTile } from '@/shared/components/ui/StatTile'
import {
  listPendingTrees,
  createValidation,
  uploadTreePhoto,
  type PendingTree,
} from '@/features/trees/api'
import { requestTreePhotoPermission, launchTreePhotoCapture } from '@/features/trees/photoSource'

const HEALTH_ES: Record<string, { label: string; dot: string }> = {
  good: { label: 'Bueno', dot: 'bg-green-500' },
  regular: { label: 'Regular', dot: 'bg-yellow-500' },
  poor: { label: 'Pobre', dot: 'bg-orange-500' },
  dead: { label: 'Muerto', dot: 'bg-red-500' },
}

type Result = { validated: boolean; count: number }

export default function VerifyTreeScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<PendingTree | null>(null)
  const [step, setStep] = useState(1) // 1 detalle · 2 cámara · 3 éxito
  const [modalVisible, setModalVisible] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const treesQ = useQuery({ queryKey: ['pendingTrees'], queryFn: listPendingTrees })
  const trees = treesQ.data ?? []

  // Qué tan lejos está cada árbol de validarse — ayuda a decidir a cuál ir primero
  // (uno a 1 verificación es un "quick win": tu visita lo completa al toque).
  const stats = useMemo(() => {
    const actionable = trees.filter((t) => !t.isMine && !t.validatedByMe)
    return {
      almostThere: actionable.filter((t) => t.validations_count === 2).length,
      freshlyMapped: actionable.filter((t) => t.validations_count === 0).length,
      verifiedByMe: trees.filter((t) => t.validatedByMe).length,
    }
  }, [trees])

  const verifyM = useMutation({
    mutationFn: async ({ tree, base64 }: { tree: PendingTree; base64: string }) => {
      const photoUrl = await uploadTreePhoto(base64)
      return createValidation({ treeId: tree.id, photoUrl, health: tree.health })
    },
    onSuccess: (res) => {
      setResult({ validated: res.treeStatus === 'validated', count: res.validationsCount })
      setStep(3)
      qc.invalidateQueries({ queryKey: ['pendingTrees'] })
      qc.invalidateQueries({ queryKey: ['balance'] })
    },
    onError: (e: any) => {
      Alert.alert('No se pudo verificar', e?.message ?? 'Intenta de nuevo.')
      closeModal()
    },
  })

  const closeModal = () => { setModalVisible(false); setStep(1) }

  const startVerify = () => { setStep(2); setModalVisible(true) }

  const capturePhoto = async () => {
    if (!selected) return
    const perm = await requestTreePhotoPermission()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos la cámara para la foto de verificación.')
      return
    }
    try {
      const r = await launchTreePhotoCapture()
      if (r.canceled || !r.assets?.[0]?.base64) return
      verifyM.mutate({ tree: selected, base64: r.assets[0].base64 })
    } catch (e: any) {
      Alert.alert('Cámara no disponible', e?.message ?? 'No disponible en simulador.')
    }
  }

  const finish = () => { closeModal(); setSelected(null); setResult(null) }

  const region = selected
    ? { latitude: selected.latitude, longitude: selected.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
    : trees.length > 0
      ? { latitude: trees[0].latitude, longitude: trees[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : { latitude: -17.38, longitude: -66.155, latitudeDelta: 0.02, longitudeDelta: 0.02 }

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScreenHeader
        title="Monitorear y Verificar"
        subtitle={treesQ.isLoading ? 'Cargando árboles pendientes…' : `${trees.length} árbol${trees.length === 1 ? '' : 'es'} por verificar cerca`}
        onBack={goBack}
      />

      <View className="flex-1 relative">
        <MapView style={{ flex: 1 }} region={region} showsPointsOfInterests={false}>
          {trees.map((tree) => (
            <Marker
              key={tree.id}
              coordinate={{ latitude: tree.latitude, longitude: tree.longitude }}
              onPress={() => { setSelected(tree); setStep(1) }}
            >
              <MapPin size={34} color={tree.isMine ? '#2563eb' : tree.validatedByMe ? '#122e20' : '#2fe06a'}>
                {tree.isMine ? (
                  <LeafIcon size={14} color="#dbeafe" />
                ) : tree.validatedByMe ? (
                  <CheckIcon size={14} color="#2fe06a" />
                ) : (
                  <Text className="text-[9px] font-extrabold text-[#04230f]">{tree.validations_count}/3</Text>
                )}
              </MapPin>
            </Marker>
          ))}
        </MapView>

        {/* Empty state */}
        {!treesQ.isLoading && trees.length === 0 && !selected && (
          <View className="absolute top-6 left-5 right-5 bg-[#0d2419] border border-[#2fe06a]/20 rounded-2xl p-4">
            <Text className="text-white text-sm font-bold text-center">No hay árboles pendientes cerca</Text>
            <Text className="text-gray-400 text-xs text-center mt-1">Registra uno nuevo o vuelve más tarde.</Text>
          </View>
        )}

        {/* A dónde ir primero — sin esto el mapa no dice cuáles valen la pena visitar
            ni si ya aportaste algo. */}
        {!treesQ.isLoading && trees.length > 0 && !selected && (
          <View
            className="absolute bottom-0 left-0 right-0 bg-[#0d2419]/95 border-t border-[#2fe06a]/20 px-4 pt-3.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-row">
              <StatTile value={stats.almostThere} label="A 1 de validarse" color="#2fe06a" />
              <StatTile value={stats.freshlyMapped} label="Recién mapeados" color="#fbbf24" />
              <StatTile value={stats.verifiedByMe} label="Ya verificaste" />
            </View>
          </View>
        )}

        {/* Detalle del árbol seleccionado */}
        {selected && step === 1 && (
          <View className="absolute bottom-0 left-0 right-0 bg-[#0d2419] border-t border-x border-[#2fe06a]/25 rounded-t-3xl p-5 shadow-2xl z-20" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-bold">{selected.species_name ?? 'Especie desconocida'}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} className="bg-[#122e20] w-7 h-7 rounded-full items-center justify-center border border-green-950">
                <Text className="text-gray-400 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-[#122e20] border border-green-950 rounded-2xl p-4 mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400 text-xs">Progreso de validación:</Text>
                <Text className="text-[#2fe06a] text-xs font-bold">{selected.validations_count}/3 verificaciones</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400 text-xs">Diámetro (DAP):</Text>
                <Text className="text-white text-xs font-bold">{selected.dap} cm</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">Salud reportada:</Text>
                <View className="flex-row items-center">
                  <View className={`w-2.5 h-2.5 rounded-full mr-1.5 ${HEALTH_ES[selected.health]?.dot ?? 'bg-gray-500'}`} />
                  <Text className="text-white text-xs font-bold">{HEALTH_ES[selected.health]?.label ?? selected.health}</Text>
                </View>
              </View>
            </View>

            {selected.isMine ? (
              <View className="bg-blue-900/20 border border-blue-500/25 rounded-xl py-3.5 items-center flex-row justify-center gap-2">
                <LeafIcon size={16} color="#60a5fa" />
                <Text className="text-blue-400 font-bold text-sm">Es tu árbol — esperando otros verificadores</Text>
              </View>
            ) : selected.validatedByMe ? (
              <View className="bg-green-900/20 border border-[#2fe06a]/25 rounded-xl py-3.5 items-center flex-row justify-center gap-2">
                <CheckIcon size={16} color="#2fe06a" />
                <Text className="text-[#2fe06a] font-bold text-sm">Ya verificaste este árbol</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={startVerify} className="bg-[#2fe06a] w-full rounded-xl py-3.5 items-center shadow-md">
                  <Text className="text-[#04230f] font-extrabold text-sm">Validar en el Lugar</Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-[11px] text-center mt-2">Ganás 30 AC cuando el árbol llegue a 3 verificaciones.</Text>
              </>
            )}
          </View>
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View className="flex-1 bg-black/85 justify-end">
          <View className="bg-[#0d2419] border-t-2 border-x-2 border-[#2fe06a]/20 rounded-t-3xl p-6 pb-10">

            {step === 2 && (
              <View className="items-center">
                <Text className="text-white text-xl font-bold text-center mb-1">Foto de verificación</Text>
                <Text className="text-gray-400 text-xs text-center mb-6">Captura el árbol en vivo para corroborar su estado.</Text>

                <TouchableOpacity
                  onPress={capturePhoto}
                  disabled={verifyM.isPending}
                  className="bg-green-950/30 border-2 border-dashed border-[#2fe06a]/30 w-full h-48 rounded-2xl items-center justify-center my-4"
                >
                  {verifyM.isPending ? (
                    <>
                      <ActivityIndicator color="#2fe06a" />
                      <Text className="text-gray-300 text-xs mt-3">Subiendo y verificando…</Text>
                    </>
                  ) : (
                    <>
                      <View className="mb-2"><CameraIcon size={36} color="#2fe06a" /></View>
                      <Text className="text-white font-bold text-sm">Capturar foto</Text>
                      <Text className="text-gray-400 text-[10px] mt-1">Foto en vivo obligatoria</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity className="border border-green-950 w-full rounded-xl py-3.5 items-center mt-2" onPress={closeModal} disabled={verifyM.isPending}>
                  <Text className="text-gray-300 text-sm">Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && result && (
              <View className="items-center">
                <View className="bg-green-900/40 w-16 h-16 rounded-full items-center justify-center mb-4">
                  <CheckIcon size={32} color="#2fe06a" />
                </View>
                {result.validated ? (
                  <>
                    <Text className="text-white text-xl font-bold text-center">¡Árbol validado! 🎉</Text>
                    <Text className="text-gray-300 text-xs text-center mt-2 leading-5 px-4 mb-6">
                      Tu verificación fue la 3.ª — el árbol quedó <Text className="text-[#2fe06a] font-bold">Validado</Text>. Se repartieron 30 ArbuCoins entre los 4 participantes (vos incluido).
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-white text-xl font-bold text-center">Verificación registrada</Text>
                    <Text className="text-gray-300 text-xs text-center mt-2 leading-5 px-4 mb-6">
                      Progreso: <Text className="text-[#2fe06a] font-bold">{result.count}/3</Text>. Cuando llegue a 3, ganás 30 AC junto al resto.
                    </Text>
                  </>
                )}
                <TouchableOpacity className="bg-[#2fe06a] w-full rounded-xl py-3.5 items-center" onPress={finish}>
                  <Text className="text-[#04230f] font-bold text-sm">Cerrar y continuar</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </View>
  )
}

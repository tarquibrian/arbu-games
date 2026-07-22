import { useState, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
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
import { getFix, distanceMeters, formatDistance, type Fix } from '@/shared/lib/location'
import { appConfigQuery, DEFAULT_CONFIG } from '@/features/config/api'
import { speciesQuery } from '@/features/species/api'
import { HEALTH, HEIGHT_BANDS, SITE_CONTEXTS, CONFLICTS, URGENCIES } from '@/features/trees/vocab'
import {
  FieldLabel,
  OptionList,
  ChipGroup,
  CircumferenceInput,
  SpeciesPicker,
} from '@/features/trees/components/FormControls'
import type { Database } from '@/types/database.types'

type E = Database['public']['Enums']
type Shot = { uri: string; base64: string } | null
type Result = { validated: boolean; count: number; disputed: string[] }

// Nombres de campo → etiqueta, para contar el resultado del consenso.
const FIELD_LABEL: Record<string, string> = {
  species: 'especie',
  health: 'estado fitosanitario',
  circumference_cm: 'medida del tronco',
  height_band: 'altura',
  site_context: 'contexto',
  urgency: 'urgencia',
}

export default function VerifyTreeScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const { treeId } = useLocalSearchParams<{ treeId?: string }>()
  const [selected, setSelected] = useState<PendingTree | null>(null)
  const [step, setStep] = useState(1) // 1 detalle · 2 fotos · 3 ficha · 4 resultado
  const [modalVisible, setModalVisible] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [fix, setFix] = useState<Fix | null>(null)
  const [locating, setLocating] = useState(true)

  // Respuestas del verificador — arrancan VACÍAS a propósito. Prellenarlas con lo
  // que dijo el registrante convierte el consenso en un botón de "sí": si todos
  // confirman por inercia, la mayoría no mide nada (13.2).
  const [canopy, setCanopy] = useState<Shot>(null)
  const [trunk, setTrunk] = useState<Shot>(null)
  const [circumference, setCircumference] = useState('')
  const [health, setHealth] = useState<E['tree_health'] | null>(null)
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [speciesName, setSpeciesName] = useState<string | null>(null)
  const [heightBand, setHeightBand] = useState<E['tree_height_band'] | null>(null)
  const [siteContext, setSiteContext] = useState<E['tree_site_context'] | null>(null)
  const [conflicts, setConflicts] = useState<E['tree_conflict'][]>([])
  const [urgency, setUrgency] = useState<E['tree_urgency'] | null>(null)

  const treesQ = useQuery({ queryKey: ['pendingTrees'], queryFn: listPendingTrees })
  const trees = treesQ.data ?? []
  const cfg = useQuery(appConfigQuery).data ?? DEFAULT_CONFIG
  const species = useQuery(speciesQuery).data ?? []

  const locate = async () => {
    setLocating(true)
    setFix(await getFix())
    setLocating(false)
  }

  useEffect(() => { locate() }, [])

  // Llegada desde "¿es uno de estos?" en el registro: abrir ese árbol directamente.
  useEffect(() => {
    if (!treeId || selected) return
    const t = trees.find((x) => x.id === treeId)
    if (t) { setSelected(t); setStep(1) }
  }, [treeId, trees])

  // Distancia al árbol abierto — es lo que decide si se puede verificar.
  // El trigger (0006) valida lo mismo server-side; esto sólo evita que el usuario
  // saque la foto para nada.
  const distance = selected && fix ? distanceMeters(fix, selected) : null
  const inRange = distance != null && distance <= cfg.verifyRadiusM

  const circumferenceCm = parseFloat(circumference.replace(',', '.'))
  const circumferenceOk = Number.isFinite(circumferenceCm) && circumferenceCm > 0

  // Qué tan lejos está cada árbol de validarse — ayuda a decidir a cuál ir primero
  // (uno a 1 verificación es un "quick win": tu visita lo completa al toque).
  const stats = useMemo(() => {
    const actionable = trees.filter((t) => !t.isMine && !t.validatedByMe)
    return {
      almostThere: actionable.filter((t) => t.validations_count === cfg.validationThreshold - 1).length,
      // Con GPS, "cuántos puedo verificar ahora mismo" es más útil que "cuántos
      // hay recién mapeados": el resto exige caminar hasta ellos.
      inRangeNow: fix
        ? actionable.filter((t) => distanceMeters(fix, t) <= cfg.verifyRadiusM).length
        : actionable.filter((t) => t.validations_count === 0).length,
      verifiedByMe: trees.filter((t) => t.validatedByMe).length,
    }
  }, [trees, fix, cfg.verifyRadiusM, cfg.validationThreshold])

  const resetForm = () => {
    setCanopy(null); setTrunk(null); setCircumference(''); setHealth(null)
    setSpeciesId(null); setSpeciesName(null); setHeightBand(null)
    setSiteContext(null); setConflicts([]); setUrgency(null)
  }

  const verifyM = useMutation({
    mutationFn: async (tree: PendingTree) => {
      // Fix fresco al momento de verificar, no el de cuando se abrió la pantalla:
      // es el dato que el trigger compara contra la posición del árbol.
      const now = await getFix()
      if (!now) throw new Error('No pudimos leer tu ubicación. Activá el GPS y volvé a intentar.')
      setFix(now)

      const d = distanceMeters(now, tree)
      if (d > cfg.verifyRadiusM) {
        throw new Error(`Estás a ${formatDistance(d)} del árbol (máximo ${cfg.verifyRadiusM} m). Acercate para verificarlo.`)
      }

      const [photoUrl, photoTrunkUrl] = await Promise.all([
        uploadTreePhoto(canopy!.base64),
        trunk ? uploadTreePhoto(trunk.base64) : Promise.resolve(null),
      ])

      return createValidation({
        treeId: tree.id,
        photoUrl,
        photoTrunkUrl,
        health: health!,
        circumferenceCm,
        speciesId,
        speciesName,
        heightBand,
        siteContext,
        conflicts: conflicts.length > 0 ? conflicts : null,
        urgency,
        latitude: now.latitude,
        longitude: now.longitude,
        gpsAccuracy: now.accuracy,
      })
    },
    onSuccess: (res) => {
      setResult({
        validated: res.treeStatus === 'validated',
        count: res.validationsCount,
        disputed: res.disputedFields,
      })
      setStep(4)
      qc.invalidateQueries({ queryKey: ['pendingTrees'] })
      qc.invalidateQueries({ queryKey: ['balance'] })
      qc.invalidateQueries({ queryKey: ['myStats'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['leaderboardMe'] })
      qc.invalidateQueries({ queryKey: ['dailyMissions'] })
    },
    onError: (e: any) => {
      Alert.alert('No se pudo verificar', e?.message ?? 'Intenta de nuevo.')
    },
  })

  const closeModal = () => { setModalVisible(false); setStep(1) }
  const startVerify = () => { resetForm(); setStep(2); setModalVisible(true) }
  const finish = () => { closeModal(); setSelected(null); setResult(null); resetForm() }

  const capture = async (set: (s: Shot) => void) => {
    const perm = await requestTreePhotoPermission()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos la cámara para la foto de verificación.')
      return
    }
    try {
      const r = await launchTreePhotoCapture()
      if (r.canceled || !r.assets?.[0]?.base64) return
      set({ uri: r.assets[0].uri, base64: r.assets[0].base64 })
    } catch (e: any) {
      Alert.alert('Cámara no disponible', e?.message ?? 'No disponible en simulador.')
    }
  }

  const region = selected
    ? { latitude: selected.latitude, longitude: selected.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
    : trees.length > 0
      ? { latitude: trees[0].latitude, longitude: trees[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : { latitude: -17.38, longitude: -66.155, latitudeDelta: 0.02, longitudeDelta: 0.02 }

  const PhotoSlot = ({ shot, onPress, title, hint }: { shot: Shot; onPress: () => void; title: string; hint: string }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-[#122e20] border-2 border-dashed border-[#2fe06a]/30 w-full h-40 rounded-2xl items-center justify-center overflow-hidden"
    >
      {shot ? (
        <Image source={{ uri: shot.uri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="items-center justify-center p-5">
          <View className="mb-2"><CameraIcon size={28} color="#2fe06a" /></View>
          <Text className="text-white font-bold text-sm">{title}</Text>
          <Text className="text-gray-400 text-[11px] mt-1 text-center leading-4">{hint}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScreenHeader
        title="Monitorear y Verificar"
        subtitle={treesQ.isLoading ? 'Cargando árboles pendientes…' : `${trees.length} árbol${trees.length === 1 ? '' : 'es'} por verificar cerca`}
        onBack={goBack}
      />

      <View className="flex-1 relative">
        <MapView style={{ flex: 1 }} region={region} showsUserLocation showsPointsOfInterests={false}>
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
                  <Text className="text-[9px] font-extrabold text-[#04230f]">{tree.validations_count}/{cfg.validationThreshold}</Text>
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
              <StatTile value={stats.inRangeNow} label={fix ? 'A tu alcance' : 'Recién mapeados'} color="#fbbf24" />
              <StatTile value={stats.verifiedByMe} label="Ya verificaste" />
            </View>
          </View>
        )}

        {/* Detalle del árbol seleccionado.
            NO muestra la medida ni la salud que reportó el registrante: son
            justamente los campos que este usuario va a responder. Verlos antes
            sesga la respuesta y vacía de sentido la mayoría. */}
        {selected && step === 1 && (
          <View className="absolute bottom-0 left-0 right-0 bg-[#0d2419] border-t border-x border-[#2fe06a]/25 rounded-t-3xl p-5 shadow-2xl z-20" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-bold">{selected.species_name ?? 'Especie sin identificar'}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} className="bg-[#122e20] w-7 h-7 rounded-full items-center justify-center border border-green-950">
                <Text className="text-gray-400 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row mb-4">
              <Image source={{ uri: selected.photo_url }} className="w-20 h-20 rounded-2xl" resizeMode="cover" />
              <View className="flex-1 ml-3 bg-[#122e20] border border-green-950 rounded-2xl p-3.5 justify-center">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-xs">Progreso:</Text>
                  <Text className="text-[#2fe06a] text-xs font-bold">
                    {selected.validations_count}/{cfg.validationThreshold} verificaciones
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-400 text-xs">Distancia:</Text>
                  {locating ? (
                    <Text className="text-gray-400 text-xs">Ubicando…</Text>
                  ) : distance == null ? (
                    <Text className="text-yellow-400 text-xs font-bold">Sin ubicación</Text>
                  ) : (
                    <Text className={`text-xs font-bold ${inRange ? 'text-[#2fe06a]' : 'text-yellow-400'}`}>
                      {formatDistance(distance)}
                    </Text>
                  )}
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
            ) : distance == null ? (
              // Sin ubicación no hay verificación posible: el servidor la rechaza igual.
              <TouchableOpacity
                onPress={locate}
                disabled={locating}
                className="bg-[#122e20] border border-yellow-500/30 w-full rounded-xl py-3.5 items-center"
              >
                <Text className="text-yellow-400 font-bold text-sm">
                  {locating ? 'Buscando señal GPS…' : 'Activar ubicación para verificar'}
                </Text>
              </TouchableOpacity>
            ) : !inRange ? (
              <>
                <View className="bg-[#122e20] border border-yellow-500/25 rounded-xl py-3.5 items-center">
                  <Text className="text-yellow-400 font-bold text-sm">
                    Acercate: estás a {formatDistance(distance)}
                  </Text>
                </View>
                <Text className="text-gray-500 text-[11px] text-center mt-2">
                  La verificación es presencial — tenés que estar a menos de {cfg.verifyRadiusM} m del árbol.
                </Text>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={startVerify} className="bg-[#2fe06a] w-full rounded-xl py-3.5 items-center shadow-md">
                  <Text className="text-[#04230f] font-extrabold text-sm">Verificar este árbol</Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-[11px] text-center mt-2">
                  Vas a medirlo y evaluarlo vos: ganás {cfg.validateReward} AC cuando llegue a {cfg.validationThreshold} verificaciones.
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View className="flex-1 bg-black/85 justify-end">
          <View
            className="bg-[#0d2419] border-t-2 border-x-2 border-[#2fe06a]/20 rounded-t-3xl px-6 pt-6"
            style={{ maxHeight: '90%', paddingBottom: insets.bottom + 16 }}
          >
            {/* PASO 2: FOTOS */}
            {step === 2 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-white text-lg font-bold text-center mb-1">Fotos de verificación</Text>
                <Text className="text-gray-400 text-xs text-center mb-5 leading-4">
                  Tu propia evidencia del árbol, no la del registrante.
                </Text>

                <FieldLabel hint="El árbol completo, de lejos.">Copa (obligatoria)</FieldLabel>
                <PhotoSlot
                  shot={canopy}
                  onPress={() => capture(setCanopy)}
                  title={canopy ? 'Repetir foto' : 'Capturar copa'}
                  hint="Foto en vivo"
                />

                <View className="h-4" />

                <FieldLabel hint="Donde pasás la cinta. Respalda tu medida si hay desacuerdo.">
                  Tronco (opcional)
                </FieldLabel>
                <PhotoSlot
                  shot={trunk}
                  onPress={() => capture(setTrunk)}
                  title={trunk ? 'Repetir foto' : 'Capturar tronco'}
                  hint="A la altura del pecho"
                />

                <TouchableOpacity
                  onPress={() => setStep(3)}
                  disabled={!canopy}
                  className={`w-full rounded-xl py-4 items-center mt-6 ${canopy ? 'bg-[#2fe06a]' : 'bg-[#122e20] border border-green-900'}`}
                >
                  <Text className={`font-extrabold text-sm ${canopy ? 'text-[#04230f]' : 'text-gray-500'}`}>
                    {canopy ? 'Continuar' : 'Falta la foto de la copa'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity className="border border-green-950 w-full rounded-xl py-3.5 items-center mt-3" onPress={closeModal}>
                  <Text className="text-gray-300 text-sm">Cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* PASO 3: LA FICHA, RESPONDIDA POR EL VERIFICADOR */}
            {step === 3 && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text className="text-white text-lg font-bold text-center mb-1">Tu evaluación</Text>
                <Text className="text-gray-400 text-xs text-center mb-5 leading-4">
                  Respondé por tu cuenta. Al llegar a {cfg.validationThreshold} verificaciones, cada campo se
                  resuelve por mayoría entre los {cfg.validationThreshold + 1} participantes.
                </Text>

                <FieldLabel hint="Circunferencia con cinta a la altura del pecho.">
                  Perímetro del tronco
                </FieldLabel>
                <CircumferenceInput value={circumference} onChange={setCircumference} />

                <View className="h-5" />
                <FieldLabel>Estado fitosanitario</FieldLabel>
                <OptionList options={HEALTH} value={health} onChange={setHealth} compact />

                <View className="h-5" />
                <FieldLabel hint="Opcional. Si no la reconocés, dejalo en blanco: un voto inventado ensucia el consenso.">
                  Especie
                </FieldLabel>
                <SpeciesPicker
                  species={species}
                  value={speciesId}
                  onChange={(id, name) => { setSpeciesId(id); setSpeciesName(name) }}
                  placeholder="Sin opinión"
                />

                <View className="h-5" />
                <FieldLabel hint="Opcional.">Altura aproximada</FieldLabel>
                <OptionList options={HEIGHT_BANDS} value={heightBand} onChange={setHeightBand} compact />

                <View className="h-5" />
                <FieldLabel hint="Opcional.">¿Dónde está plantado?</FieldLabel>
                <OptionList options={SITE_CONTEXTS} value={siteContext} onChange={setSiteContext} compact />

                <View className="h-5" />
                <FieldLabel hint="Marcá lo que veas ahora.">Conflictos con infraestructura</FieldLabel>
                <ChipGroup options={CONFLICTS} values={conflicts} onChange={setConflicts} />

                <View className="h-5" />
                <FieldLabel hint="Opcional.">¿Necesita atención urgente?</FieldLabel>
                <OptionList options={URGENCIES} value={urgency} onChange={setUrgency} compact />

                <TouchableOpacity
                  onPress={() => selected && verifyM.mutate(selected)}
                  disabled={!circumferenceOk || !health || verifyM.isPending}
                  className={`w-full rounded-xl py-4 items-center mt-6 ${
                    !circumferenceOk || !health || verifyM.isPending ? 'bg-[#122e20] border border-green-900' : 'bg-[#2fe06a]'
                  }`}
                >
                  {verifyM.isPending ? (
                    <ActivityIndicator size="small" color="#2fe06a" />
                  ) : (
                    <Text className={`font-extrabold text-sm ${!circumferenceOk || !health ? 'text-gray-500' : 'text-[#04230f]'}`}>
                      {!circumferenceOk || !health ? 'Completá medida y estado' : 'Enviar verificación'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="border border-green-950 w-full rounded-xl py-3.5 items-center mt-3 mb-2"
                  onPress={closeModal}
                  disabled={verifyM.isPending}
                >
                  <Text className="text-gray-300 text-sm">Cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* PASO 4: RESULTADO */}
            {step === 4 && result && (
              <View className="items-center pb-4">
                <View className="bg-green-900/40 w-16 h-16 rounded-full items-center justify-center mb-4">
                  <CheckIcon size={32} color="#2fe06a" />
                </View>

                {result.validated ? (
                  <>
                    <Text className="text-white text-xl font-bold text-center">¡Árbol validado! 🎉</Text>
                    <Text className="text-gray-300 text-xs text-center mt-2 leading-5 px-2">
                      Tu verificación fue la {cfg.validationThreshold}.ª — el árbol quedó{' '}
                      <Text className="text-[#2fe06a] font-bold">Validado</Text> y se repartieron{' '}
                      {cfg.validateReward} ArbuCoins a cada participante.
                    </Text>

                    {/* Lo que hace útil el 1+3: qué quedó firme y qué no. */}
                    <View className="bg-[#122e20] border border-green-950 rounded-2xl p-4 mt-4 w-full">
                      {result.disputed.length === 0 ? (
                        <Text className="text-[#2fe06a] text-xs font-bold text-center leading-5">
                          Todos los datos coincidieron entre los participantes. La ficha queda confirmada.
                        </Text>
                      ) : (
                        <>
                          <Text className="text-yellow-400 text-xs font-bold text-center leading-5">
                            Sin acuerdo en: {result.disputed.map((f) => FIELD_LABEL[f] ?? f).join(', ')}.
                          </Text>
                          <Text className="text-gray-400 text-[11px] text-center mt-2 leading-4">
                            Esos campos quedan marcados y conservan el valor original hasta una revisión. El resto se
                            guardó con el valor votado por la mayoría.
                          </Text>
                        </>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-white text-xl font-bold text-center">Verificación registrada</Text>
                    <Text className="text-gray-300 text-xs text-center mt-2 leading-5 px-2">
                      Progreso: <Text className="text-[#2fe06a] font-bold">{result.count}/{cfg.validationThreshold}</Text>.
                      Cuando llegue a {cfg.validationThreshold}, los datos se resuelven por mayoría y ganás{' '}
                      {cfg.validateReward} AC junto al resto.
                    </Text>
                  </>
                )}

                <TouchableOpacity className="bg-[#2fe06a] w-full rounded-xl py-3.5 items-center mt-6" onPress={finish}>
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

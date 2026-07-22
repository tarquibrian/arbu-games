import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image } from 'react-native'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { goBack } from '@/shared/lib/navigation'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { ScreenHeader } from '@/shared/components/ui/ScreenHeader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView from 'react-native-maps'
import { CameraIcon, MapPinIcon, TargetIcon, LeafIcon, CheckIcon } from '@/shared/components/ui/Icons'
import { MapPin } from '@/shared/components/ui/MapPin'
import { createTree, uploadTreePhoto, findNearbyTrees, type NearbyTree } from '@/features/trees/api'
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

// Centro de Cochabamba — sólo el encuadre inicial mientras el GPS resuelve.
const FALLBACK_COORDS = { latitude: -17.37894, longitude: -66.15492 }

const TOTAL_STEPS = 4

const HEADER_COPY = {
  1: { title: 'Paso 1: Ubicación', subtitle: 'Arrastra el mapa para ubicar el árbol con precisión' },
  2: { title: 'Paso 2: Fotos', subtitle: 'Dos fotos en vivo: la copa completa y el tronco donde vas a medir. La galería está desactivada para prevenir fraudes.' },
  3: { title: 'Paso 3: Especie y medida', subtitle: 'Los verificadores van a responder lo mismo por su cuenta: el valor final sale por mayoría.' },
  4: { title: 'Paso 4: Entorno y estado', subtitle: 'Dónde está plantado y qué le pasa. Es el dato que usa el municipio para planificar poda y riego.' },
} as const

type Shot = { uri: string; base64: string } | null

export default function NewTreeScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const mapRef = useRef<MapView>(null)

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Ubicación
  const [showGuides, setShowGuides] = useState(false) // modo precisión: cruz de referencia en el centro
  const [fix, setFix] = useState<Fix | null>(null)     // posición real del device
  const [locating, setLocating] = useState(true)
  const [checkingDupes, setCheckingDupes] = useState(false)
  const [nearby, setNearby] = useState<NearbyTree[] | null>(null) // modal "¿es uno de estos?"
  const [region, setRegion] = useState({ ...FALLBACK_COORDS, latitudeDelta: 0.005, longitudeDelta: 0.005 })
  const [markerCoords, setMarkerCoords] = useState(FALLBACK_COORDS)

  // Ficha
  const [canopy, setCanopy] = useState<Shot>(null)
  const [trunk, setTrunk] = useState<Shot>(null)
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [speciesName, setSpeciesName] = useState<string | null>(null)
  const [circumference, setCircumference] = useState('')
  const [heightBand, setHeightBand] = useState<E['tree_height_band'] | null>(null)
  const [siteContext, setSiteContext] = useState<E['tree_site_context'] | null>(null)
  const [conflicts, setConflicts] = useState<E['tree_conflict'][]>([])
  const [health, setHealth] = useState<E['tree_health'] | null>(null)
  const [urgency, setUrgency] = useState<E['tree_urgency']>('none')

  const cfg = useQuery(appConfigQuery).data ?? DEFAULT_CONFIG
  const species = useQuery(speciesQuery).data ?? []

  // El pin arranca en la posición real del device, no en un punto fijo de la
  // ciudad: sin esto, el árbol se registra donde quedó el mapa (13.1).
  const locate = async (animate = true) => {
    setLocating(true)
    const f = await getFix()
    setLocating(false)
    if (!f) return
    setFix(f)
    const next = { latitude: f.latitude, longitude: f.longitude }
    setMarkerCoords(next)
    setRegion((r) => ({ ...r, ...next }))
    if (animate) {
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 600)
    }
  }

  useEffect(() => { locate(false) }, [])

  // Cuánto se alejó el pin del fix del GPS: si el usuario lo arrastró lejos, la
  // precisión del device ya no describe dónde está el pin.
  const pinDrift = fix ? distanceMeters(fix, markerCoords) : null
  const lowAccuracy = fix?.accuracy != null && fix.accuracy > cfg.gpsAccuracyMaxM

  const circumferenceCm = parseFloat(circumference.replace(',', '.'))
  const circumferenceOk = Number.isFinite(circumferenceCm) && circumferenceCm > 0

  const handleConfirmLocation = async () => {
    if (checkingDupes) return
    setCheckingDupes(true)
    try {
      const found = await findNearbyTrees(markerCoords.latitude, markerCoords.longitude)
      if (found.length > 0) {
        setNearby(found)   // el usuario decide: verificar el existente o seguir igual
        return
      }
      setStep(2)
    } catch {
      setStep(2)  // el chequeo de duplicados es una ayuda, no un bloqueo del registro
    } finally {
      setCheckingDupes(false)
    }
  }

  const capture = async (set: (s: Shot) => void) => {
    const perm = await requestTreePhotoPermission()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para la foto en vivo del árbol.')
      return
    }
    try {
      const result = await launchTreePhotoCapture()
      if (result.canceled || !result.assets?.[0]?.base64) return
      set({ uri: result.assets[0].uri, base64: result.assets[0].base64 })
    } catch (e: any) {
      Alert.alert('Cámara no disponible', e?.message ?? 'No se pudo abrir la cámara (no disponible en simulador).')
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!canopy || !trunk || !circumferenceOk || !health || !heightBand || !siteContext) {
      Alert.alert('Falta completar', 'Revisá los pasos: fotos, medida, altura, contexto y estado son obligatorios.')
      return
    }

    setSubmitting(true)
    try {
      const [photoUrl, photoTrunkUrl] = await Promise.all([
        uploadTreePhoto(canopy.base64),
        uploadTreePhoto(trunk.base64),
      ])

      await createTree({
        latitude: markerCoords.latitude,
        longitude: markerCoords.longitude,
        // Incertidumbre real del punto guardado: el error del GPS, o cuánto se
        // arrastró el pin lejos del device si eso pesa más. Sin fix no hay dato.
        gpsAccuracy: fix ? Math.round(Math.max(fix.accuracy ?? 0, pinDrift ?? 0)) : null,
        photoUrl,
        photoTrunkUrl,
        circumferenceCm,
        health,
        heightBand,
        siteContext,
        conflicts,
        urgency,
        speciesId,
        speciesName,
      })

      qc.invalidateQueries({ queryKey: ['allTrees'] })
      qc.invalidateQueries({ queryKey: ['pendingTrees'] })
      qc.invalidateQueries({ queryKey: ['myStats'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['leaderboardMe'] })
      qc.invalidateQueries({ queryKey: ['dailyMissions'] })

      Alert.alert(
        'Registro Exitoso',
        `¡Tu árbol fue registrado! Ahora entra en validación (0/${cfg.validationThreshold}). Los verificadores van a responder la misma ficha; lo que no coincida queda marcado.`,
        [{ text: 'Entendido', onPress: () => router.replace('/(tabs)') }]
      )
    } catch (e: any) {
      Alert.alert('Error al registrar', e?.message ?? 'No se pudo guardar el árbol. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const PhotoSlot = ({
    shot,
    onPress,
    title,
    hint,
  }: { shot: Shot; onPress: () => void; title: string; hint: string }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-[#122e20] border-2 border-dashed border-[#2fe06a]/30 w-full h-44 rounded-2xl items-center justify-center overflow-hidden mb-2"
    >
      {shot ? (
        <Image source={{ uri: shot.uri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="items-center justify-center p-5">
          <View className="mb-2.5"><CameraIcon size={30} color="#2fe06a" /></View>
          <Text className="text-white font-bold text-sm">{title}</Text>
          <Text className="text-gray-400 text-[11px] mt-1 text-center px-4 leading-4">{hint}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const NextButton = ({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`w-full rounded-xl py-4 items-center mt-6 ${disabled ? 'bg-[#122e20] border border-green-900' : 'bg-[#2fe06a]'}`}
    >
      <Text className={`font-extrabold text-sm ${disabled ? 'text-gray-500' : 'text-[#04230f]'}`}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScreenHeader
        title={HEADER_COPY[step as 1 | 2 | 3 | 4].title}
        subtitle={HEADER_COPY[step as 1 | 2 | 3 | 4].subtitle}
        onBack={step === 1 ? goBack : () => setStep((prev) => prev - 1)}
      />

      {/* PASO 1: MAPA A PANTALLA COMPLETA */}
      {step === 1 ? (
        <View className="flex-1">
          <View className="flex-1 relative">
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={region}
              showsUserLocation
              showsPointsOfInterests={false}
              onRegionChangeComplete={(reg) => {
                setRegion(reg)
                setMarkerCoords({ latitude: reg.latitude, longitude: reg.longitude })
              }}
            />

            {/* Pin y cruz son mutuamente excluyentes — el pin es grande y tapa justo el
                punto que la cruz existe para dejar ver con precisión, así que mostrar
                ambos a la vez estorba en vez de ayudar. */}
            {showGuides ? (
              <>
                <View pointerEvents="none" className="absolute bg-black/60" style={{ top: '50%', left: 0, right: 0, height: 1 }} />
                <View pointerEvents="none" className="absolute bg-black/60" style={{ left: '50%', top: 0, bottom: 0, width: 1 }} />
              </>
            ) : (
              <View
                pointerEvents="none"
                className="absolute"
                style={{ top: '50%', left: '50%', marginLeft: -20, marginTop: -38 }}
              >
                <MapPin size={40} color="#2fe06a">
                  <LeafIcon size={14} color="#ffffff" />
                </MapPin>
              </View>
            )}

            {/* Toggle pin/cruz — el ícono muestra el modo ACTIVO (no el destino), a
                juego con el color relleno/apagado. */}
            <View className="absolute top-4 right-4 gap-2.5">
              <TouchableOpacity
                onPress={() => setShowGuides((v) => !v)}
                className={`w-10 h-10 rounded-full items-center justify-center border shadow-lg ${
                  showGuides ? 'bg-[#2fe06a] border-white' : 'bg-[#0d2419]/90 border-green-900'
                }`}
              >
                {showGuides ? (
                  <TargetIcon size={18} color="#04230f" />
                ) : (
                  <MapPinIcon size={18} color="#2fe06a" />
                )}
              </TouchableOpacity>

              {/* Volver a mi ubicación — el pin se puede arrastrar lejos sin querer */}
              <TouchableOpacity
                onPress={() => locate()}
                disabled={locating}
                className="w-10 h-10 rounded-full items-center justify-center border shadow-lg bg-[#0d2419]/90 border-green-900"
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#2fe06a" />
                ) : (
                  <TargetIcon size={18} color="#2fe06a" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View
            className="bg-[#0d2419] border-t border-x border-[#2fe06a]/25 rounded-t-3xl p-6 shadow-2xl"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="flex-row items-center mb-3 bg-[#122e20] p-3.5 rounded-xl border border-green-950">
              <MapPinIcon size={18} color="#2fe06a" />
              <View className="ml-3 flex-1">
                <Text className="text-white text-xs font-bold uppercase tracking-wider">Coordenadas Fijadas</Text>
                <Text className="text-gray-300 text-xs font-mono mt-0.5" numberOfLines={1}>
                  {markerCoords.latitude.toFixed(6)}, {markerCoords.longitude.toFixed(6)}
                </Text>
              </View>
              {locating ? (
                <ActivityIndicator size="small" color="#2fe06a" />
              ) : fix ? (
                <View className={`px-2.5 py-1 rounded-full ${lowAccuracy ? 'bg-yellow-500/15' : 'bg-[#2fe06a]/15'}`}>
                  <Text className={`text-[10px] font-bold ${lowAccuracy ? 'text-yellow-400' : 'text-[#2fe06a]'}`}>
                    ±{fix.accuracy != null ? Math.round(fix.accuracy) : '?'} m
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Estado del GPS. Los tres casos piden algo distinto del usuario, así que
                se dicen explícitos en vez de dejar el pin en un punto arbitrario. */}
            {!locating && !fix ? (
              <Text className="text-yellow-400 text-[11px] mb-3 leading-4">
                Sin señal GPS o permiso denegado. Ubicá el árbol a mano en el mapa — vas a
                necesitar estar en el lugar igual para que otros lo verifiquen.
              </Text>
            ) : lowAccuracy ? (
              <Text className="text-yellow-400 text-[11px] mb-3 leading-4">
                Precisión baja (±{Math.round(fix!.accuracy!)} m, umbral {cfg.gpsAccuracyMaxM} m). Ajustá el
                pin a mano sobre el árbol: el modelo 1+3 necesita que otros encuentren este mismo ejemplar.
              </Text>
            ) : pinDrift != null && pinDrift > 50 ? (
              <Text className="text-yellow-400 text-[11px] mb-3 leading-4">
                El pin está a {formatDistance(pinDrift)} de tu posición. Registrá el árbol donde estás parado.
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleConfirmLocation}
              disabled={checkingDupes}
              className={`w-full rounded-xl py-4 items-center shadow-lg ${checkingDupes ? 'bg-[#2fe06a]/50' : 'bg-[#2fe06a]'}`}
            >
              <Text className="text-[#04230f] font-extrabold text-sm">
                {checkingDupes ? 'Buscando árboles cercanos…' : 'Fijar Ubicación y Continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progreso */}
          <View className="flex-row gap-2 mb-7">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} className={`h-1.5 flex-1 rounded-full ${step >= i + 1 ? 'bg-[#2fe06a]' : 'bg-green-950'}`} />
            ))}
          </View>

          {/* PASO 2: FOTOS PAUTADAS */}
          {step === 2 && (
            <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5">
              <FieldLabel hint="El árbol entero, de lejos. Sirve para identificar especie y evaluar la copa.">
                Foto 1 — copa completa
              </FieldLabel>
              <PhotoSlot
                shot={canopy}
                onPress={() => capture(setCanopy)}
                title={canopy ? 'Repetir foto' : 'Abrir cámara'}
                hint="Que entre desde el suelo hasta la punta"
              />

              <View className="h-4" />

              <FieldLabel hint="A la altura del pecho (~1,30 m), donde vas a pasar la cinta. Es la evidencia de la medida que van a repetir los verificadores.">
                Foto 2 — tronco
              </FieldLabel>
              <PhotoSlot
                shot={trunk}
                onPress={() => capture(setTrunk)}
                title={trunk ? 'Repetir foto' : 'Abrir cámara'}
                hint="De cerca, con el tronco centrado"
              />

              <NextButton
                label={canopy && trunk ? 'Continuar' : 'Faltan las dos fotos'}
                disabled={!canopy || !trunk}
                onPress={() => setStep(3)}
              />
            </View>
          )}

          {/* PASO 3: ESPECIE + MEDIDA */}
          {step === 3 && (
            <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5">
              <FieldLabel hint="Define cada cuánto hay que re-monitorearlo y cuánto CO2 estima. Si dudás, “Desconocido” es una respuesta válida.">
                Especie
              </FieldLabel>
              <SpeciesPicker
                species={species}
                value={speciesId}
                onChange={(id, name) => { setSpeciesId(id); setSpeciesName(name) }}
              />

              <View className="h-6" />

              <FieldLabel hint="Circunferencia con cinta, no el diámetro a ojo: es la única medida que tres personas distintas pueden repetir igual.">
                Perímetro del tronco
              </FieldLabel>
              <CircumferenceInput value={circumference} onChange={setCircumference} />

              <View className="h-6" />

              <FieldLabel hint="Rango, no metros exactos — nadie coincide estimando metros.">
                Altura aproximada
              </FieldLabel>
              <OptionList options={HEIGHT_BANDS} value={heightBand} onChange={setHeightBand} compact />

              <NextButton
                label={circumferenceOk && heightBand ? 'Continuar' : 'Completá medida y altura'}
                disabled={!circumferenceOk || !heightBand}
                onPress={() => setStep(4)}
              />
            </View>
          )}

          {/* PASO 4: ENTORNO + ESTADO */}
          {step === 4 && (
            <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5">
              <FieldLabel hint="Determina quién lo mantiene y con qué régimen de riego.">
                ¿Dónde está plantado?
              </FieldLabel>
              <OptionList options={SITE_CONTEXTS} value={siteContext} onChange={setSiteContext} compact />

              <View className="h-6" />

              <FieldLabel hint="Marcá lo que veas. Opcional — esto arma el mapa de poda de la ciudad.">
                Conflictos con infraestructura
              </FieldLabel>
              <ChipGroup options={CONFLICTS} values={conflicts} onChange={setConflicts} />

              <View className="h-6" />

              <FieldLabel>Estado fitosanitario</FieldLabel>
              <OptionList options={HEALTH} value={health} onChange={setHealth} compact />

              <View className="h-6" />

              <FieldLabel hint="Sólo si hay algo que requiere intervención pronto.">
                ¿Necesita atención urgente?
              </FieldLabel>
              <OptionList options={URGENCIES} value={urgency} onChange={setUrgency} compact />

              <View className="flex-row gap-4 mt-7">
                <TouchableOpacity
                  onPress={() => setStep(3)}
                  className="flex-1 bg-green-950 border border-[#2fe06a]/20 rounded-xl py-3.5 items-center"
                >
                  <Text className="text-white font-bold text-sm">Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || !siteContext || !health}
                  className={`flex-1 rounded-xl py-3.5 items-center shadow-md ${
                    submitting || !siteContext || !health ? 'bg-[#2fe06a]/40' : 'bg-[#2fe06a]'
                  }`}
                >
                  <Text className="text-[#04230f] font-bold text-sm">
                    {submitting ? 'Registrando…' : 'Finalizar Registro'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* "¿Es uno de estos?" — une registro y verificación: si el árbol ya existe,
          lo útil es verificarlo (suma al 1+3), no crear un duplicado (13.1). */}
      <Modal visible={nearby !== null} transparent animationType="slide" onRequestClose={() => setNearby(null)}>
        <View className="flex-1 bg-black/85 justify-end">
          <View className="bg-[#0d2419] border-t-2 border-x-2 border-[#2fe06a]/20 rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 20 }}>
            <Text className="text-white text-lg font-bold text-center">¿Es uno de estos?</Text>
            <Text className="text-gray-400 text-xs text-center mt-1.5 mb-5 leading-4">
              Ya hay {nearby?.length === 1 ? 'un árbol registrado' : `${nearby?.length ?? 0} árboles registrados`} a
              menos de {cfg.duplicateRadiusM} m. Verificar el existente vale ArbuCoins; duplicarlo, no.
            </Text>

            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {(nearby ?? []).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { setNearby(null); router.replace(`/tree/verify?treeId=${t.id}`) }}
                  className="flex-row items-center bg-[#122e20] border border-green-950 rounded-2xl p-3 mb-2.5"
                >
                  <Image source={{ uri: t.photo_url }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
                  <View className="flex-1 ml-3">
                    <Text className="text-white text-sm font-bold" numberOfLines={1}>
                      {t.species_name ?? 'Especie desconocida'}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      A {formatDistance(t.distance_meters)} · DAP {t.dap} cm
                    </Text>
                    <Text className="text-[#2fe06a] text-[11px] font-bold mt-0.5">
                      {t.status === 'validated' ? 'Validado' : `${t.validations_count}/${cfg.validationThreshold} verificaciones`}
                    </Text>
                  </View>
                  <CheckIcon size={16} color="#2fe06a" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => { setNearby(null); setStep(2) }}
              className="border border-green-950 w-full rounded-xl py-3.5 items-center mt-3"
            >
              <Text className="text-gray-300 text-sm font-bold">No, es un árbol distinto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

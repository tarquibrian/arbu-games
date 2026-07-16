import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { CameraIcon, MapPinIcon } from '@/shared/components/ui/Icons'
import { Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { createTree, uploadTreePhoto } from '@/features/trees/api'

const { width: W } = Dimensions.get('window')

export default function NewTreeScreen() {
  const insets = useSafeAreaInsets()
  const [photo, setPhoto] = useState<string | null>(null)         // uri local (preview)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [dap, setDap] = useState('')
  const [health, setHealth] = useState<'Bueno' | 'Regular' | 'Pobre' | 'Muerto' | null>(null)
  const [step, setStep] = useState(1) // 1 = Map, 2 = Photo, 3 = Data
  const [submitting, setSubmitting] = useState(false)
  const [region, setRegion] = useState({
    latitude: -17.37894,
    longitude: -66.15492,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  })
  const [markerCoords, setMarkerCoords] = useState({
    latitude: -17.37894,
    longitude: -66.15492,
  })

  const handleConfirmLocation = () => {
    setStep(2)
  }

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para la foto en vivo del árbol.')
      return
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.6,
        allowsEditing: false,
      })
      if (result.canceled || !result.assets?.[0]?.base64) return
      setPhoto(result.assets[0].uri)
      setPhotoBase64(result.assets[0].base64)
      setStep(3)
    } catch (e: any) {
      Alert.alert('Cámara no disponible', e?.message ?? 'No se pudo abrir la cámara (no disponible en simulador).')
    }
  }

  const handleSubmit = async () => {
    if (!photoBase64 || !dap || !health) {
      Alert.alert('Formulario Incompleto', 'Por favor completa todos los pasos del registro.')
      return
    }
    if (submitting) return

    const dapNum = parseFloat(dap.replace(',', '.'))
    if (!Number.isFinite(dapNum) || dapNum <= 0) {
      Alert.alert('DAP inválido', 'Ingresa un diámetro de tronco válido en cm.')
      return
    }

    setSubmitting(true)
    try {
      const photoUrl = await uploadTreePhoto(photoBase64)
      await createTree({
        latitude: markerCoords.latitude,
        longitude: markerCoords.longitude,
        photoUrl,
        dap: dapNum,
        health,
      })

      Alert.alert(
        'Registro Exitoso',
        '¡Tu árbol fue registrado! Ahora entra en estado de Validación (0/3). Ganarás ArbuCoins cuando sea verificado.',
        [{ text: 'Entendido', onPress: () => router.replace('/(tabs)') }]
      )
    } catch (e: any) {
      Alert.alert('Error al registrar', e?.message ?? 'No se pudo guardar el árbol. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      {/* STEP 1: INTERACTIVE MAP FULL VIEW (Custom Layout) */}
      {step === 1 ? (
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          {/* Header overlay */}
          <View className="flex-row items-center px-5 py-4 bg-[#08160e]/90 border-b border-green-950/30 z-10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 w-10 h-10 rounded-full bg-[#122e20] items-center justify-center border border-green-900"
            >
              <Text className="text-white text-base">←</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-white font-bold text-lg">Paso 1: Mapear Ubicación</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Arrastra el mapa para ubicar el árbol con precisión</Text>
            </View>
          </View>

          {/* Interactive Map */}
          <View className="flex-1 relative">
            <MapView
              style={{ flex: 1 }}
              initialRegion={region}
              onRegionChangeComplete={(reg) => {
                setRegion(reg)
                setMarkerCoords({
                  latitude: reg.latitude,
                  longitude: reg.longitude,
                })
              }}
            >
              <Marker
                coordinate={markerCoords}
                title="Nuevo Árbol"
                description="Suelta aquí para fijar posición"
              />
            </MapView>

            {/* Crosshair indicator in the center */}
            <View className="absolute top-1/2 left-1/2 -mt-10 -ml-5 items-center justify-center pointer-events-none">
              <View className="bg-[#2fe06a] w-3 h-3 rounded-full border border-white mb-1 shadow-lg" />
              <View className="h-6 w-0.5 bg-[#2fe06a]" />
            </View>
          </View>

          {/* Bottom Card for Confirmation */}
          <View
            className="bg-[#0d2419] border-t border-x border-[#2fe06a]/25 rounded-t-3xl p-6 shadow-2xl"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="flex-row items-center mb-4 bg-[#122e20] p-3.5 rounded-xl border border-green-950">
              <MapPinIcon size={18} color="#2fe06a" />
              <View className="ml-3 flex-1">
                <Text className="text-white text-xs font-bold uppercase tracking-wider">Coordenadas Fijadas</Text>
                <Text className="text-gray-300 text-xs font-mono mt-0.5" numberOfLines={1}>
                  {markerCoords.latitude.toFixed(6)}, {markerCoords.longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleConfirmLocation}
              className="bg-[#2fe06a] w-full rounded-xl py-4 items-center shadow-lg"
            >
              <Text className="text-[#04230f] font-extrabold text-sm">Fijar Ubicación y Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Navigation Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => setStep((prev) => prev - 1)}
              className="mr-4 w-10 h-10 rounded-full bg-[#122e20] items-center justify-center border border-green-900"
            >
              <Text className="text-white text-base">←</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white font-sans">Registrar Árbol</Text>
          </View>

          {/* Steps Tracker */}
          <View className="flex-row gap-2 mb-8">
            <View className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-[#2fe06a]' : 'bg-green-950'}`} />
            <View className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-[#2fe06a]' : 'bg-green-950'}`} />
            <View className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-[#2fe06a]' : 'bg-green-950'}`} />
          </View>

          {/* STEP 2: CAMERA PHOTO */}
          {step === 2 && (
            <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5 items-center">
              <Text className="text-white font-bold text-base mb-2 text-center">Paso 2: Foto en Vivo</Text>
              <Text className="text-gray-400 text-xs text-center mb-6 leading-5">
                Toma una fotografía del árbol completo. La carga desde galería está desactivada para prevenir fraudes.
              </Text>

              <TouchableOpacity
                onPress={handleTakePhoto}
                className="bg-[#122e20] border-2 border-dashed border-[#2fe06a]/30 w-full h-56 rounded-2xl items-center justify-center my-4 overflow-hidden"
              >
                {photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="items-center justify-center p-6">
                    <View className="mb-3">
                      <CameraIcon size={36} color="#2fe06a" />
                    </View>
                    <Text className="text-white font-bold text-sm">Abrir Cámara</Text>
                    <Text className="text-gray-400 text-[10px] mt-1">Foto geoposicionada obligatoria</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text className="text-[#2fe06a] text-xs font-semibold text-center mt-2">
                Asegúrate de que haya buena luz y el tronco sea visible.
              </Text>
            </View>
          )}

          {/* STEP 3: HEALTH STATUS & DAP */}
          {step === 3 && (
            <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5">
              <Text className="text-white font-bold text-base mb-2 text-center">Paso 3: Detalles Finales</Text>
              <Text className="text-gray-400 text-xs text-center mb-6 leading-5">
                Ingresa el diámetro del tronco y evalúa el estado de salud del árbol.
              </Text>

              {/* DAP Input */}
              <View className="mb-5">
                <Text className="text-white text-xs font-bold mb-2">Diámetro de Tronco (DAP en cm)</Text>
                <View className="bg-[#122e20] border border-[#2fe06a]/20 rounded-xl px-4 py-3">
                  <TextInput
                    placeholder="Ej: 35"
                    placeholderTextColor="rgba(190, 220, 200, 0.3)"
                    keyboardType="numeric"
                    value={dap}
                    onChangeText={setDap}
                    style={{ color: '#fff', fontSize: 15 }}
                  />
                </View>
              </View>

              {/* Health Options */}
              <View className="gap-3 mb-6">
                <Text className="text-white text-xs font-bold mb-1">Estado Fitosanitario</Text>
                {(['Bueno', 'Regular', 'Pobre', 'Muerto'] as const).map((status) => {
                  let colorClass = 'border-green-900 bg-[#122e20]'
                  let bulletBg = 'bg-green-500'
                  let textLabel = 'Bueno (Saludable)'

                  if (status === 'Regular') {
                    bulletBg = 'bg-yellow-500'
                    textLabel = 'Regular (Daño menor)'
                  } else if (status === 'Pobre') {
                    bulletBg = 'bg-orange-500'
                    textLabel = 'Pobre (Enfermo / crítico)'
                  } else if (status === 'Muerto') {
                    bulletBg = 'bg-red-500'
                    textLabel = 'Muerto'
                  }

                  if (health === status) {
                    colorClass = 'border-[#2fe06a] bg-green-900/20'
                  }

                  return (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setHealth(status)}
                      className={`border rounded-xl p-4 flex-row items-center justify-between ${colorClass}`}
                    >
                      <View className="flex-row items-center">
                        <View className={`w-3.5 h-3.5 rounded-full mr-3 ${bulletBg}`} />
                        <Text className="text-white font-bold text-sm">{textLabel}</Text>
                      </View>
                      {health === status && <Text className="text-[#2fe06a] font-bold">✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View className="flex-row gap-4 mt-2">
                <TouchableOpacity
                  onPress={() => setStep(2)}
                  className="flex-1 bg-green-950 border border-[#2fe06a]/20 rounded-xl py-3.5 items-center"
                >
                  <Text className="text-white font-bold text-sm">Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  className={`flex-1 rounded-xl py-3.5 items-center shadow-md ${submitting ? 'bg-[#2fe06a]/50' : 'bg-[#2fe06a]'}`}
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
    </View>
  )
}

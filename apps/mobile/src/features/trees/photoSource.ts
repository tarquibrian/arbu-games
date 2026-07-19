import * as ImagePicker from 'expo-image-picker'

// Producción: cámara en vivo, galería bloqueada (anti-fraude, 13.1). El simulador
// iOS no tiene cámara — launchCameraAsync crashea nativo ahí (no capturable con
// try/catch). En __DEV__ se usa la librería de fotos como estand-in para poder
// probar el flujo completo en simulador; nunca corre en un build de producción.
const PICKER_OPTS = { base64: true, quality: 0.6, allowsEditing: false } as const

export function requestTreePhotoPermission() {
  return __DEV__
    ? ImagePicker.requestMediaLibraryPermissionsAsync()
    : ImagePicker.requestCameraPermissionsAsync()
}

export function launchTreePhotoCapture() {
  return __DEV__
    ? ImagePicker.launchImageLibraryAsync(PICKER_OPTS)
    : ImagePicker.launchCameraAsync(PICKER_OPTS)
}

import * as Location from 'expo-location'

export type Fix = {
  latitude: number
  longitude: number
  accuracy: number | null   // metros reportados por el device
}

export type Coords = { latitude: number; longitude: number }

// Pide permiso y devuelve un fix de alta precisión. Devuelve null si el usuario
// no dio permiso o el device no pudo resolver la posición — quien llama decide
// si eso bloquea (verificar) o sólo degrada la UX (registrar).
export async function getFix(): Promise<Fix | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync()
  if (!granted) return null

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    }
  } catch {
    return null
  }
}

// Haversine en metros — misma fórmula que distance_m() en la migración 0006,
// para que la distancia que muestra la UI y la que valida el trigger coincidan.
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// "12 m" / "1.4 km" — para etiquetas cortas en mapas y listas.
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

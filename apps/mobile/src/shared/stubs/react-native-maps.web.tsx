// Web stub for react-native-maps — the library is native-only. The web target
// exists solely for quick visual verification of non-map screens; map screens
// render a placeholder instead of crashing the bundle.
import { View, Text } from 'react-native'
import type { ReactNode } from 'react'

function MapPlaceholder({ children, style }: { children?: ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 180,
          borderRadius: 16,
        },
        style,
      ]}
    >
      <Text style={{ color: 'rgba(205,225,212,0.62)', fontSize: 12 }}>
        Mapa disponible solo en iOS/Android
      </Text>
      {children}
    </View>
  )
}

export default MapPlaceholder
export const Marker = () => null
export const Circle = () => null
export const Polyline = () => null
export const PROVIDER_GOOGLE = 'google'

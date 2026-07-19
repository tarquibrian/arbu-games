import type { ReactNode } from 'react'
import { View } from 'react-native'
import { SolidPinIcon } from './Icons'

// Silueta única de marker (teardrop sólido) reusada en Mapear/Explorar/Verificar —
// antes cada pantalla dibujaba su propio composite círculo+cola, con formas distintas
// entre sí. El ícono/texto que se le pase queda centrado en la "cabeza" del pin.
export function MapPin({ size = 34, color, children }: { size?: number; color: string; children?: ReactNode }) {
  return (
    <View style={{ width: size, height: size }}>
      <SolidPinIcon size={size} color={color} />
      {children ? (
        <View style={{ position: 'absolute', top: size * 0.26, left: 0, right: 0, alignItems: 'center' }}>
          {children}
        </View>
      ) : null}
    </View>
  )
}

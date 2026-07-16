import { View, Text } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// Tarjeta con el código de redención (ARBU-XXXX) que el usuario presenta en el comercio.
// El patrón "QR" es decorativo por ahora; el dato válido es el code. (TODO: QR real del code.)
export function CouponCodeCard({ code }: { code: string }) {
  return (
    <View className="bg-white p-3 rounded-2xl items-center justify-center">
      <Svg width={120} height={120} viewBox="0 0 100 100">
        <Path d="M10 10h20v20h-20zm0 40h20v20h-20zm40 0h20v20h-20zm0-40h20v20h-20z" fill="#04230f" />
        <Path d="M70 10h20v20H70zm0 70h20v20H70zm-40 0h20v20h-20zm20-20h20v20h-20z" fill="#04230f" />
        <Path d="M30 30h10v10H30zm30 10h10v10H60zm-10 10h10v10H50z" fill="#04230f" />
      </Svg>
      <Text className="text-[#04230f] font-mono font-bold text-sm tracking-widest mt-2 uppercase">
        {code}
      </Text>
    </View>
  )
}

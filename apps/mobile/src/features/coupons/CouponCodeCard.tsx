import { View, Text } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

// Tarjeta con el QR + código de redención (ARBU-XXXX) que el usuario presenta en el
// comercio. El QR codifica el mismo redemption_code que valida validate_redemption() —
// el comercio lo escanea (o lo tipea a mano si no tiene cámara a mano).
export function CouponCodeCard({ code }: { code: string }) {
  return (
    <View className="bg-white p-4 rounded-2xl items-center justify-center">
      <QRCode value={code} size={140} color="#04230f" backgroundColor="#ffffff" />
      <Text className="text-[#04230f] font-mono font-bold text-sm tracking-widest mt-3 uppercase">
        {code}
      </Text>
    </View>
  )
}

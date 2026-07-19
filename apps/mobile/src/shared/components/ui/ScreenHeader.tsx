import { View, Text, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle?: string
  onBack: () => void
}) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="flex-row items-center px-5 py-4 bg-[#08160e]/95 border-b border-green-950/30 z-10"
      style={{ paddingTop: insets.top }}
    >
      <TouchableOpacity onPress={onBack} className="mr-4 w-10 h-10 rounded-full bg-[#122e20] items-center justify-center border border-green-900">
        <Text className="text-white text-base">←</Text>
      </TouchableOpacity>
      <View className="flex-1">
        <Text className="text-white font-bold text-lg">{title}</Text>
        {subtitle ? <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text> : null}
      </View>
    </View>
  )
}

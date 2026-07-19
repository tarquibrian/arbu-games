import { View, Text } from 'react-native'

export function StatTile({ value, label, color = '#eaf6ee' }: { value: string | number; label: string; color?: string }) {
  return (
    <View className="flex-1 items-center">
      <Text style={{ color }} className="text-lg font-extrabold">{value}</Text>
      <Text className="text-gray-400 text-[10px] text-center mt-0.5">{label}</Text>
    </View>
  )
}

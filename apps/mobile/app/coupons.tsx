import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CouponCodeCard } from '@/features/coupons/CouponCodeCard'
import {
  listMyRedemptions,
  redemptionState,
  type RedemptionWithCoupon,
  type RedemptionState,
} from '@/features/coupons/api'

const STATE_META: Record<RedemptionState, { label: string; color: string; bg: string }> = {
  active:  { label: 'Activo',   color: '#2fe06a', bg: 'rgba(47,224,106,0.12)' },
  used:    { label: 'Usado',    color: '#9db8a6', bg: 'rgba(157,184,166,0.12)' },
  expired: { label: 'Expirado', color: '#ff8a8a', bg: 'rgba(255,138,138,0.12)' },
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export default function CouponsScreen() {
  const insets = useSafeAreaInsets()
  const [openCode, setOpenCode] = useState<{ code: string; title: string } | null>(null)

  const q = useQuery({ queryKey: ['redemptions'], queryFn: listMyRedemptions })
  const items = q.data ?? []

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 w-10 h-10 rounded-full bg-[#122e20] items-center justify-center border border-green-900"
          >
            <Text className="text-white text-base">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Mis Cupones</Text>
        </View>

        {q.isLoading ? (
          <View className="items-center py-16"><ActivityIndicator color="#2fe06a" /></View>
        ) : q.isError ? (
          <View className="bg-[#0d2419] border border-red-500/20 rounded-2xl p-6 items-center">
            <Text className="text-red-400 text-sm">No se pudieron cargar tus cupones.</Text>
            <TouchableOpacity onPress={() => q.refetch()} className="mt-3 bg-[#122e20] px-4 py-2 rounded-lg">
              <Text className="text-[#2fe06a] text-xs font-bold">Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View className="bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-8 items-center">
            <Text className="text-gray-400 text-sm text-center">Aún no canjeaste cupones.{'\n'}Canjeá ArbuCoins en la Billetera Verde.</Text>
            <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2fe06a] px-5 py-2.5 rounded-xl">
              <Text className="text-[#04230f] text-xs font-bold">Ir al catálogo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((r) => {
            const st = redemptionState(r)
            const meta = STATE_META[st]
            const dleft = st === 'active' ? daysLeft(r.use_expires_at) : null
            const canShow = st !== 'expired'
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={canShow ? 0.7 : 1}
                onPress={() => canShow && setOpenCode({ code: r.redemption_code, title: r.coupon?.title ?? 'Cupón' })}
                className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-white font-bold text-base leading-5">{r.coupon?.title ?? 'Cupón'}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{r.coupon?.merchant?.name ?? ''}</Text>
                    <Text className="text-gray-500 font-mono text-xs mt-2">{r.redemption_code}</Text>
                    {st === 'active' && dleft != null ? (
                      <Text className="text-[#2fe06a] text-[11px] mt-1">
                        {dleft > 0 ? `Vence en ${dleft} día${dleft === 1 ? '' : 's'}` : 'Vence hoy'}
                      </Text>
                    ) : null}
                  </View>
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: meta.bg }}>
                    <Text className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</Text>
                  </View>
                </View>
                {canShow ? (
                  <Text className="text-[#2fe06a] text-[11px] font-semibold mt-3">Toca para ver el código →</Text>
                ) : null}
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* Reabrir código */}
      <Modal visible={openCode !== null} transparent animationType="fade" onRequestClose={() => setOpenCode(null)}>
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="bg-[#0d2419] border border-[#2fe06a]/30 w-full max-w-sm rounded-3xl p-6 items-center">
            <Text className="text-white text-lg font-bold text-center mb-4">{openCode?.title}</Text>
            {openCode ? <CouponCodeCard code={openCode.code} /> : null}
            <Text className="text-gray-400 text-[11px] text-center my-5">
              Presenta este código en el comercio para validar tu beneficio.
            </Text>
            <TouchableOpacity className="bg-[#2fe06a] w-full rounded-xl py-3 items-center" onPress={() => setOpenCode(null)}>
              <Text className="text-[#04230f] font-bold text-sm">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  WalletIcon,
  CoffeeIcon,
  BikeIcon,
  CactusIcon,
  FilmIcon,
  CheckIcon,
  LeafIcon,
} from '@/shared/components/ui/Icons'
import { CouponCodeCard } from '@/features/coupons/CouponCodeCard'
import {
  listCoupons,
  getMyBalance,
  redeemCoupon,
  type CouponWithMerchant,
} from '@/features/coupons/api'

// Ícono por categoría del comercio (los cupones no traen ícono propio).
function iconForCategory(cat: string | null) {
  switch (cat) {
    case 'Cafetería':
    case 'Cafeterías': return CoffeeIcon
    case 'Deportes': return BikeIcon
    case 'Plantas': return CactusIcon
    case 'Entretenimiento': return FilmIcon
    default: return LeafIcon
  }
}

type SuccessInfo = { title: string; store: string; code: string; onSite: boolean }

export default function RewardsScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState('Todo')
  const [success, setSuccess] = useState<SuccessInfo | null>(null)

  const balanceQ = useQuery({ queryKey: ['balance'], queryFn: getMyBalance })
  const couponsQ = useQuery({ queryKey: ['coupons'], queryFn: listCoupons })
  const balance = balanceQ.data ?? 0

  const redeemM = useMutation({
    mutationFn: (coupon: CouponWithMerchant) => redeemCoupon(coupon.id),
    onSuccess: (redemption, coupon) => {
      setSuccess({
        title: coupon.title,
        store: coupon.merchant?.name ?? '',
        code: redemption.redemption_code,
        onSite: coupon.redemption_location === 'on_site',
      })
      qc.invalidateQueries({ queryKey: ['balance'] })
      qc.invalidateQueries({ queryKey: ['coupons'] })
      qc.invalidateQueries({ queryKey: ['redemptions'] })
    },
    onError: (e: any) => {
      Alert.alert('No se pudo canjear', e?.message ?? 'Intenta de nuevo.')
    },
  })

  const coupons = couponsQ.data ?? []
  const categories = useMemo(() => {
    const cats = Array.from(new Set(coupons.map((c) => c.category).filter(Boolean))) as string[]
    return ['Todo', ...cats]
  }, [coupons])

  const filtered = coupons.filter(
    (c) => selectedCategory === 'Todo' || c.category === selectedCategory
  )

  const handleRedeem = (coupon: CouponWithMerchant) => {
    if (redeemM.isPending) return
    if (balance < coupon.price_coins) {
      Alert.alert('Saldo Insuficiente', 'Mapea y verifica más árboles para ganar ArbuCoins.')
      return
    }
    redeemM.mutate(coupon)
  }

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-white text-2xl font-bold font-sans">Billetera Verde</Text>
            <Text className="text-gray-400 text-sm mt-1">Gana ArbuCoins cuidando el planeta y canjéalas por descuentos</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/coupons')}
            className="bg-[#0d2419] border border-[#2fe06a]/25 rounded-xl px-3 py-2 mt-1"
          >
            <Text className="text-[#2fe06a] font-bold text-xs">Mis Cupones</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/30 rounded-2xl p-6 mb-6 shadow-md items-center relative overflow-hidden">
          <View className="absolute -bottom-10 bg-[#2fe06a]/10 w-40 h-40 rounded-full blur-2xl" />
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1.5">Balance disponible</Text>
          <View className="flex-row items-center justify-center mb-1">
            <View className="mr-2">
              <WalletIcon size={28} color="#2fe06a" />
            </View>
            {balanceQ.isLoading
              ? <ActivityIndicator color="#2fe06a" />
              : <Text className="text-white text-4xl font-extrabold font-sans">{balance} AC</Text>}
          </View>
          <Text className="text-[#2fe06a] text-xs font-semibold">Equivalente aprox: {(balance / 10).toFixed(0)} Bs</Text>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-6 -mx-5 px-5"
          contentContainerStyle={{ gap: 8, paddingRight: 40 }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full border ${
                selectedCategory === cat ? 'bg-[#2fe06a] border-[#2fe06a]' : 'bg-[#0d2419] border-[#2fe06a]/10'
              }`}
            >
              <Text className={`text-xs font-bold ${selectedCategory === cat ? 'text-[#04230f]' : 'text-gray-300'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Catalog */}
        <Text className="text-white text-lg font-bold mb-4">Catálogo de Beneficios</Text>

        {couponsQ.isLoading ? (
          <View className="bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-8 items-center">
            <ActivityIndicator color="#2fe06a" />
          </View>
        ) : couponsQ.isError ? (
          <View className="bg-[#0d2419] border border-red-500/20 rounded-2xl p-6 items-center">
            <Text className="text-red-400 text-sm text-center">No se pudo cargar el catálogo.</Text>
            <TouchableOpacity onPress={() => couponsQ.refetch()} className="mt-3 bg-[#122e20] px-4 py-2 rounded-lg">
              <Text className="text-[#2fe06a] text-xs font-bold">Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View className="bg-[#0d2419] border border-[#2fe06a]/10 rounded-2xl p-8 items-center">
            <Text className="text-gray-400 text-sm">No hay recompensas en esta categoría por el momento</Text>
          </View>
        ) : (
          filtered.map((coupon) => {
            const Icon = iconForCategory(coupon.category)
            const affordable = balance >= coupon.price_coins
            const soldOut = coupon.quota_remaining != null && coupon.quota_remaining <= 0
            const busy = redeemM.isPending && redeemM.variables?.id === coupon.id
            return (
              <View key={coupon.id} className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 pr-4">
                    <View className="bg-[#122e20] w-12 h-12 rounded-2xl items-center justify-center mr-3">
                      <Icon size={22} color="#2fe06a" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-base leading-5">{coupon.title}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{coupon.merchant?.name ?? ''}</Text>
                    </View>
                  </View>
                  <View className="bg-green-950 px-3 py-1.5 rounded-xl border border-green-800">
                    <Text className="text-[#2fe06a] font-extrabold text-sm">{coupon.price_coins} AC</Text>
                  </View>
                </View>

                {coupon.description ? (
                  <Text className="text-gray-400 text-xs leading-5 my-2">{coupon.description}</Text>
                ) : null}

                <TouchableOpacity
                  disabled={busy || soldOut || !affordable}
                  className={`rounded-xl py-3 items-center mt-2 shadow-sm ${
                    soldOut || !affordable ? 'bg-[#2fe06a]/30' : 'bg-[#2fe06a]'
                  }`}
                  onPress={() => handleRedeem(coupon)}
                >
                  {busy ? (
                    <ActivityIndicator color="#04230f" />
                  ) : (
                    <Text className="text-[#04230f] font-extrabold text-sm">
                      {soldOut ? 'Agotado' : !affordable ? 'Saldo insuficiente' : 'Canjear Beneficio'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={success !== null} transparent animationType="fade" onRequestClose={() => setSuccess(null)}>
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="bg-[#0d2419] border border-[#2fe06a]/30 w-full max-w-sm rounded-3xl p-6 items-center shadow-2xl">
            <View className="bg-green-900/40 w-16 h-16 rounded-full items-center justify-center mb-4 border border-[#2fe06a]/20">
              <CheckIcon size={32} color="#2fe06a" />
            </View>
            <Text className="text-white text-xl font-bold text-center">¡Canje Exitoso!</Text>
            <Text className="text-gray-300 text-sm text-center mt-2 leading-5">
              Has canjeado <Text className="text-[#2fe06a] font-bold">{success?.title}</Text> de{' '}
              <Text className="text-white font-bold">{success?.store}</Text>.
            </Text>

            <View className="my-5">
              {success ? <CouponCodeCard code={success.code} /> : null}
            </View>

            <Text className="text-gray-400 text-[11px] text-center mb-5">
              {success?.onSite
                ? 'Presenta este código en el comercio para validar tu beneficio. Lo encontrás luego en “Mis Cupones”.'
                : 'Guardá este código. Lo encontrás luego en “Mis Cupones”.'}
            </Text>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                className="flex-1 bg-[#122e20] border border-[#2fe06a]/25 rounded-xl py-3 items-center"
                onPress={() => { setSuccess(null); router.push('/coupons') }}
              >
                <Text className="text-[#2fe06a] font-bold text-sm">Mis Cupones</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#2fe06a] rounded-xl py-3 items-center"
                onPress={() => setSuccess(null)}
              >
                <Text className="text-[#04230f] font-bold text-sm">Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

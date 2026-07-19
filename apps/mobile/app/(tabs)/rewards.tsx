import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T } from '@/shared/theme'
import { Card, HeroCard, PrimaryButton, Chip, SectionTitle, IconWell } from '@/shared/components/ui/Kit'
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
    <View className="flex-1 bg-canvas">
      <ScreenBackground variant="black" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 104,
          paddingHorizontal: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-body text-[26px] font-extrabold" style={{ letterSpacing: -0.5 }}>
              Billetera Verde
            </Text>
            <Text className="text-muted text-sm mt-1.5 leading-5">
              Gana ArbuCoins cuidando el planeta y canjéalas por descuentos
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/coupons')}
            activeOpacity={0.8}
            className="bg-surface border border-hairline rounded-xl px-3.5 py-2.5 mt-1"
          >
            <Text className="text-leaf font-bold text-xs">Mis Cupones</Text>
          </TouchableOpacity>
        </View>

        {/* Balance hero */}
        <HeroCard className="p-6 items-center" style={{ marginBottom: 24 }}>
          <Text className="text-leaf text-[11px] font-bold uppercase mb-2" style={{ letterSpacing: 2 }}>
            Balance disponible
          </Text>
          <View className="flex-row items-center justify-center mb-1.5">
            <View className="mr-2.5">
              <WalletIcon size={26} color={T.bright} />
            </View>
            {balanceQ.isLoading
              ? <ActivityIndicator color={T.bright} />
              : (
                <Text className="text-body text-[38px] font-extrabold" style={{ letterSpacing: -1 }}>
                  {balance} <Text className="text-[22px] text-leaf">AC</Text>
                </Text>
              )}
          </View>
          <Text className="text-muted text-xs">≈ {(balance / 10).toFixed(0)} Bs en beneficios</Text>
        </HeroCard>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-[22px] mb-6"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingRight: 44 }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>

        {/* Catalog */}
        <SectionTitle title="Catálogo de Beneficios" />

        {couponsQ.isLoading ? (
          <Card className="p-8 items-center rounded-2xl">
            <ActivityIndicator color={T.bright} />
          </Card>
        ) : couponsQ.isError ? (
          <Card className="p-6 items-center rounded-2xl">
            <Text className="text-red-400 text-sm text-center">No se pudo cargar el catálogo.</Text>
            <TouchableOpacity
              onPress={() => couponsQ.refetch()}
              className="mt-3 bg-surface-hi px-4 py-2 rounded-lg"
            >
              <Text className="text-leaf text-xs font-bold">Reintentar</Text>
            </TouchableOpacity>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 items-center rounded-2xl">
            <Text className="text-muted text-sm text-center">
              No hay recompensas en esta categoría por el momento
            </Text>
          </Card>
        ) : (
          filtered.map((coupon) => {
            const Icon = iconForCategory(coupon.category)
            const affordable = balance >= coupon.price_coins
            const soldOut = coupon.quota_remaining != null && coupon.quota_remaining <= 0
            const busy = redeemM.isPending && redeemM.variables?.id === coupon.id
            return (
              <Card
                key={coupon.id}
                variant={soldOut ? 'dim' : 'default'}
                className="p-4 mb-3.5 rounded-2xl"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 pr-3">
                    <IconWell size={46} className="mr-3" dim={soldOut}>
                      <Icon size={21} color={soldOut ? T.faint : T.bright} />
                    </IconWell>
                    <View className="flex-1">
                      <Text className={`font-bold text-[15px] leading-5 ${soldOut ? 'text-faint' : 'text-body'}`}>
                        {coupon.title}
                      </Text>
                      <Text className={`text-xs mt-0.5 ${soldOut ? 'text-faint' : 'text-muted'}`}>
                        {coupon.merchant?.name ?? ''}
                      </Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1.5 rounded-full ${soldOut ? 'bg-surface-hi' : 'bg-well'}`}>
                    <Text className={`font-extrabold text-sm ${soldOut ? 'text-faint' : 'text-leaf'}`}>
                      {coupon.price_coins} AC
                    </Text>
                  </View>
                </View>

                {coupon.description ? (
                  <Text className="text-muted text-xs leading-5 mb-3 mt-1">{coupon.description}</Text>
                ) : (
                  <View className="h-2" />
                )}

                <PrimaryButton
                  title={soldOut ? 'Agotado' : !affordable ? 'Saldo insuficiente' : 'Canjear Beneficio'}
                  disabled={busy || soldOut || !affordable}
                  loading={busy}
                  onPress={() => handleRedeem(coupon)}
                />
              </Card>
            )
          })
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={success !== null} transparent animationType="fade" onRequestClose={() => setSuccess(null)}>
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View
            className="w-full max-w-sm rounded-3xl p-6 items-center border border-hairline"
            style={{ backgroundColor: '#0c2013' }}
          >
            <IconWell size={64} className="mb-4">
              <CheckIcon size={30} color={T.bright} />
            </IconWell>
            <Text className="text-body text-xl font-extrabold text-center" style={{ letterSpacing: -0.3 }}>
              ¡Canje Exitoso!
            </Text>
            <Text className="text-muted text-sm text-center mt-2 leading-5">
              Has canjeado <Text className="text-leaf font-bold">{success?.title}</Text> de{' '}
              <Text className="text-body font-bold">{success?.store}</Text>.
            </Text>

            <View className="my-5">
              {success ? <CouponCodeCard code={success.code} /> : null}
            </View>

            <Text className="text-faint text-[11px] text-center mb-5 leading-4">
              {success?.onSite
                ? 'Presenta este código en el comercio para validar tu beneficio. Lo encontrás luego en “Mis Cupones”.'
                : 'Guardá este código. Lo encontrás luego en “Mis Cupones”.'}
            </Text>

            <View className="flex-row gap-3 w-full items-center">
              <TouchableOpacity
                className="flex-1 bg-surface-hi border border-hairline-2 rounded-2xl py-3 items-center"
                onPress={() => { setSuccess(null); router.push('/coupons') }}
              >
                <Text className="text-leaf font-bold text-sm">Mis Cupones</Text>
              </TouchableOpacity>
              <View className="flex-1">
                <PrimaryButton title="Entendido" onPress={() => setSuccess(null)} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

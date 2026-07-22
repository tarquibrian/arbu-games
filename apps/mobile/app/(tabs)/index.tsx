import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMyStats } from '@/features/profile/api'
import {
  listDailyMissions,
  claimMission,
  missionsResetLabel,
  type DailyMission,
} from '@/features/missions/api'
import { T, CTA_GRADIENT } from '@/shared/theme'
import { Card, HeroCard, PrimaryButton, SectionTitle, IconWell } from '@/shared/components/ui/Kit'
import {
  WalletIcon,
  LeafIcon,
  SearchIcon,
  CheckIcon,
} from '@/shared/components/ui/Icons'
import { listCoupons } from '@/features/coupons/api'
import { iconForCategory } from '@/features/coupons/categoryIcon'

// Ícono por tipo de misión — mapear y verificar son acciones distintas y el
// usuario tiene que poder distinguirlas sin leer.
function iconForKind(kind: DailyMission['kind']) {
  switch (kind) {
    case 'verify_trees': return SearchIcon
    case 'close_validation': return CheckIcon
    default: return LeafIcon
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const statsQ = useQuery({ queryKey: ['myStats'], queryFn: getMyStats })
  const missionsQ = useQuery({ queryKey: ['dailyMissions'], queryFn: listDailyMissions })
  const s = statsQ.data
  const rank = 'Guardián del Valle'
  const inLevel = s ? s.points - s.levelFloor : 0
  const levelSpan = s ? s.nextLevelAt - s.levelFloor : 100
  const progress = s ? inLevel / levelSpan : 0

  const claimM = useMutation({
    mutationFn: (m: DailyMission) => claimMission(m.mission_id),
    onSuccess: ({ coins }, m) => {
      qc.invalidateQueries({ queryKey: ['dailyMissions'] })
      qc.invalidateQueries({ queryKey: ['myStats'] })
      qc.invalidateQueries({ queryKey: ['balance'] })
      Alert.alert('¡Misión completada!', `${m.title} · +${coins} ArbuCoins`)
    },
    onError: (e: any) => {
      // El servidor recalcula el progreso al reclamar: si acá llega un error es
      // que el estado en pantalla quedó viejo. Refrescar es la respuesta útil.
      qc.invalidateQueries({ queryKey: ['dailyMissions'] })
      Alert.alert('No se pudo reclamar', e?.message ?? 'Intenta de nuevo.')
    },
  })

  const missions = missionsQ.data ?? []

  // Destacadas = las dos más baratas del catálogo real. Lo más barato es lo
  // más alcanzable, que es lo que tiene sentido mostrar como anzuelo.
  const couponsQ = useQuery({ queryKey: ['coupons'], queryFn: listCoupons })
  const featured = (couponsQ.data ?? []).slice(0, 2)

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
        <View className="flex-row justify-between items-center mb-7">
          <View>
            <Text className="text-muted text-sm font-medium">¡Hola de nuevo!</Text>
            <Text
              className="text-body text-[26px] font-extrabold"
              style={{ letterSpacing: -0.5 }}
            >
              @{s?.username ?? '…'}
            </Text>
          </View>
          <View className="bg-surface border border-hairline rounded-full pl-3.5 pr-4 py-2 flex-row items-center">
            <View className="mr-2">
              <WalletIcon size={16} color={T.bright} />
            </View>
            <Text className="text-body font-bold text-sm">{s?.coins ?? 0} AC</Text>
          </View>
        </View>

        {/* Level hero */}
        <HeroCard className="p-5" style={{ marginBottom: 26 }}>
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-leaf text-[11px] font-bold uppercase" style={{ letterSpacing: 2 }}>
                {rank}
              </Text>
              <Text className="text-body text-xl font-extrabold mt-1" style={{ letterSpacing: -0.4 }}>
                Nivel {s?.level ?? 1}
              </Text>
            </View>
            <View className="bg-well rounded-full px-3.5 py-1.5">
              <Text className="text-leaf text-xs font-bold">{s?.points ?? 0} pts</Text>
            </View>
          </View>

          {/* Progress — gradient fill, same language as the CTA */}
          <View className="h-[7px] w-full bg-black/30 rounded-full overflow-hidden mb-2.5">
            <LinearGradient
              colors={[...CTA_GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                height: '100%',
                borderRadius: 100,
                width: `${Math.max(Math.min(progress * 100, 100), 2)}%`,
              }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted text-xs">{inLevel} / {levelSpan} pts</Text>
            <Text className="text-muted text-xs">
              {levelSpan - inLevel} pts para Nivel {(s?.level ?? 1) + 1}
            </Text>
          </View>
        </HeroCard>

        {/* Quick actions */}
        <View className="flex-row gap-3.5 mb-7">
          {[
            { title: 'Mapear Árbol', desc: 'Registrar ejemplar', Icon: LeafIcon, to: '/tree/new' as const },
            { title: 'Verificar Árbol', desc: 'Validación 1+3', Icon: SearchIcon, to: '/tree/verify' as const },
          ].map((a) => (
            <Pressable
              key={a.title}
              className="flex-1"
              onPress={() => router.push(a.to)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Card className="p-4 items-center rounded-2xl">
                <IconWell className="mb-2.5">
                  <a.Icon size={23} color={T.bright} />
                </IconWell>
                <Text className="text-body font-bold text-sm">{a.title}</Text>
                <Text className="text-muted text-xs mt-1 text-center">{a.desc}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Misiones diarias — progreso calculado por el servidor sobre los árboles
            y verificaciones del día; el cliente no lleva contador propio. */}
        <View className="mb-7">
          <SectionTitle title="Misiones Diarias" action={missionsResetLabel()} />

          {missionsQ.isLoading ? (
            <Card className="p-8 items-center rounded-2xl">
              <ActivityIndicator color={T.bright} />
            </Card>
          ) : missionsQ.isError ? (
            <Card className="p-6 items-center rounded-2xl">
              <Text className="text-red-400 text-sm text-center">No se pudieron cargar las misiones.</Text>
              <Pressable onPress={() => missionsQ.refetch()} className="mt-3 bg-surface-hi px-4 py-2 rounded-lg">
                <Text className="text-leaf text-xs font-bold">Reintentar</Text>
              </Pressable>
            </Card>
          ) : missions.length === 0 ? (
            <Card className="p-6 items-center rounded-2xl">
              <Text className="text-muted text-sm text-center">No hay misiones activas hoy.</Text>
            </Card>
          ) : (
            missions.map((mission) => {
              const Icon = iconForKind(mission.kind)
              const busy = claimM.isPending && claimM.variables?.mission_id === mission.mission_id
              const ratio = Math.min(mission.progress / mission.target, 1)
              return (
                <Card
                  key={mission.mission_id}
                  variant={mission.claimed ? 'dim' : 'default'}
                  className="p-4 rounded-2xl mb-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-3">
                      <IconWell size={40} className="mr-3" dim={mission.claimed}>
                        {mission.claimed ? (
                          <CheckIcon size={18} color={T.faint} />
                        ) : (
                          <Icon size={20} color={T.bright} />
                        )}
                      </IconWell>
                      <View className="flex-1">
                        <Text className={`font-bold text-sm ${mission.claimed ? 'text-faint' : 'text-body'}`}>
                          {mission.title}
                        </Text>
                        <Text
                          className={`text-xs mt-0.5 ${mission.claimed ? 'text-faint' : 'text-muted'}`}
                          numberOfLines={1}
                        >
                          {mission.description}
                        </Text>
                      </View>
                    </View>

                    {mission.claimed ? (
                      <View className="flex-row items-center px-2.5 py-1 rounded-full bg-surface-hi">
                        <CheckIcon size={11} color={T.leaf} />
                        <Text className="text-muted text-xs font-bold ml-1">Reclamado</Text>
                      </View>
                    ) : mission.completed ? (
                      <PrimaryButton
                        title={`Reclamar ${mission.reward_coins} AC`}
                        size="sm"
                        loading={busy}
                        onPress={() => claimM.mutate(mission)}
                      />
                    ) : (
                      <View className="px-2.5 py-1 rounded-full bg-well">
                        <Text className="text-leaf text-xs font-bold">+{mission.reward_coins} AC</Text>
                      </View>
                    )}
                  </View>

                  {/* La barra es el punto: "1 de 3" es lo que hace volver mañana.
                      En las reclamadas sobra ruido, así que se oculta. */}
                  {!mission.claimed ? (
                    <View className="mt-3">
                      <View className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
                        <LinearGradient
                          colors={[...CTA_GRADIENT]}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={{ height: '100%', borderRadius: 100, width: `${Math.max(ratio * 100, 2)}%` }}
                        />
                      </View>
                      <Text className="text-faint text-[11px] mt-1.5">
                        {mission.progress} / {mission.target}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              )
            })
          )}
        </View>

        {/* Featured rewards */}
        <View className="mb-7">
          <SectionTitle
            title="Recompensas Destacadas"
            action="Ver catálogo"
            onAction={() => router.push('/(tabs)/rewards')}
          />

          {couponsQ.isLoading ? (
            <Card className="p-8 items-center rounded-2xl">
              <ActivityIndicator color={T.bright} />
            </Card>
          ) : featured.length === 0 ? (
            <Card className="p-6 items-center rounded-2xl">
              <Text className="text-muted text-sm text-center">Todavía no hay beneficios cargados.</Text>
            </Card>
          ) : (
            <View className="flex-row gap-3.5">
              {featured.map((coupon) => {
                const Icon = iconForCategory(coupon.category)
                return (
                  <Card key={coupon.id} className="flex-1 p-4 rounded-2xl">
                    <IconWell size={40} className="mb-3">
                      <Icon size={19} color={T.bright} />
                    </IconWell>
                    <Text className="text-body font-bold text-sm" numberOfLines={1}>
                      {coupon.merchant?.name ?? ''}
                    </Text>
                    <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
                      {coupon.title}
                    </Text>
                    <View className="flex-row justify-between items-center mt-3.5 pt-3 border-t border-hairline-2">
                      <Text className="text-leaf font-bold text-xs">{coupon.price_coins} AC</Text>
                      <PrimaryButton
                        title="Ver"
                        size="sm"
                        onPress={() => router.push('/(tabs)/rewards')}
                      />
                    </View>
                  </Card>
                )
              })}
            </View>
          )}
        </View>

        {/* News */}
        <View className="mb-6">
          <SectionTitle title="Noticias Verdes" />
          <Card className="p-4 rounded-2xl">
            <View className="flex-row items-center mb-2.5">
              <View className="bg-well rounded-full px-2.5 py-0.5 mr-2">
                <Text className="text-leaf text-xs font-bold">Cochabamba</Text>
              </View>
              <Text className="text-faint text-xs">Ayer</Text>
            </View>
            <Text className="text-body font-bold text-sm mb-1">
              Campaña de reforestación masiva en la zona norte
            </Text>
            <Text className="text-muted text-xs leading-5">
              Esta semana la comunidad de Arbu Games ha validado más de 120 nuevos Jacarandás en
              Queru Queru. ¡Felicidades a todos los Guardianes!
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}

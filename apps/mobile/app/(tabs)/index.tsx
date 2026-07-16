import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMyStats } from '@/features/profile/api'
import { T, CTA_GRADIENT } from '@/shared/theme'
import { Card, HeroCard, PrimaryButton, SectionTitle, IconWell } from '@/shared/components/ui/Kit'
import {
  WalletIcon,
  LeafIcon,
  SearchIcon,
  CoffeeIcon,
  BikeIcon,
  CheckIcon,
} from '@/shared/components/ui/Icons'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const statsQ = useQuery({ queryKey: ['myStats'], queryFn: getMyStats })
  const s = statsQ.data
  const rank = 'Guardián del Valle'
  const inLevel = s ? s.points - s.levelFloor : 0
  const levelSpan = s ? s.nextLevelAt - s.levelFloor : 100
  const progress = s ? inLevel / levelSpan : 0

  const dailyMissions = [
    {
      id: 'm1',
      title: 'Mapeador Iniciado',
      desc: 'Mapea 1 árbol nuevo en tu zona',
      reward: '50 AC',
      completed: false,
      Icon: LeafIcon,
    },
    {
      id: 'm2',
      title: 'Ojo de Halcón',
      desc: 'Verifica 2 árboles en Queru Queru',
      reward: '30 AC',
      completed: true,
      Icon: SearchIcon,
    },
  ]

  const featuredStores = [
    {
      id: 's1',
      name: 'Café Cocha',
      discount: '1 Café Express gratis',
      price: '150 AC',
      Icon: CoffeeIcon,
    },
    {
      id: 's2',
      name: 'BiciCochala',
      discount: '1 hora de alquiler',
      price: '200 AC',
      Icon: BikeIcon,
    },
  ]

  return (
    <View className="flex-1 bg-canvas">
      <ScreenBackground />

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

        {/* Daily missions */}
        <View className="mb-7">
          <SectionTitle title="Misiones Diarias" action="Actualiza en 12h" />

          {dailyMissions.map((mission) => (
            <Card
              key={mission.id}
              className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${
                mission.completed ? 'opacity-55' : ''
              }`}
            >
              <View className="flex-row items-center flex-1 pr-3">
                <IconWell size={40} className="mr-3">
                  {mission.completed ? (
                    <CheckIcon size={18} color={T.leaf} />
                  ) : (
                    <mission.Icon size={20} color={T.bright} />
                  )}
                </IconWell>
                <View className="flex-1">
                  <Text
                    className={`font-bold text-sm ${
                      mission.completed ? 'text-muted line-through' : 'text-body'
                    }`}
                  >
                    {mission.title}
                  </Text>
                  <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
                    {mission.desc}
                  </Text>
                </View>
              </View>
              <View className={`px-2.5 py-1 rounded-full ${mission.completed ? 'bg-surface' : 'bg-well'}`}>
                <Text className={`text-xs font-bold ${mission.completed ? 'text-faint' : 'text-leaf'}`}>
                  {mission.completed ? 'Completado' : `+${mission.reward}`}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Featured rewards */}
        <View className="mb-7">
          <SectionTitle
            title="Recompensas Destacadas"
            action="Ver catálogo"
            onAction={() => router.push('/(tabs)/rewards')}
          />

          <View className="flex-row gap-3.5">
            {featuredStores.map((store) => (
              <Card key={store.id} className="flex-1 p-4 rounded-2xl">
                <IconWell size={40} className="mb-3">
                  <store.Icon size={19} color={T.bright} />
                </IconWell>
                <Text className="text-body font-bold text-sm" numberOfLines={1}>
                  {store.name}
                </Text>
                <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
                  {store.discount}
                </Text>
                <View className="flex-row justify-between items-center mt-3.5 pt-3 border-t border-hairline-2">
                  <Text className="text-leaf font-bold text-xs">{store.price}</Text>
                  <PrimaryButton
                    title="Canjear"
                    size="sm"
                    onPress={() => router.push('/(tabs)/rewards')}
                  />
                </View>
              </Card>
            ))}
          </View>
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

import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMyStats, type MyStats } from '@/features/profile/api'
import { T, glow } from '@/shared/theme'
import { Card, SectionTitle, IconWell } from '@/shared/components/ui/Kit'
import {
  UserIcon,
  LeafIcon,
  SearchIcon,
  CO2Icon,
  BoltIcon,
  TrophyIcon,
  TicketIcon,
  LockIcon,
  ChevronRightIcon,
} from '@/shared/components/ui/Icons'

// Insignias derivadas de contadores reales (sin schema nuevo). La de racha sigue
// bloqueada hasta construir esa capa (13.6 Fase 2); la de top 3 ya usa el puesto
// histórico real del ranking.
function buildBadges(s: MyStats) {
  return [
    { id: 'b1', name: 'Primer Brote', desc: 'Mapea tu 1er árbol', Icon: LeafIcon, unlocked: s.mapped >= 1 },
    { id: 'b2', name: 'Inspector Verde', desc: 'Realiza 10 verificaciones', Icon: SearchIcon, unlocked: s.verifications >= 10 },
    { id: 'b3', name: 'Guardián Activo', desc: 'Mantén una racha de 7 días', Icon: BoltIcon, unlocked: false },
    { id: 'b4', name: 'Eco Héroe', desc: 'Entra al top 3 histórico', Icon: TrophyIcon, unlocked: s.place != null && s.place <= 3 },
    { id: 'b5', name: 'Silvicultor', desc: 'Mapea 50 árboles', Icon: LeafIcon, unlocked: s.mapped >= 50 },
    { id: 'b6', name: 'Oro Verde', desc: 'Canjea 5 recompensas', Icon: TicketIcon, unlocked: s.redemptions >= 5 },
  ]
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const SETTINGS_ROWS = ['Editar Perfil', 'Historial de Transacciones', 'Términos y Privacidad']

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const statsQ = useQuery({ queryKey: ['myStats'], queryFn: getMyStats })

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const s = statsQ.data
  const joined = s ? `Miembro desde ${MONTHS[new Date(s.createdAt).getMonth()]} ${new Date(s.createdAt).getFullYear()}` : ''
  const badges = s ? buildBadges(s) : []

  // "Verificaciones" son las que HIZO el usuario. Antes se mostraba
  // total_trees_validated, que es otra cosa: árboles propios que se validaron.
  const stats = [
    { label: 'Mapeados', value: `${s?.mapped ?? 0}`, Icon: LeafIcon },
    { label: 'Verificaciones', value: `${s?.verifications ?? 0}`, Icon: SearchIcon },
    { label: 'CO2 estim.', value: `${s?.co2Kg ?? 0} kg`, Icon: CO2Icon },
  ]

  return (
    <View className="flex-1 bg-canvas">
      <ScreenBackground variant="black" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 104,
          paddingHorizontal: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8">
          {/* Avatar — quiet glow ring instead of a hard 2px border */}
          <View style={[{ borderRadius: 48 }, glow(0.4, 16)]}>
            <View
              className="w-24 h-24 rounded-full bg-well items-center justify-center"
              style={{ borderWidth: 1.5, borderColor: 'rgba(120,230,150,0.45)' }}
            >
              <UserIcon size={36} color={T.bright} />
            </View>
          </View>
          <Text className="text-body text-[22px] font-extrabold mt-3.5" style={{ letterSpacing: -0.4 }}>
            @{s?.username ?? '…'}
          </Text>
          {s ? (
            <Text className="text-leaf text-xs font-bold mt-1">
              Nivel {s.level} · {s.points} pts{s.place ? ` · #${s.place} histórico` : ''}
            </Text>
          ) : null}
          {joined ? (
            <View className="bg-surface border border-hairline-2 rounded-full px-3.5 py-1.5 mt-3">
              <Text className="text-muted text-[10px] font-bold uppercase" style={{ letterSpacing: 1.5 }}>
                {joined}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        {statsQ.isLoading ? (
          <View className="items-center py-8 mb-8"><ActivityIndicator color={T.bright} /></View>
        ) : (
          <View className="flex-row gap-3 mb-8">
            {stats.map((st) => (
              <Card key={st.label} className="flex-1 p-4 items-center rounded-2xl">
                <st.Icon size={24} color={T.bright} />
                <Text className="text-body text-xl font-extrabold mt-2" style={{ letterSpacing: -0.4 }}>
                  {st.value}
                </Text>
                <Text
                  className="text-faint text-[10px] font-bold uppercase mt-0.5 text-center"
                  style={{ letterSpacing: 1 }}
                >
                  {st.label}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Badges */}
        <View className="mb-8">
          <SectionTitle title="Mis Logros e Insignias" />

          <View className="flex-row flex-wrap justify-between" style={{ rowGap: 14 }}>
            {badges.map((badge) => (
              <Card
                key={badge.id}
                variant={badge.unlocked ? 'default' : 'dim'}
                className="w-[48%] p-4 items-center rounded-2xl"
              >
                <IconWell size={46} className="mb-2.5" dim={!badge.unlocked}>
                  {badge.unlocked ? (
                    <badge.Icon size={21} color={T.bright} />
                  ) : (
                    <LockIcon size={18} color={T.faint} />
                  )}
                </IconWell>
                <Text className={`font-bold text-center text-xs ${badge.unlocked ? 'text-body' : 'text-faint'}`}>
                  {badge.name}
                </Text>
                <Text
                  className={`text-[10px] text-center mt-1 leading-4 ${badge.unlocked ? 'text-muted' : 'text-faint'}`}
                >
                  {badge.desc}
                </Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Settings */}
        <Card className="px-4 py-1 mb-7 rounded-2xl">
          {SETTINGS_ROWS.map((label, i) => (
            <TouchableOpacity
              key={label}
              activeOpacity={0.7}
              className={`flex-row justify-between items-center py-4 ${
                i < SETTINGS_ROWS.length - 1 ? 'border-b border-hairline-2' : ''
              }`}
            >
              <Text className="text-body text-sm font-semibold">{label}</Text>
              <ChevronRightIcon size={17} color={T.faint} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Sign out */}
        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-surface border border-hairline-2 rounded-2xl py-4 items-center mb-8"
          onPress={handleSignOut}
        >
          <Text className="text-red-400/90 font-bold text-sm">Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

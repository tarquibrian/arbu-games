import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T } from '@/shared/theme'
import { Card } from '@/shared/components/ui/Kit'
import { CrownIcon } from '@/shared/components/ui/Icons'
import {
  listLeaderboard,
  getMyPosition,
  weekResetInfo,
  initialsOf,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from '@/features/ranking/api'

// Podium accents — metal tint per position, calibrated to read as solid metal
// blocks on the flat-black tab background (not the old ambient-glow gradient).
const PODIUM = {
  1: { height: 148, ring: 'rgba(255,176,32,0.85)', tint: 'rgba(255,176,32,0.30)', label: T.gold },
  2: { height: 108, ring: 'rgba(199,206,214,0.70)', tint: 'rgba(199,206,214,0.22)', label: T.silver },
  3: { height: 88, ring: 'rgba(208,138,78,0.70)', tint: 'rgba(208,138,78,0.24)', label: T.bronze },
} as const

// Qué hizo esa persona, en una línea. Puntos sin desglose no dicen si alguien
// mapea mucho o verifica mucho — que es la diferencia que el ranking premia.
function activityLine(r: Pick<LeaderboardRow, 'trees_mapped' | 'validations_done'>) {
  const parts: string[] = []
  if (r.trees_mapped > 0) parts.push(`${r.trees_mapped} mapeado${r.trees_mapped === 1 ? '' : 's'}`)
  if (r.validations_done > 0) parts.push(`${r.validations_done} verificado${r.validations_done === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')

  const boardQ = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => listLeaderboard(period),
  })
  const meQ = useQuery({
    queryKey: ['leaderboardMe', period],
    queryFn: () => getMyPosition(period),
  })

  const list = boardQ.data ?? []
  const me = meQ.data
  const podium = list.slice(0, 3)
  const remaining = list.slice(3)
  // 2º a la izquierda, 1º al centro, 3º a la derecha
  const visualPodium = [podium[1], podium[0], podium[2]]
  const inTopList = !!me?.place && me.place <= list.length
  const reset = weekResetInfo()

  return (
    <View className="flex-1 bg-canvas">
      <ScreenBackground variant="black" />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 104 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-[22px] mb-6">
          <Text className="text-body text-[26px] font-extrabold" style={{ letterSpacing: -0.5 }}>
            Tabla de Posiciones
          </Text>
          <Text className="text-muted text-sm mt-1.5 leading-5">
            {period === 'week'
              ? `Semana en curso · ${reset.label}`
              : 'Todo lo acumulado desde el inicio'}
          </Text>
        </View>

        {/* Semanal / Histórico */}
        <View className="px-[22px] mb-8">
          <View className="flex-row bg-surface border border-hairline-2 rounded-2xl p-1">
            {([['week', 'Semanal'], ['all', 'Histórico']] as const).map(([key, label]) => {
              const active = period === key
              return (
                <Pressable key={key} onPress={() => setPeriod(key)} className="flex-1">
                  {active ? (
                    <LinearGradient
                      colors={[T.bright, T.brightDeep]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{ borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}
                    >
                      <Text className="font-extrabold text-sm text-ink">{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View className="py-[11px] items-center">
                      <Text className="font-bold text-sm text-muted">{label}</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>

        {boardQ.isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={T.bright} />
          </View>
        ) : boardQ.isError ? (
          <View className="px-[22px]">
            <Card className="p-6 items-center rounded-2xl">
              <Text className="text-red-400 text-sm text-center">No se pudo cargar el ranking.</Text>
              <Pressable onPress={() => boardQ.refetch()} className="mt-3 bg-surface-hi px-4 py-2 rounded-lg">
                <Text className="text-leaf text-xs font-bold">Reintentar</Text>
              </Pressable>
            </Card>
          </View>
        ) : list.length === 0 ? (
          // Vacío real, no una tabla de ceros: nadie sumó puntos en el período.
          <View className="px-[22px]">
            <Card className="p-8 items-center rounded-2xl">
              <Text className="text-body font-bold text-sm text-center">
                {period === 'week' ? 'Nadie sumó puntos esta semana' : 'Todavía no hay actividad'}
              </Text>
              <Text className="text-muted text-xs text-center mt-2 leading-5">
                Mapeá un árbol o verificá uno pendiente y encabezás la tabla.
              </Text>
            </Card>
          </View>
        ) : (
          <>
            {/* Podio */}
            <View className="flex-row items-end justify-center px-[22px] mb-8">
              {visualPodium.map((user, i) => {
                if (!user) return <View key={`empty-${i}`} className="flex-1 mx-1.5" />
                const p = PODIUM[Math.min(user.place, 3) as 1 | 2 | 3]
                const isMe = user.username === me?.username
                return (
                  <View key={user.user_id} className="items-center mx-1.5 flex-1">
                    {user.place === 1 && (
                      <View className="mb-1.5">
                        <CrownIcon size={18} color={T.gold} />
                      </View>
                    )}

                    <View
                      className="w-14 h-14 rounded-full items-center justify-center mb-2"
                      style={{ backgroundColor: p.tint, borderWidth: 1.5, borderColor: p.ring }}
                    >
                      <Text className="text-sm font-extrabold" style={{ color: user.place === 1 ? T.gold : T.text }}>
                        {initialsOf(user.username)}
                      </Text>
                    </View>

                    <Text className="text-body text-xs font-bold text-center w-20 mb-0.5" numberOfLines={1}>
                      {isMe ? 'Tú' : `@${user.username}`}
                    </Text>
                    <Text className="text-leaf text-[10px] font-bold mb-2.5">{user.points} pts</Text>

                    {/* Pilar — degradado translúcido que baja hasta un nivel aún visible
                        (surface-dim) para que lea como bloque, no como desvanecido */}
                    <LinearGradient
                      colors={[p.tint, 'rgba(255,255,255,0.055)']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{
                        width: '100%',
                        height: p.height,
                        borderTopLeftRadius: 18,
                        borderTopRightRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text className="text-2xl font-extrabold" style={{ color: p.label, letterSpacing: -0.5 }}>
                        {user.place}
                      </Text>
                      <Text className="text-faint text-[10px] mt-1 font-semibold text-center px-1">
                        {activityLine(user)}
                      </Text>
                    </LinearGradient>
                  </View>
                )
              })}
            </View>

            {/* Resto */}
            <View className="px-[22px]">
              {remaining.map((user) => {
                const isMe = user.username === me?.username
                return (
                  <Card
                    key={user.user_id}
                    className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${
                      isMe ? 'bg-well border-hairline' : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <Text className="text-faint font-bold text-sm w-6 text-center">{user.place}</Text>
                      <View className="w-10 h-10 rounded-full bg-surface-hi items-center justify-center mx-3">
                        <Text className="text-xs font-bold text-body">{initialsOf(user.username)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-body font-bold text-sm" numberOfLines={1}>
                          {isMe ? 'Tú' : `@${user.username}`}
                        </Text>
                        <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
                          {activityLine(user)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-leaf font-extrabold text-sm">{user.points} pts</Text>
                  </Card>
                )
              })}
            </View>
          </>
        )}

        {/* Tu posición — sólo si no aparecés arriba. Que el ranking no te diga
            dónde estás es la forma más rápida de volverlo irrelevante. */}
        {me && !inTopList && !(list.length === 0 && !me.place) ? (
          <View className="px-[22px] mt-2">
            <Card className="p-4 rounded-2xl bg-well border-hairline">
              {me.place ? (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 pr-3">
                    <Text className="text-faint font-bold text-sm w-8 text-center">{me.place}</Text>
                    <View className="w-10 h-10 rounded-full bg-surface-hi items-center justify-center mx-3">
                      <Text className="text-xs font-bold text-body">{initialsOf(me.username)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-body font-bold text-sm">Tú</Text>
                      <Text className="text-muted text-xs mt-0.5">
                        {activityLine(me)} · de {me.total_ranked} participantes
                      </Text>
                    </View>
                  </View>
                  <Text className="text-leaf font-extrabold text-sm">{me.points} pts</Text>
                </View>
              ) : (
                <View>
                  <Text className="text-body font-bold text-sm">
                    {period === 'week' ? 'No sumaste puntos esta semana' : 'Todavía no sumaste puntos'}
                  </Text>
                  <Text className="text-muted text-xs mt-1 leading-5">
                    Mapear un árbol o verificar uno pendiente te mete en la tabla.
                  </Text>
                </View>
              )}
            </Card>
          </View>
        ) : null}

        {/* Regla del juego: el ranking del MVP es estatus, no premio (13.6). */}
        <Text className="text-faint text-[11px] text-center px-[22px] mt-5 leading-4">
          Mapear suma puntos y verificar suma más. El ranking semanal se reinicia los lunes.
        </Text>
      </ScrollView>
    </View>
  )
}

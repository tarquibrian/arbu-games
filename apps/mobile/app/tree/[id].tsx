import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { goBack } from '@/shared/lib/navigation'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { ScreenHeader } from '@/shared/components/ui/ScreenHeader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LeafIcon, CheckIcon } from '@/shared/components/ui/Icons'
import { getTreeDetail, type TreeDetail, type TreeValidationEntry } from '@/features/trees/api'
import { appConfigQuery, DEFAULT_CONFIG } from '@/features/config/api'
import {
  HEALTH,
  healthLabel,
  heightLabel,
  contextLabel,
  urgencyLabel,
  conflictLabel,
} from '@/features/trees/vocab'

const FIELD_LABEL: Record<string, string> = {
  species: 'Especie',
  health: 'Estado fitosanitario',
  circumference_cm: 'Perímetro del tronco',
  height_band: 'Altura',
  site_context: 'Contexto',
  urgency: 'Urgencia',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Cómo respondió un participante ese campo — sirve para el árbol (registrante) y
// para cada verificación, que comparten nombres de columna.
function answerFor(field: string, src: TreeDetail | TreeValidationEntry): string {
  switch (field) {
    case 'species':
      return (src as any).species?.common_name ?? 'Sin opinión'
    case 'health':
      return healthLabel((src as any).health) ?? '—'
    case 'circumference_cm':
      return (src as any).circumference_cm != null ? `${(src as any).circumference_cm} cm` : 'Sin opinión'
    case 'height_band':
      return heightLabel((src as any).height_band) ?? 'Sin opinión'
    case 'site_context':
      return contextLabel((src as any).site_context) ?? 'Sin opinión'
    case 'urgency':
      return urgencyLabel((src as any).urgency) ?? 'Sin opinión'
    default:
      return '—'
  }
}

function Row({
  label,
  value,
  disputed = false,
  dot,
}: { label: string; value: string; disputed?: boolean; dot?: string }) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-green-950/70">
      <Text className="text-gray-400 text-xs flex-1 pr-3">{label}</Text>
      <View className="flex-row items-center">
        {dot ? <View className={`w-2.5 h-2.5 rounded-full mr-2 ${dot}`} /> : null}
        <Text className={`text-xs font-bold ${disputed ? 'text-yellow-400' : 'text-white'}`}>{value}</Text>
        {disputed ? (
          <View className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/15">
            <Text className="text-yellow-400 text-[10px] font-bold">sin acuerdo</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

export default function TreeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const cfg = useQuery(appConfigQuery).data ?? DEFAULT_CONFIG

  const treeQ = useQuery({
    queryKey: ['tree', id],
    queryFn: () => getTreeDetail(id!),
    enabled: !!id,
  })
  const t = treeQ.data

  if (treeQ.isLoading || !t) {
    return (
      <View className="flex-1 bg-[#08160e]">
        <ScreenBackground />
        <ScreenHeader title="Ficha del Árbol" subtitle="Cargando…" onBack={goBack} />
        <View className="flex-1 items-center justify-center">
          {treeQ.isError ? (
            <Text className="text-red-400 text-sm">No se pudo cargar el árbol.</Text>
          ) : (
            <ActivityIndicator color="#2fe06a" />
          )}
        </View>
      </View>
    )
  }

  const disputed = t.disputed_fields ?? []
  const isDisputed = (f: string) => disputed.includes(f)
  const validated = t.status === 'validated'
  const healthDot = HEALTH.find((h) => h.value === t.health)?.dot
  const speciesName = t.species?.common_name ?? t.species_name ?? 'Especie sin identificar'
  const canVerify = !validated && !t.isMine && !t.validatedByMe

  return (
    <View className="flex-1 bg-[#08160e]">
      <ScreenBackground />

      <ScreenHeader title="Ficha del Árbol" subtitle={speciesName} onBack={goBack} />

      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fotos — la copa manda, el tronco es la evidencia de la medida */}
        <View className="flex-row gap-3 mb-4">
          <Image source={{ uri: t.photo_url }} className="flex-1 h-44 rounded-2xl" resizeMode="cover" />
          {t.photo_trunk_url ? (
            <Image source={{ uri: t.photo_trunk_url }} className="w-24 h-44 rounded-2xl" resizeMode="cover" />
          ) : null}
        </View>

        {/* Encabezado + estado */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/20 rounded-3xl p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="bg-[#122e20] w-12 h-12 rounded-full items-center justify-center border border-green-900 mr-3">
              <LeafIcon size={22} color="#2fe06a" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold">{speciesName}</Text>
              {t.species?.scientific_name ? (
                <Text className="text-gray-400 text-[11px] italic mt-0.5">{t.species.scientific_name}</Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className={`px-3 py-1.5 rounded-full ${validated ? 'bg-green-900/40' : 'bg-yellow-500/15'}`}>
              <Text className={`text-xs font-bold ${validated ? 'text-[#2fe06a]' : 'text-yellow-400'}`}>
                {validated
                  ? 'Validado por la comunidad'
                  : `Pendiente · ${t.validations_count}/${cfg.validationThreshold} verificaciones`}
              </Text>
            </View>
            <Text className="text-gray-500 text-[11px]">
              {t.owner?.username ? `@${t.owner.username}` : ''}
            </Text>
          </View>
        </View>

        {/* Aviso de disputa — lo primero que tiene que ver quien use este dato */}
        {disputed.length > 0 ? (
          <View className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-4 mb-4">
            <Text className="text-yellow-400 text-xs font-bold mb-1">
              {disputed.length === 1 ? 'Un campo sin acuerdo' : `${disputed.length} campos sin acuerdo`}
            </Text>
            <Text className="text-gray-300 text-[11px] leading-4">
              Los participantes no coincidieron en {disputed.map((f) => (FIELD_LABEL[f] ?? f).toLowerCase()).join(', ')}.
              Se conserva lo que reportó quien lo registró, marcado como no consensuado.
            </Text>
          </View>
        ) : validated ? (
          <View className="bg-green-900/20 border border-[#2fe06a]/25 rounded-2xl p-4 mb-4 flex-row items-center">
            <CheckIcon size={16} color="#2fe06a" />
            <Text className="text-[#2fe06a] text-[11px] font-bold ml-2 flex-1 leading-4">
              Ficha confirmada: los {cfg.validationThreshold + 1} participantes coincidieron en todos los campos.
            </Text>
          </View>
        ) : null}

        {/* Ficha */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl px-5 py-2 mb-4">
          <Text className="text-white text-sm font-bold mt-3 mb-1">Información forestal</Text>

          <Row
            label="Perímetro del tronco"
            value={t.circumference_cm != null ? `${t.circumference_cm} cm` : 'No medido'}
            disputed={isDisputed('circumference_cm')}
          />
          <Row label="DAP (derivado)" value={`${t.dap} cm`} />
          <Row label="Altura" value={heightLabel(t.height_band) ?? 'Sin dato'} disputed={isDisputed('height_band')} />
          <Row
            label="Estado fitosanitario"
            value={healthLabel(t.health) ?? t.health}
            dot={healthDot}
            disputed={isDisputed('health')}
          />
          <Row
            label="Contexto"
            value={contextLabel(t.site_context) ?? 'Sin dato'}
            disputed={isDisputed('site_context')}
          />
          <Row
            label="Urgencia"
            value={urgencyLabel(t.urgency) ?? 'Nada urgente'}
            disputed={isDisputed('urgency')}
          />
          <Row
            label="Origen"
            value={
              t.origin === 'planted'
                ? `Plantado${t.planted_date ? ' · ' + formatDate(t.planted_date) : ''}`
                : 'Existente'
            }
          />

          <View className="py-3">
            <Text className="text-gray-400 text-xs mb-2">Conflictos con infraestructura</Text>
            {t.conflicts && t.conflicts.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {t.conflicts.map((c) => (
                  <View key={c} className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25">
                    <Text className="text-yellow-400 text-[11px] font-bold">{conflictLabel(c)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-gray-500 text-[11px]">Ninguno reportado</Text>
            )}
          </View>
        </View>

        {/* Cómo se llegó a estos datos — sin esto "sin acuerdo" es una etiqueta
            sin respaldo. Se listan las respuestas de cada participante. */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl p-5 mb-4">
          <Text className="text-white text-sm font-bold mb-1">Cómo se validó</Text>
          <Text className="text-gray-400 text-[11px] leading-4 mb-4">
            Cada participante respondió por su cuenta; el valor final salió por mayoría.
          </Text>

          <View className="flex-row items-center justify-between py-2.5 border-b border-green-950/70">
            <View className="flex-1 pr-3">
              <Text className="text-white text-xs font-bold">
                {t.owner?.username ? `@${t.owner.username}` : 'Registrante'}
              </Text>
              <Text className="text-gray-500 text-[11px] mt-0.5">Registró · {formatDate(t.created_at)}</Text>
            </View>
            <Text className="text-gray-400 text-[11px]">
              {t.circumference_cm != null ? `${t.circumference_cm} cm` : '—'} · {healthLabel(t.health)}
            </Text>
          </View>

          {t.validations.map((v) => (
            <View key={v.id} className="flex-row items-center justify-between py-2.5 border-b border-green-950/70">
              <View className="flex-1 pr-3">
                <Text className="text-white text-xs font-bold">
                  {v.verifier?.username ? `@${v.verifier.username}` : 'Verificador'}
                </Text>
                <Text className="text-gray-500 text-[11px] mt-0.5">Verificó · {formatDate(v.created_at)}</Text>
              </View>
              <Text className="text-gray-400 text-[11px]">
                {v.circumference_cm != null ? `${v.circumference_cm} cm` : '—'} · {healthLabel(v.health)}
              </Text>
            </View>
          ))}

          {t.validations.length === 0 ? (
            <Text className="text-gray-500 text-[11px] py-3">
              Todavía nadie lo verificó. Faltan {cfg.validationThreshold} verificaciones para validarlo.
            </Text>
          ) : null}

          {/* Detalle sólo de lo que no cerró */}
          {disputed.map((f) => (
            <View key={f} className="mt-4 bg-[#122e20] border border-yellow-500/20 rounded-2xl p-3.5">
              <Text className="text-yellow-400 text-[11px] font-bold mb-2">
                {FIELD_LABEL[f] ?? f} — respuestas
              </Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-[11px]">
                  {t.owner?.username ? `@${t.owner.username}` : 'Registrante'}
                </Text>
                <Text className="text-white text-[11px] font-bold">{answerFor(f, t)}</Text>
              </View>
              {t.validations.map((v) => (
                <View key={v.id} className="flex-row justify-between mb-1">
                  <Text className="text-gray-400 text-[11px]">
                    {v.verifier?.username ? `@${v.verifier.username}` : 'Verificador'}
                  </Text>
                  <Text className="text-white text-[11px] font-bold">{answerFor(f, v)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Procedencia del dato */}
        <View className="bg-[#0d2419] border border-[#2fe06a]/15 rounded-3xl px-5 py-2 mb-5">
          <Text className="text-white text-sm font-bold mt-3 mb-1">Registro</Text>
          <Row label="Coordenadas" value={`${t.latitude.toFixed(6)}, ${t.longitude.toFixed(6)}`} />
          <Row
            label="Precisión GPS"
            value={t.gps_accuracy != null ? `±${Math.round(t.gps_accuracy)} m` : 'Sin dato'}
          />
          <View className="flex-row justify-between items-center py-3">
            <Text className="text-gray-400 text-xs">Mapeado el</Text>
            <Text className="text-white text-xs font-bold">{formatDate(t.created_at)}</Text>
          </View>
        </View>

        {canVerify ? (
          <TouchableOpacity
            className="bg-[#2fe06a] rounded-xl py-3.5 items-center mb-3"
            onPress={() => router.push(`/tree/verify?treeId=${t.id}`)}
          >
            <Text className="text-[#04230f] font-extrabold text-sm">Verificar este árbol</Text>
          </TouchableOpacity>
        ) : t.isMine && !validated ? (
          <View className="bg-blue-900/20 border border-blue-500/25 rounded-xl py-3.5 items-center mb-3">
            <Text className="text-blue-400 font-bold text-sm">Es tu árbol — esperando verificadores</Text>
          </View>
        ) : t.validatedByMe && !validated ? (
          <View className="bg-green-900/20 border border-[#2fe06a]/25 rounded-xl py-3.5 items-center mb-3">
            <Text className="text-[#2fe06a] font-bold text-sm">Ya verificaste este árbol</Text>
          </View>
        ) : null}

        <TouchableOpacity
          className="bg-transparent border border-green-950 rounded-xl py-3.5 items-center"
          onPress={goBack}
        >
          <Text className="text-gray-300 text-sm">Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

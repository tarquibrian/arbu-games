// Controles compartidos por registrar y verificar. Ambas pantallas preguntan lo
// MISMO — es lo que hace comparable el consenso 1+3 — así que los controles viven
// en un solo lugar en vez de duplicarse con variaciones de redacción.
import { useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { CheckIcon, SearchIcon } from '@/shared/components/ui/Icons'
import { dapFromCircumference } from '../vocab'
import { isUnknownSpecies, type Species } from '@/features/species/api'

export function FieldLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <View className="mb-2.5">
      <Text className="text-white text-xs font-bold">{children}</Text>
      {hint ? <Text className="text-gray-400 text-[11px] mt-1 leading-4">{hint}</Text> : null}
    </View>
  )
}

type Option<T extends string> = { value: T; label: string; hint?: string; dot?: string }

export function OptionList<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: Option<T>[]
  value: T | null
  onChange: (v: T) => void
  compact?: boolean
}) {
  return (
    <View className="gap-2.5">
      {options.map((o) => {
        const active = value === o.value
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`border rounded-xl flex-row items-center justify-between ${compact ? 'px-4 py-3' : 'p-4'} ${
              active ? 'border-[#2fe06a] bg-green-900/20' : 'border-green-900 bg-[#122e20]'
            }`}
          >
            <View className="flex-row items-center flex-1 pr-3">
              {o.dot ? <View className={`w-3.5 h-3.5 rounded-full mr-3 ${o.dot}`} /> : null}
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">{o.label}</Text>
                {o.hint ? <Text className="text-gray-400 text-[11px] mt-0.5">{o.hint}</Text> : null}
              </View>
            </View>
            {active ? <CheckIcon size={16} color="#2fe06a" /> : null}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// Multi-selección (conflictos con infraestructura): son banderas independientes,
// no opciones excluyentes.
export function ChipGroup<T extends string>({
  options,
  values,
  onChange,
}: {
  options: { value: T; label: string }[]
  values: T[]
  onChange: (v: T[]) => void
}) {
  const toggle = (v: T) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o.value)
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => toggle(o.value)}
            className={`px-3.5 py-2.5 rounded-xl border ${
              active ? 'border-[#2fe06a] bg-green-900/25' : 'border-green-900 bg-[#122e20]'
            }`}
          >
            <Text className={`text-xs font-bold ${active ? 'text-[#2fe06a]' : 'text-gray-300'}`}>
              {o.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// Circunferencia con cinta → DAP calculado a la vista. Se mide circunferencia
// porque es lo único que 3 personas distintas pueden reproducir (13.1).
export function CircumferenceInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const cm = parseFloat(value.replace(',', '.'))
  const valid = Number.isFinite(cm) && cm > 0

  return (
    <View>
      <View className="bg-[#122e20] border border-[#2fe06a]/20 rounded-xl px-4 py-3 flex-row items-center">
        <TextInput
          placeholder="Ej: 94"
          placeholderTextColor="rgba(190, 220, 200, 0.3)"
          keyboardType="numeric"
          value={value}
          onChangeText={onChange}
          style={{ color: '#fff', fontSize: 15, flex: 1 }}
        />
        <Text className="text-gray-400 text-xs font-bold ml-2">cm</Text>
      </View>
      <Text className="text-[11px] mt-2 leading-4 text-gray-400">
        {valid ? (
          <>
            DAP calculado: <Text className="text-[#2fe06a] font-bold">{dapFromCircumference(cm)} cm</Text>
          </>
        ) : (
          'Envolvé el tronco con cinta a la altura del pecho (~1,30 m) y anotá el largo.'
        )}
      </Text>
    </View>
  )
}

// Picker de especie con buscador. Lista cerrada a propósito: texto libre produce
// veinte grafías del mismo árbol y rompe cualquier agregado por especie.
export function SpeciesPicker({
  species,
  value,
  onChange,
  placeholder = 'Elegir especie',
}: {
  species: Species[]
  value: string | null
  onChange: (id: string, name: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const selected = species.find((s) => s.id === value) ?? null
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return species
    return species.filter(
      (s) =>
        s.common_name.toLowerCase().includes(needle) ||
        (s.scientific_name ?? '').toLowerCase().includes(needle)
    )
  }, [q, species])

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="bg-[#122e20] border border-[#2fe06a]/20 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-3">
          <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-400'}`}>
            {selected?.common_name ?? placeholder}
          </Text>
          {selected?.scientific_name ? (
            <Text className="text-gray-400 text-[11px] italic mt-0.5">{selected.scientific_name}</Text>
          ) : null}
        </View>
        <SearchIcon size={16} color="#2fe06a" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-black/85 justify-end">
          <View className="bg-[#0d2419] border-t-2 border-x-2 border-[#2fe06a]/20 rounded-t-3xl p-5 pb-8" style={{ maxHeight: '80%' }}>
            <Text className="text-white text-base font-bold text-center mb-1">Especie</Text>
            <Text className="text-gray-400 text-[11px] text-center mb-4">
              Si no estás seguro, elegí “Desconocido”. Los verificadores pueden identificarla después.
            </Text>

            <View className="bg-[#122e20] border border-green-900 rounded-xl px-4 py-3 mb-3">
              <TextInput
                placeholder="Buscar por nombre común o científico"
                placeholderTextColor="rgba(190, 220, 200, 0.35)"
                value={q}
                onChangeText={setQ}
                autoCorrect={false}
                style={{ color: '#fff', fontSize: 14 }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filtered.map((s) => {
                const active = s.id === value
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => { onChange(s.id, s.common_name); setOpen(false); setQ('') }}
                    className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
                      active ? 'border-[#2fe06a] bg-green-900/20' : 'border-green-950 bg-[#122e20]'
                    }`}
                  >
                    <View className="flex-1 pr-3">
                      <Text className={`text-sm font-bold ${isUnknownSpecies(s) ? 'text-gray-300' : 'text-white'}`}>
                        {s.common_name}
                      </Text>
                      {s.scientific_name ? (
                        <Text className="text-gray-400 text-[11px] italic mt-0.5">{s.scientific_name}</Text>
                      ) : null}
                    </View>
                    {active ? <CheckIcon size={16} color="#2fe06a" /> : null}
                  </TouchableOpacity>
                )
              })}
              {filtered.length === 0 ? (
                <Text className="text-gray-400 text-xs text-center py-6">Sin resultados</Text>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setOpen(false)}
              className="border border-green-950 rounded-xl py-3.5 items-center mt-3"
            >
              <Text className="text-gray-300 text-sm font-bold">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

import { useRef, useState, useEffect } from 'react'
import {
  View, Text, Pressable, FlatList,
  StyleSheet, Dimensions, Animated, Easing,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SceneOne, SceneTwo, SceneThree } from '@/shared/components/ui/TreeScenes'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import { useAuthStore } from '@/features/auth/store/authStore'
const { width: W } = Dimensions.get('window')

const C = {
  bright: '#2fe06a',
  brightDeep: '#19c455',
  text: '#eaf6ee',
  muted: 'rgba(205, 225, 212, 0.62)',
  bg: '#08160e',
}

// Las 3 slides cuentan el loop real del producto, en orden: mapear -> validar
// en comunidad -> canjear. No es "planta un árbol": los árboles ya existen y el
// usuario los registra y cuida. El copy evita esa confusión a propósito.
const SLIDES = [
  {
    key: 'one',
    Scene: SceneOne,
    title: 'Mapea el arbolado de tu ciudad',
    body: 'Registra los árboles de tu barrio con una foto y su ubicación. Cada uno suma al mapa vivo de Cochabamba.',
  },
  {
    key: 'two',
    Scene: SceneTwo,
    title: 'Validado por la comunidad',
    body: 'Otros tres vecinos verifican cada árbol en el lugar. Así los datos son reales y confiables, no de una sola persona.',
  },
  {
    key: 'three',
    Scene: SceneThree,
    title: 'Gana ArbuCoins y canjéalas',
    body: 'Mapear y verificar te da ArbuCoins que cambias por beneficios reales en comercios locales.',
  },
]

function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current

  // Memoized: calling interpolate() on every render creates a new object reference,
  // which makes Animated.View reset its tracked style and causes the flicker.
  const width = useRef(anim.interpolate({ inputRange: [0, 1], outputRange: [7, 26] })).current
  const backgroundColor = useRef(
    anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.2)', C.bright] })
  ).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.2, 0.9, 0.25, 1),
      useNativeDriver: false,
    }).start()
  }, [active])

  return (
    <Pressable onPress={onPress} style={s.dotTouch}>
      <Animated.View style={[s.dot, { width, backgroundColor }]} />
    </Pressable>
  )
}

function ArrowRight() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke="#04230f" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const isProgrammatic = useRef(false)
  const listRef = useRef<FlatList>(null)
  const insets = useSafeAreaInsets()
  const last = index === SLIDES.length - 1
  const { setHasSeenOnboarding } = useAuthStore()

  // Only updates state — does not scroll the list.
  const goToIndex = (i: number) => {
    if (i === indexRef.current) return
    indexRef.current = i
    setIndex(i)
  }

  // Scrolls the list programmatically and locks onScroll from interfering
  // while the scroll animation is in flight (offset still reflects old position).
  const scrollToSlide = (i: number) => {
    if (i === indexRef.current) return
    goToIndex(i)
    isProgrammatic.current = true
    listRef.current?.scrollToIndex({ index: i, animated: true })
  }

  const finish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true')
    setHasSeenOnboarding(true)  // update store so (auth)/_layout skips AsyncStorage re-read
    router.replace('/(auth)/login')
  }

  const next = () => {
    if (last) { finish(); return }
    scrollToSlide(index + 1)
  }

  return (
    <View style={s.root}>
      <ScreenBackground />

      {/* Skip */}
      <View style={[s.skipRow, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={finish} style={{ opacity: last ? 0 : 1 }} hitSlop={16}>
          <Text style={s.skipText}>Saltar</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        keyExtractor={s => s.key}
        scrollEventThrottle={80}
        onScroll={e => {
          // Skip during programmatic scroll — offset still reflects old position
          if (isProgrammatic.current) return
          goToIndex(Math.round(e.nativeEvent.contentOffset.x / W))
        }}
        onMomentumScrollEnd={e => {
          isProgrammatic.current = false
          goToIndex(Math.round(e.nativeEvent.contentOffset.x / W))
        }}
        renderItem={({ item }) => (
          <View style={s.slide}>
            <View style={s.sceneArea}>
              <item.Scene />
            </View>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body}>{item.body}</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Controls */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.dots}>
          {SLIDES.map((slide, i) => (
            <Dot
              key={slide.key}
              active={i === index}
              onPress={() => scrollToSlide(i)}
            />
          ))}
        </View>
        <Pressable onPress={next} style={({ pressed }) => [s.btnGlow, pressed && { opacity: 0.9 }]}>
          <LinearGradient
            colors={[C.bright, C.brightDeep]}
            style={s.btn}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Text style={s.btnText}>{last ? 'Empezar' : 'Siguiente'}</Text>
            <ArrowRight />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 26 },
  skipText: { color: C.muted, fontSize: 14.5, fontWeight: '600' },
  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
  },
  sceneArea: { height: 280, alignItems: 'center', justifyContent: 'center' },
  title: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 33,
  },
  body: {
    color: C.muted,
    fontSize: 15.5,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 24,
    maxWidth: 300,
  },
  controls: { paddingHorizontal: 26 },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  dotTouch: { paddingVertical: 10 },
  dot: { height: 7, borderRadius: 100 },
  dotGlow: {
    shadowColor: '#2fe06a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  // glow wrapper carries the shadow so iOS renders it correctly outside the gradient clip
  btnGlow: {
    borderRadius: 18,
    shadowColor: '#2fe06a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 14,
  },
  btn: {
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  btnText: { color: '#04230f', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
})

import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Easing,
} from 'react-native'
import { goBack } from '@/shared/lib/navigation'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScreenBackground } from '@/shared/components/ui/ScreenBackground'
import Svg, { Path, Rect, Circle } from 'react-native-svg'
import { supabase } from '@/lib/supabase'

const C = {
  bright: '#2fe06a',
  brightDeep: '#19c455',
  label: '#3fe874',
  border: 'rgba(120, 230, 150, 0.32)',
  borderFocus: 'rgba(90, 245, 140, 0.85)',
  placeholder: 'rgba(190, 220, 200, 0.45)',
  text: '#eaf6ee',
  muted: 'rgba(205, 225, 212, 0.6)',
  bg: '#08160e',
  fieldBg: '#0d2419',
}

// — Sub-components —

type FloatFieldProps = {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address'
  autoCapitalize?: 'none' | 'sentences'
  trailing?: React.ReactNode
}

function FloatField({ label, value, onChangeText, trailing, ...props }: FloatFieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldLabel}>
        <Text style={s.fieldLabelText}>{label}</Text>
      </View>
      <View style={[s.fieldBox, focused && s.fieldBoxFocus]}>
        <TextInput
          style={s.fieldInput}
          placeholderTextColor={C.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {trailing}
      </View>
    </View>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current
  // Memoized — creating interpolate nodes on every render causes flicker
  const translateX = useRef(anim.interpolate({ inputRange: [0, 1], outputRange: [0, 19] })).current
  const backgroundColor = useRef(
    anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.12)', C.bright] })
  ).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: on ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.2, 0.9, 0.25, 1),
      useNativeDriver: false,
    }).start()
  }, [on])

  return (
    <Pressable onPress={onToggle}>
      <Animated.View style={[s.toggle, { backgroundColor }]}>
        <Animated.View style={[s.toggleThumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  )
}

function SocialBtn({ children }: { children: React.ReactNode }) {
  return (
    <Pressable
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
      hitSlop={4}
    >
      <View style={s.socialBtn}>
        {children}
      </View>
    </Pressable>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M6.61 6.61A18.5 18.5 0 002 12s3 8 10 8a9.12 9.12 0 005.39-1.61"
          stroke={C.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M14.12 14.12A3 3 0 119.88 9.88M1 1l22 22"
          stroke={C.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z"
        stroke={C.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} stroke={C.muted} strokeWidth={1.8} />
    </Svg>
  )
}

// — Social icons —

function IconFacebook() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={C.text}>
      <Path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
    </Svg>
  )
}

function IconInstagram() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={5} stroke={C.text} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={4} stroke={C.text} strokeWidth={1.8} />
      <Circle cx={17.5} cy={6.5} r={1.2} fill={C.text} />
    </Svg>
  )
}

function IconGoogle() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={C.text}>
      <Path d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.9 14.6 3 12 3 6.99 3 2.95 7.03 2.95 12S6.99 21 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.59-.06-1.04-.15-1.5z" />
    </Svg>
  )
}

// — Main screen —

type Tab = 'signin' | 'signup'
type Status = 'idle' | 'loading' | 'done'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('signin')

  // Login rápido SOLO dev: cuentas fijas con sesión REAL de Supabase (email+password,
  // no mock). Permite alternar entre "Invitado A" y "Invitado B" conservando cada uno
  // su propio estado (árboles, monedas) entre sesiones — a diferencia de signInAnonymously,
  // que crea un usuario nuevo y descartable en cada tap.
  // onAuthStateChange (root _layout) fija la sesión → el guard redirige a (tabs).
  const handleQuickLogin = async (user: { email: string; password: string }) => {
    if (status === 'loading') return
    setError('')
    setStatus('loading')
    const { error: signInErr } = await supabase.auth.signInWithPassword(user)
    if (signInErr) {
      const { error: signUpErr } = await supabase.auth.signUp(user)
      if (signUpErr) { setError(signUpErr.message); setStatus('idle'); return }
    }
    setStatus('done')
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const isSignUp = tab === 'signup'

  const switchTab = (t: Tab) => {
    setTab(t)
    setError('')
    setStatus('idle')
  }

  const submit = async () => {
    if (status === 'loading') return
    setError('')

    if (!email.trim() || !password.trim() || (isSignUp && !confirm.trim())) {
      setError('Please fill in all fields.'); return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Enter a valid email address.'); return
    }
    if (isSignUp && password !== confirm) {
      setError('Passwords do not match.'); return
    }

    setStatus('loading')

    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setStatus('idle'); return }
      setStatus('done')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setStatus('idle'); return }
      setStatus('done')
    }
  }

  return (
    <View style={s.root}>
      <ScreenBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 26 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable onPress={goBack} style={s.backBtn} hitSlop={8}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          {/* Tabs heading */}
          <View style={s.tabsRow}>
            <Pressable onPress={() => switchTab('signin')} hitSlop={8}>
              <Text style={[s.tabMain, !isSignUp && s.tabActive]}>Sign In</Text>
            </Pressable>
            <Text style={s.tabDivider}>/</Text>
            <Pressable onPress={() => switchTab('signup')} hitSlop={8}>
              <Text style={[s.tabSub, isSignUp && s.tabActive]}>Sign up</Text>
            </Pressable>
          </View>
          <Text style={s.subtitle}>
            {isSignUp ? 'Fill the form to create your account' : 'Fill the form to sign into account'}
          </Text>

          {/* Fields */}
          <View style={{ marginTop: 16 }}>
            <FloatField
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
            />
            <FloatField
              label="Password"
              secureTextEntry={!showPwd}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              trailing={
                <Pressable onPress={() => setShowPwd(v => !v)} hitSlop={8}>
                  <EyeIcon off={!showPwd} />
                </Pressable>
              }
            />
            {isSignUp && (
              <FloatField
                label="Confirm"
                secureTextEntry={!showPwd}
                placeholder="Re-enter your password"
                value={confirm}
                onChangeText={setConfirm}
              />
            )}
          </View>

          {/* Remember / Forgot */}
          <View style={s.rememberRow}>
            <Pressable onPress={() => setRemember(v => !v)} style={s.rememberLeft}>
              <Toggle on={remember} onToggle={() => setRemember(v => !v)} />
              <Text style={s.rememberText}>REMEMBER</Text>
            </Pressable>
            {!isSignUp && (
              <Pressable hitSlop={8}>
                <Text style={s.forgotText}>Forgot password</Text>
              </Pressable>
            )}
          </View>

          {/* Error */}
          <Text style={[s.errorText, { opacity: error ? 1 : 0 }]}>{error || ' '}</Text>

          {/* CTA */}
          <Pressable onPress={submit} style={({ pressed }) => [s.ctaGlow, pressed && { opacity: 0.9 }]}>
            <LinearGradient
              colors={[C.bright, C.brightDeep]}
              style={s.cta}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              {status === 'loading'
                ? <ActivityIndicator size="small" color="#04230f" />
                : <Text style={s.ctaText}>
                    {status === 'done'
                      ? (isSignUp ? 'Account created ✓' : 'Welcome back ✓')
                      : (isSignUp ? 'Create account' : 'Sign In')}
                  </Text>
              }
            </LinearGradient>
          </Pressable>

          {/* Dev-only quick login: cuentas fijas con sesión REAL (no mock). Excluido de builds de producción. */}
          {__DEV__ && (
            <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
              <Pressable
                onPress={() => handleQuickLogin({ email: 'invitado.a@arbu.dev', password: 'Invitado123!' })}
                style={({ pressed }) => [{ paddingVertical: 8, opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={{ color: C.bright, fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                  Invitado A (dev)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleQuickLogin({ email: 'invitado.b@arbu.dev', password: 'Invitado123!' })}
                style={({ pressed }) => [{ paddingVertical: 8, opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={{ color: C.bright, fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                  Invitado B (dev)
                </Text>
              </Pressable>
            </View>
          )}

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Social */}
          <View style={s.socials}>
            <SocialBtn><IconFacebook /></SocialBtn>
            <SocialBtn><IconInstagram /></SocialBtn>
            <SocialBtn><IconGoogle /></SocialBtn>
          </View>

          {/* Swap */}
          <View style={s.swapRow}>
            <Text style={s.swapText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <Pressable onPress={() => switchTab(isSignUp ? 'signin' : 'signup')} hitSlop={8}>
              <Text style={s.swapLink}>{isSignUp ? 'Sign In' : 'Sign up'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 26 },

  // Back
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Tabs
  tabsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 14, marginTop: 38 },
  tabMain: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: C.muted },
  tabSub: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, color: C.muted },
  tabActive: { color: '#fff' },
  tabDivider: { color: C.muted, fontSize: 26, fontWeight: '300' },
  subtitle: { color: C.muted, fontSize: 14.5, marginTop: 9 },

  // Fields
  fieldWrap: { position: 'relative', marginTop: 22 },
  fieldLabel: {
    position: 'absolute', top: -9, left: 16, zIndex: 2,
    paddingHorizontal: 6, backgroundColor: C.fieldBg,
  },
  fieldLabelText: {
    color: C.label, fontSize: 12, fontWeight: '700',
    letterSpacing: 0.3, textTransform: 'capitalize',
  },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.015)',
    paddingHorizontal: 16,
  },
  fieldBoxFocus: { borderColor: C.borderFocus },
  fieldInput: {
    flex: 1, color: C.text, fontSize: 15.5,
    paddingVertical: 17, letterSpacing: 0.1,
  },

  // Remember
  rememberRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 22,
  },
  rememberLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rememberText: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  forgotText: { color: C.bright, fontSize: 14, fontWeight: '700' },

  // Toggle — background + translateX both driven by a single Animated.Value
  toggle: {
    width: 46, height: 27, borderRadius: 100,
    padding: 3, justifyContent: 'center',
  },
  toggleThumb: {
    width: 21, height: 21, borderRadius: 10.5, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35, shadowRadius: 1.5,
  },

  // Error
  errorText: { color: '#ff8a8a', fontSize: 12.5, fontWeight: '500', textAlign: 'center', marginTop: 12 },

  // CTA — glow wrapper carries the shadow, inner gradient carries the fill
  ctaGlow: {
    borderRadius: 18,
    shadowColor: '#2fe06a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 14,
  },
  cta: {
    height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#04230f', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 26 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: C.muted, fontSize: 12, fontWeight: '500' },

  // Social
  socials: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  // Swap
  swapRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  swapText: { color: C.muted, fontSize: 13.5 },
  swapLink: { color: C.bright, fontSize: 13.5, fontWeight: '700' },
})

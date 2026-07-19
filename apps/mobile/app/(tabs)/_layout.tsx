import { Redirect, Tabs, router } from 'expo-router'
import { useAuthStore } from '@/features/auth/store/authStore'
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen'
import { Text, View, Modal, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { T, CTA_GRADIENT, glow } from '@/shared/theme'
import { IconWell } from '@/shared/components/ui/Kit'
import {
  HomeIcon,
  TicketIcon,
  TrophyIcon,
  UserIcon,
  LeafIcon,
  SearchIcon,
  MapPinIcon,
} from '@/shared/components/ui/Icons'

export default function TabsLayout() {
  const { session, loading } = useAuthStore()
  const [modalVisible, setModalVisible] = useState(false)

  if (loading) return <LoadingScreen />
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: T.bright,
          tabBarInactiveTintColor: 'rgba(205,225,212,0.45)',
          tabBarStyle: {
            backgroundColor: '#0a1c11',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
            paddingBottom: 8,
            paddingTop: 8,
            height: 68,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            marginTop: -4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <HomeIcon size={20} color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: 'Premios',
            tabBarIcon: ({ color }) => <TicketIcon size={20} color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="plus"
          options={{
            title: '',
            // Center action — same gradient + glow language as the auth CTA
            tabBarIcon: () => (
              <View style={[{ marginTop: -14, borderRadius: 27 }, glow(0.55, 14)]}>
                <LinearGradient
                  colors={[...CTA_GRADIENT]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: T.ink, fontSize: 28, fontWeight: '800', lineHeight: 30 }}>+</Text>
                </LinearGradient>
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setModalVisible(true)
            },
          }}
        />
        <Tabs.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            tabBarIcon: ({ color }) => <TrophyIcon size={20} color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <UserIcon size={20} color={color as string} />,
          }}
        />
      </Tabs>

      {/* Modal Actions */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{ flex: 1, backgroundColor: 'rgba(3, 10, 6, 0.82)', justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: '#0c2013',
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: T.hairline,
              padding: 24,
              paddingBottom: 42,
            }}
          >
            {/* Grabber */}
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 100,
                backgroundColor: 'rgba(255,255,255,0.14)',
                marginBottom: 20,
              }}
            />

            <Text
              style={{
                color: T.text, fontSize: 19, fontWeight: '800',
                textAlign: 'center', marginBottom: 6, letterSpacing: -0.3,
              }}
            >
              Acciones Verdes
            </Text>
            <Text style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 }}>
              Selecciona una actividad para contribuir al ecosistema urbano
            </Text>

            {/* Action rows */}
            {[
              {
                title: 'Mapear Árbol (Plantar)',
                desc: 'Registra un nuevo ejemplar forestal en Cochabamba',
                Icon: LeafIcon,
                to: '/tree/new' as const,
              },
              {
                title: 'Verificar Árbol (Monitorear)',
                desc: 'Valida el estado fitosanitario de árboles registrados por otros',
                Icon: SearchIcon,
                to: '/tree/verify' as const,
              },
              {
                title: 'Explorar Árboles',
                desc: 'Mira todos los árboles mapeados en Cochabamba y su información',
                Icon: MapPinIcon,
                to: '/tree/explore' as const,
              },
            ].map((a, i) => (
              <TouchableOpacity
                key={a.title}
                activeOpacity={0.8}
                onPress={() => {
                  setModalVisible(false)
                  router.push(a.to)
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: T.surface,
                  borderWidth: 1,
                  borderColor: T.hairline2,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: i === 2 ? 20 : 12,
                }}
              >
                <View style={{ marginRight: 14 }}>
                  <IconWell size={46}>
                    <a.Icon size={22} color={T.bright} />
                  </IconWell>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.text, fontSize: 15, fontWeight: '700' }}>{a.title}</Text>
                  <Text style={{ color: T.muted, fontSize: 11.5, marginTop: 2.5, lineHeight: 16 }}>
                    {a.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Close */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: T.surfaceHi,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: T.text, fontSize: 14, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

import { Redirect, Tabs, router } from 'expo-router'
import { useAuthStore } from '@/features/auth/store/authStore'
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen'
import { Text, View, Modal, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import {
  HomeIcon,
  TicketIcon,
  TrophyIcon,
  UserIcon,
  LeafIcon,
  SearchIcon,
} from '@/shared/components/ui/Icons'

export default function TabsLayout() {
  const { session, loading } = useAuthStore()
  const [modalVisible, setModalVisible] = useState(false)

  if (loading) return <LoadingScreen />
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <View style={{ flex: 1, backgroundColor: '#08160e' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2fe06a',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#08160e',
            borderTopColor: 'rgba(48, 224, 106, 0.15)',
            paddingBottom: 8,
            paddingTop: 8,
            height: 68,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: 'bold',
            marginTop: -4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <HomeIcon size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: 'Premios',
            tabBarIcon: ({ color }) => <TicketIcon size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="plus"
          options={{
            title: '',
            tabBarIcon: () => (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#2fe06a',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -12,
                  shadowColor: '#2fe06a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >
                <Text style={{ color: '#04230f', fontSize: 28, fontWeight: 'bold', lineHeight: 28 }}>+</Text>
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
            tabBarIcon: ({ color }) => <TrophyIcon size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <UserIcon size={20} color={color} />,
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
        <View style={{ flex: 1, backgroundColor: 'rgba(4, 15, 9, 0.85)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#0d2419',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1.5,
              borderColor: 'rgba(48, 224, 106, 0.25)',
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
              Acciones Verdes
            </Text>
            <Text style={{ color: 'rgba(205, 225, 212, 0.6)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Selecciona una actividad para contribuir al ecosistema urbano
            </Text>

            {/* Action buttons */}
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false)
                router.push('/tree/new')
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#122e20',
                borderWidth: 1,
                borderColor: 'rgba(48, 224, 106, 0.15)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(48, 224, 106, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <LeafIcon size={22} color="#2fe06a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>Mapear Árbol (Plantar)</Text>
                <Text style={{ color: 'rgba(205, 225, 212, 0.6)', fontSize: 11, marginTop: 2 }}>
                  Registra un nuevo ejemplar forestal en Cochabamba
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false)
                router.push('/tree/verify')
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#122e20',
                borderWidth: 1,
                borderColor: 'rgba(48, 224, 106, 0.15)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(48, 224, 106, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <SearchIcon size={22} color="#2fe06a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>Verificar Árbol (Monitorear)</Text>
                <Text style={{ color: 'rgba(205, 225, 212, 0.6)', fontSize: 11, marginTop: 2 }}>
                  Valida el estado fitosanitario de árboles registrados por otros
                </Text>
              </View>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#eaf6ee', fontSize: 14, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

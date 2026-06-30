// src/App.jsx
import { useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { usePareja } from '@modules/couple/hooks/usePareja'
import AuthPage from '@modules/auth/AuthPage'
import SetupPage from '@modules/couple/SetupPage'
import DashboardPage from '@modules/dashboard/DashboardPage'
import LoadingScreen from '@ui/LoadingScreen'

export default function App() {
  const { user, initialized, init, logout } = useAuthStore()
  const { tema } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
  }, [tema])

  useEffect(() => { init() }, [])

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('np:logout', handler)
    return () => window.removeEventListener('np:logout', handler)
  }, [logout])

  if (!initialized) return <LoadingScreen />
  if (!user)        return <AuthPage />

  return <AuthedApp />
}

// Componente separado: solo se monta cuando hay user autenticado
function AuthedApp() {
  const { data: pareja, isPending, isError, isFetched } = usePareja()
  const { setSetupCompleto } = useAppStore()

  useEffect(() => {
    // Si la BD confirma que existe pareja, marcamos setup como completo
    // (sincroniza localStorage con la fuente de verdad real: la BD)
    if (pareja) setSetupCompleto(true)
  }, [pareja])

  // isPending: la query nunca ha corrido o sigue en su primer fetch.
  // Esto es lo único confiable para saber "todavía no sé si hay pareja".
  if (isPending) return <LoadingScreen msg="Cargando tu pareja…" />

  // isFetched + sin pareja + sin error = la BD confirmó que NO existe pareja
  if (isFetched && !pareja && !isError) return <SetupPage />

  // Error de red u otro — no asumas que no hay pareja, muestra loading
  // en vez de mandar al usuario a recrear todo
  if (!pareja) return <LoadingScreen msg="Verificando tu cuenta…" />

  return <DashboardPage />
}

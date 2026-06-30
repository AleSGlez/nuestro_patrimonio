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
  const { tema, setupCompleto, setSetupCompleto } = useAppStore()

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

  return <AuthedApp setupCompleto={setupCompleto} setSetupCompleto={setSetupCompleto} />
}

// Componente separado para poder usar usePareja solo cuando hay user
function AuthedApp({ setupCompleto, setSetupCompleto }) {
  const { data: pareja, isLoading } = usePareja()

  useEffect(() => {
    // Si ya existe una pareja vinculada a este usuario en BD,
    // el setup ya está completo aunque localStorage se haya limpiado
    if (pareja && !setupCompleto) {
      setSetupCompleto(true)
    }
  }, [pareja])

  if (isLoading) return <LoadingScreen msg="Cargando tu pareja…" />
  if (!pareja && !setupCompleto) return <SetupPage />
  if (!pareja) return <LoadingScreen />

  return <DashboardPage />
}

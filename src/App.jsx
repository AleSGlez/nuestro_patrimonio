// src/App.jsx
import { useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import AuthPage from '@modules/auth/AuthPage'
import SetupPage from '@modules/couple/SetupPage'
import DashboardPage from '@modules/dashboard/DashboardPage'
import LoadingScreen from '@ui/LoadingScreen'

export default function App() {
  const { user, initialized, init, logout } = useAuthStore()
  const { tema, setupCompleto } = useAppStore()

  // Aplicar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
  }, [tema])

  // Inicializar sesión
  useEffect(() => { init() }, [])

  // Escuchar logout forzado (sesión expirada)
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('np:logout', handler)
    return () => window.removeEventListener('np:logout', handler)
  }, [logout])

  if (!initialized) return <LoadingScreen />

  if (!user)         return <AuthPage />
  if (!setupCompleto) return <SetupPage />

  return <DashboardPage />
}

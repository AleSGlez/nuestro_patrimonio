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

// Componente separado: solo se monta cuando hay user autenticado.
// El shell de navegación (BottomNav + tabs) vive DENTRO de DashboardPage,
// este componente solo decide: setup wizard vs dashboard.
function AuthedApp() {
  const { data: pareja, isPending, isError, isFetched } = usePareja()
  const setSetupCompleto = useAppStore((s) => s.setSetupCompleto)
  const setNombres = useAppStore((s) => s.setNombres)
  const setTema = useAppStore((s) => s.setTema)

  useEffect(() => {
    if (!pareja) return
    setSetupCompleto(true)
    // Sincroniza nombres y tema reales de la BD — sobreescribe
    // cualquier valor default que haya quedado en localStorage
    setNombres({ p1: pareja.nombre1, p2: pareja.nombre2 })
    if (pareja.tema) setTema(pareja.tema)
  }, [pareja?.id, pareja?.nombre1, pareja?.nombre2, pareja?.tema])

  if (isPending) return <LoadingScreen msg="Cargando tu pareja…" />
  if (isFetched && !pareja && !isError) return <SetupPage />
  if (!pareja) return <LoadingScreen msg="Verificando tu cuenta…" />

  return <DashboardPage />
}

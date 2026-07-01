// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { Copy, Check, LogOut } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useDashboardData } from './hooks/useDashboard'
import BottomNav from '@shared/components/layout/BottomNav'
import PlaceholderPage from '@shared/components/layout/PlaceholderPage'
import AccountsPage from '@modules/accounts/AccountsPage'
import CardsPage from '@modules/cards/CardsPage'
import TransactionsPage from '@modules/transactions/TransactionsPage'
import PersonasPage from '@modules/personas/PersonasPage'
import PatrimonioCard from './components/PatrimonioCard'
import FlujoCard from './components/FlujoCard'
import GraficaFlujo from './components/GraficaFlujo'
import GraficaCategorias from './components/GraficaCategorias'
import UltimosMovimientos from './components/UltimosMovimientos'

// ── Home tab ─────────────────────────────────────────────────
function HomeTab() {
  const { user, logout, pareja } = useAuthStore()
  const { nombres } = useAppStore()
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)

  const { data: cuentas = [] }   = useCuentas()
  const { data: tarjetas = [] }  = useTarjetas()
  const { txMes, txHistorico }   = useDashboardData()

  const txMesData       = txMes.data || []
  const txHistoricoData = txHistorico.data || []
  const parejaCompleta  = pareja?.user1_id && pareja?.user2_id

  const copiarCodigo = async () => {
    if (!pareja?.codigo_invitacion) return
    await navigator.clipboard.writeText(pareja.codigo_invitacion)
    setCopiado(true)
    toast.success('Código copiado')
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <div className="top-header">
        <div>
          <p className="section-label">Bienvenidos</p>
          <h1 className="text-lg font-bold text-white">{nombres.p1} & {nombres.p2}</h1>
        </div>
        <button onClick={logout} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white rounded-xl">
          <LogOut size={18} />
        </button>
      </div>

      <div className="page px-4 pt-4">
        {/* Grid 2 columnas: Patrimonio + Flujo */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <PatrimonioCard cuentas={cuentas} tarjetas={tarjetas} />
          <FlujoCard transacciones={txMesData} />
        </div>

        {/* Gráfica 6 meses */}
        {txHistoricoData.length > 0 && (
          <GraficaFlujo transacciones={txHistoricoData} />
        )}

        {/* Gráfica por categoría */}
        {txMesData.filter((t) => t.tipo === 'gasto').length > 0 && (
          <GraficaCategorias transacciones={txMesData} />
        )}

        {/* Últimos movimientos */}
        <UltimosMovimientos transacciones={txMesData} />

        {/* Código de invitación si pareja incompleta */}
        {pareja && !parejaCompleta && (
          <div className="card p-5 mb-4 border-[var(--accent)]/30">
            <p className="text-sm text-white font-semibold mb-1">Esperando a {nombres.p2}</p>
            <p className="text-xs text-gray-400 mb-3">Comparte este código para que se una:</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-center text-xl font-mono font-bold tracking-[0.2em] gradient-text">
                {pareja.codigo_invitacion}
              </p>
              <button onClick={copiarCodigo} className="btn-ghost w-10 h-10 rounded-xl flex-shrink-0">
                {copiado ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Shell con bottom nav ──────────────────────────────────────
export default function DashboardPage() {
  const { tab, setTab } = useAppStore()

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':     return <HomeTab />
      case 'cuentas':       return <AccountsPage />
      case 'tarjetas':      return <CardsPage />
      case 'transacciones': return <TransactionsPage />
      case 'personas':      return <PersonasPage />
      default:              return <HomeTab />
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {renderTab()}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

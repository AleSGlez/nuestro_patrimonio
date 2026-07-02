// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { Copy, Check, LogOut } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useDashboardData } from './hooks/useDashboard'
import BottomNav from '@shared/components/layout/BottomNav'
import AccountsPage from '@modules/accounts/AccountsPage'
import CardsPage from '@modules/cards/CardsPage'
import TransactionsPage from '@modules/transactions/TransactionsPage'
import PersonasPage from '@modules/personas/PersonasPage'
import PresupuestosPage from '@modules/presupuestos/PresupuestosPage'
import DashboardPersonal from './components/DashboardPersonal'
import DashboardNegocio from './components/DashboardNegocio'
import { cn } from '@lib/utils'

// ── Home tab ──────────────────────────────────────────────────
function HomeTab() {
  const { logout, pareja }    = useAuthStore()
  const { nombres }           = useAppStore()
  const toast                 = useToast()
  const [vista, setVista]     = useState('personal')
  const [copiado, setCopiado] = useState(false)

  const { txMes, txHistorico } = useDashboardData()
  const txMesData       = txMes.data || []
  const txHistoricoData = txHistorico.data || []
  const parejaCompleta  = pareja?.user1_id && pareja?.user2_id

  const hora   = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const copiarCodigo = async () => {
    if (!pareja?.codigo_invitacion) return
    await navigator.clipboard.writeText(pareja.codigo_invitacion)
    setCopiado(true); toast.success('Código copiado')
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      {/* Header fijo */}
      <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">{saludo} 👋</p>
            <h1 className="text-xl font-bold text-white">{nombres.p1} & {nombres.p2}</h1>
          </div>
          <button onClick={logout} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white rounded-xl">
            <LogOut size={18} />
          </button>
        </div>

        {/* Toggle Personal / Negocio */}
        <div className="flex bg-surface-700 rounded-xl p-1">
          {[['personal','👤 Personal'],['negocio','🏪 Negocio']].map(([id, label]) => (
            <button
              key={id} onClick={() => setVista(id)}
              className={cn(
                'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                vista === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="page px-4 pt-4">
        {vista === 'personal' ? (
          <>
            <DashboardPersonal
              txMesData={txMesData}
              txHistoricoData={txHistoricoData}
              nombres={nombres}
            />
            {/* Código invitación */}
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
            {/*
              FASES FUTURAS — Personal:
              Fase 7: <BarrasPresupuesto />
              Fase 9: <ProximasSuscripciones />
              Fase 10: <CountdownQuincena />
            */}
          </>
        ) : (
          <DashboardNegocio />
        )}
      </div>
    </>
  )
}

// ── Shell ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { tab, setTab } = useAppStore()

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':     return <HomeTab />
      case 'cuentas':       return <AccountsPage />
      case 'tarjetas':      return <CardsPage />
      case 'transacciones': return <TransactionsPage />
      case 'personas':      return <PersonasPage />
      case 'presupuestos':  return <PresupuestosPage />
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

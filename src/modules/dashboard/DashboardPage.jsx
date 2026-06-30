// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import BottomNav from '@shared/components/layout/BottomNav'
import PlaceholderPage from '@shared/components/layout/PlaceholderPage'
import AccountsPage from '@modules/accounts/AccountsPage'
import CardsPage from '@modules/cards/CardsPage'
import TransactionsPage from '@modules/transactions/TransactionsPage'

// ── Home tab content ─────────────────────────────────────────
function HomeTab() {
  const { user, logout, pareja } = useAuthStore()
  const { nombres } = useAppStore()
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)

  const parejaCompleta = pareja?.user1_id && pareja?.user2_id

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
          <h1 className="text-lg font-bold text-white leading-tight">{nombres.p1} & {nombres.p2}</h1>
        </div>
      </div>

      <div className="page px-4 pt-4">
        <div className="card p-6 text-center mb-4">
          <div className="text-4xl mb-3">🏗️</div>
          <h2 className="text-white font-semibold mb-1">Dashboard</h2>
          <p className="text-xs text-gray-500 mb-3">{user?.email}</p>
          <div className="badge-ok inline-flex">Fase 4 ✅ — Movimientos funcionando</div>
        </div>

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

        <button onClick={logout} className="btn-ghost w-full py-2.5 text-sm">
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

// ── Main shell with bottom nav ────────────────────────────────
export default function DashboardPage() {
  const { tab, setTab } = useAppStore()

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':     return <HomeTab />
      case 'cuentas':       return <AccountsPage />
      case 'tarjetas':      return <CardsPage />
      case 'transacciones': return <TransactionsPage />
      case 'ajustes':       return <PlaceholderPage emoji="⚙️" title="Ajustes" fase={11} />
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

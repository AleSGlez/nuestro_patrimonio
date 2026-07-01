// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { Copy, Check, LogOut, TrendingUp, TrendingDown } from 'lucide-react'
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
import GraficaFlujo from './components/GraficaFlujo'
import GraficaCategorias from './components/GraficaCategorias'
import UltimosMovimientos from './components/UltimosMovimientos'
import { fmt, cn } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Header fijo con saludo + resumen ─────────────────────────
function DashboardHeader({ nombres, patrimonio, flujo, logout }) {
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/[0.06]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500">{saludo} 👋</p>
          <h1 className="text-xl font-bold text-white">{nombres.p1} & {nombres.p2}</h1>
        </div>
        <button onClick={logout} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white rounded-xl flex-shrink-0">
          <LogOut size={18} />
        </button>
      </div>

      {/* Resumen numérico en el header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-700 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <TrendingUp size={11} className="text-[var(--accent)]" />
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Patrimonio</p>
          </div>
          <p className={cn('text-lg font-bold font-mono', patrimonio >= 0 ? 'text-white' : 'text-bad')}>
            {fmt(patrimonio)}
          </p>
        </div>
        <div className="bg-surface-700 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center', flujo >= 0 ? 'bg-ok/10' : 'bg-bad/10')}>
              {flujo >= 0
                ? <TrendingUp size={11} className="text-ok" />
                : <TrendingDown size={11} className="text-bad" />
              }
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Flujo mes</p>
          </div>
          <p className={cn('text-lg font-bold font-mono', flujo >= 0 ? 'text-ok' : 'text-bad')}>
            {flujo >= 0 ? '+' : ''}{fmt(flujo)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Expenses vs Income card ───────────────────────────────────
function IngresosGastosCard({ transacciones }) {
  const ingresos = transacciones.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = transacciones.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const total    = ingresos + gastos
  const pctIngresos = total > 0 ? (ingresos / total) * 100 : 50
  const pctGastos   = total > 0 ? (gastos / total) * 100 : 50
  const mes = format(new Date(), 'MMMM', { locale: es })

  return (
    <div className="card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">Ingresos vs Gastos</p>
        <p className="text-[11px] text-gray-500 capitalize">{mes}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-ok" />
            <p className="text-xs text-gray-400">Ingresos</p>
          </div>
          <p className="text-base font-bold font-mono text-ok">{fmt(ingresos)}</p>
          <p className="text-[11px] text-gray-500">{Math.round(pctIngresos)}% del total</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-bad" />
            <p className="text-xs text-gray-400">Gastos</p>
          </div>
          <p className="text-base font-bold font-mono text-bad">{fmt(gastos)}</p>
          <p className="text-[11px] text-gray-500">{Math.round(pctGastos)}% del total</p>
        </div>
      </div>

      {/* Barra comparativa */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          <div className="bg-ok rounded-full transition-all" style={{ width: `${pctIngresos}%` }} />
          <div className="bg-bad rounded-full transition-all" style={{ width: `${pctGastos}%` }} />
        </div>
      )}
    </div>
  )
}

// ── Home tab ─────────────────────────────────────────────────
function HomeTab() {
  const { logout, pareja } = useAuthStore()
  const { nombres } = useAppStore()
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)

  const { data: cuentas = [] }  = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const { txMes, txHistorico }  = useDashboardData()

  const txMesData       = txMes.data || []
  const txHistoricoData = txHistorico.data || []
  const parejaCompleta  = pareja?.user1_id && pareja?.user2_id

  const patrimonio = cuentas
    .filter((c) => c.persona !== 'negocio')
    .reduce((s, c) => s + Number(c.saldo), 0)
    - tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)

  const ingresos = txMesData.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = txMesData.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo    = ingresos - gastos

  const copiarCodigo = async () => {
    if (!pareja?.codigo_invitacion) return
    await navigator.clipboard.writeText(pareja.codigo_invitacion)
    setCopiado(true)
    toast.success('Código copiado')
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <DashboardHeader nombres={nombres} patrimonio={patrimonio} flujo={flujo} logout={logout} />

      <div className="page px-4 pt-4">
        {/* Gráfica barras 6 meses — la más visual, va primero */}
        {txHistoricoData.length > 0 && (
          <GraficaFlujo transacciones={txHistoricoData} />
        )}

        {/* Ingresos vs Gastos del mes */}
        <IngresosGastosCard transacciones={txMesData} />

        {/* Gastos por categoría */}
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

        {/* Espacio para fases futuras:
            - Fase 6: resumen negocio (utilidad, ventas del mes)
            - Fase 7: barra de presupuesto (gauge como en la imagen)
            - Fase 9: próximas suscripciones a vencer
            - Fase 10: próxima quincena countdown
        */}
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

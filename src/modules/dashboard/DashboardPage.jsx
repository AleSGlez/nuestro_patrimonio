// src/modules/dashboard/DashboardPage.jsx
import { useState, useMemo } from 'react'
import { Copy, Check, LogOut, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useDashboardData, buildSparklineData } from './hooks/useDashboard'
import BottomNav from '@shared/components/layout/BottomNav'
import AccountsPage from '@modules/accounts/AccountsPage'
import CardsPage from '@modules/cards/CardsPage'
import TransactionsPage from '@modules/transactions/TransactionsPage'
import PersonasPage from '@modules/personas/PersonasPage'
import GraficaFlujo from './components/GraficaFlujo'
import GraficaCategorias from './components/GraficaCategorias'
import UltimosMovimientos from './components/UltimosMovimientos'
import Sparkline from './components/Sparkline'
import { fmt, cn } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Card de métrica con sparkline ─────────────────────────────
function MetricaCard({ label, valor, positivo, sparkData, colorLinea, sufijo }) {
  const isPositive = positivo ?? valor >= 0
  return (
    <div className="card p-3.5 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={cn('flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          isPositive ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
        )}>
          {isPositive ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
          {sufijo}
        </div>
      </div>
      <p className={cn('text-xl font-bold font-mono leading-tight mb-2', isPositive ? 'text-white' : 'text-bad')}>
        {valor >= 0 && isPositive !== false ? '' : valor < 0 ? '' : ''}{fmt(Math.abs(valor))}
      </p>
      {sparkData && sparkData.length >= 2 && (
        <div className="mt-auto -mx-1">
          <Sparkline data={sparkData} color={isPositive ? '#10B981' : '#EF4444'} height={32} />
        </div>
      )}
    </div>
  )
}

// ── Ingresos vs Gastos ────────────────────────────────────────
function IngresosGastosCard({ transacciones }) {
  const ingresos = transacciones.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = transacciones.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const total    = ingresos + gastos
  const pctGastos = total > 0 ? Math.min(100, (gastos / ingresos) * 100) : 0
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
          <p className="text-lg font-bold font-mono text-ok">{fmt(ingresos)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-bad" />
            <p className="text-xs text-gray-400">Gastos</p>
          </div>
          <p className="text-lg font-bold font-mono text-bad">{fmt(gastos)}</p>
        </div>
      </div>

      {total > 0 && (
        <>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-1.5">
            <div className="bg-ok rounded-l-full" style={{ width: `${100 - pctGastos}%` }} />
            <div className="bg-bad rounded-r-full" style={{ width: `${Math.min(pctGastos, 100)}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 text-right">
            {Math.round(pctGastos)}% de tus ingresos gastado
          </p>
        </>
      )}
    </div>
  )
}

// ── Home tab ──────────────────────────────────────────────────
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

  const totalCuentas = cuentas
    .filter((c) => c.persona !== 'negocio')
    .reduce((s, c) => s + Number(c.saldo), 0)
  const totalDeuda = tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const patrimonio = totalCuentas - totalDeuda

  const ingresos = txMesData.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = txMesData.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo    = ingresos - gastos

  // Sparkline: flujo acumulado de los últimos 14 días
  const sparkFlujo = useMemo(() => buildSparklineData(txMesData, 14), [txMesData])
  // Sparkline de patrimonio: flujo acumulado histórico (aproximación)
  const sparkPatrimonio = useMemo(() => buildSparklineData(txHistoricoData, 30), [txHistoricoData])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const copiarCodigo = async () => {
    if (!pareja?.codigo_invitacion) return
    await navigator.clipboard.writeText(pareja.codigo_invitacion)
    setCopiado(true)
    toast.success('Código copiado')
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

        {/* Grid 2 columnas con sparklines */}
        <div className="grid grid-cols-2 gap-3">
          <MetricaCard
            label="Patrimonio neto"
            valor={patrimonio}
            sufijo={patrimonio >= 0 ? 'activo' : 'déficit'}
            sparkData={sparkPatrimonio}
          />
          <MetricaCard
            label="Flujo del mes"
            valor={flujo}
            positivo={flujo >= 0}
            sufijo={flujo >= 0 ? 'positivo' : 'negativo'}
            sparkData={sparkFlujo}
          />
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="page px-4 pt-4">

        {/* Gráfica barras 6 meses */}
        {txHistoricoData.length > 0
          ? <GraficaFlujo transacciones={txHistoricoData} />
          : (
            <div className="card p-4 mb-3 flex items-center justify-center h-24">
              <p className="text-xs text-gray-500">Registra movimientos para ver la gráfica de 6 meses</p>
            </div>
          )
        }

        {/* Ingresos vs Gastos */}
        <IngresosGastosCard transacciones={txMesData} />

        {/* Gastos por categoría */}
        {txMesData.filter((t) => t.tipo === 'gasto').length > 0 && (
          <GraficaCategorias transacciones={txMesData} />
        )}

        {/* Últimos movimientos */}
        <UltimosMovimientos transacciones={[...txMesData].reverse()} />

        {/* Código de invitación */}
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
          ESPACIO PARA FASES FUTURAS — enchufar aquí sin reorganizar:
          Fase 6:  <ResumenNegocio />
          Fase 7:  <BarrasPresupuesto />  ← gauge como en imagen de referencia
          Fase 9:  <ProximasSuscripciones />
          Fase 10: <CountdownQuincena />
        */}
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

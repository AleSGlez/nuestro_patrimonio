// src/modules/dashboard/components/DashboardPersonal.jsx
import { useState, useMemo } from 'react'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { buildSparklineData } from '../hooks/useDashboard'
import GraficaFlujo from './GraficaFlujo'
import GraficaCategorias from './GraficaCategorias'
import UltimosMovimientos from './UltimosMovimientos'
import Sparkline from './Sparkline'
import PresupuestosWidget from './PresupuestosWidget'
import { fmt, cn, sumaApartadosPersonales } from '@lib/utils'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react'

// Flujo (ingresos - gastos) del mes calendario anterior, a partir del mismo
// arreglo ya filtrado (contexto/persona) que se usa para el flujo del mes actual.
function flujoMesAnterior(txFiltrado) {
  const hoy = new Date()
  const inicio = format(startOfMonth(subMonths(hoy, 1)), 'yyyy-MM-dd')
  const fin    = format(endOfMonth(subMonths(hoy, 1)), 'yyyy-MM-dd')
  const tx = txFiltrado.filter((t) => t.fecha >= inicio && t.fecha <= fin)
  const ingresos = tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  return ingresos - gastos
}

// % de cambio de un valor respecto a su "anterior" — null si no hay base
// contra qué comparar (evita división entre cero / infinitos sin sentido).
function pctVsAnterior(actual, anterior) {
  if (!anterior) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

function Colapsable({ titulo, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="card p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <ChevronDown size={16} className={cn('text-gray-400 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

function MetricaCard({ label, valor, positivo, sparkData, sufijo, deltaPct }) {
  const isPos = positivo ?? valor >= 0
  const hayDelta = deltaPct !== null && deltaPct !== undefined
  const deltaPos = deltaPct >= 0
  return (
    <div className="card p-3.5 lg:p-6 flex flex-col">
      <div className="flex items-start justify-between mb-1 lg:mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide lg:text-gray-500 lg:tracking-[0.12em] lg:font-semibold">{label}</p>
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-0.5 text-[10px] font-medium text-gray-500">
            {hayDelta ? (
              <>
                {deltaPos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                {Math.round(Math.abs(deltaPct))}% vs mes ant.
              </>
            ) : (
              <span>sin dato anterior</span>
            )}
          </div>
          <div className={cn('flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full lg:font-bold',
            isPos ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
          )}>
            {isPos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {sufijo}
          </div>
        </div>
      </div>
      <p className={cn('text-xl lg:text-4xl font-bold font-mono leading-tight mb-2 lg:mb-4', isPos ? 'text-white' : 'text-bad')}>
        {fmt(Math.abs(valor))}
      </p>
      {sparkData && sparkData.length >= 2 && (
        <div className="mt-auto -mx-1 lg:h-12">
          <Sparkline data={sparkData} color={isPos ? '#10B981' : '#EF4444'} height={32} />
        </div>
      )}
    </div>
  )
}

function IngresosGastosCard({ ingresos, gastos }) {
  const total = ingresos + gastos
  const pctGastos = ingresos > 0 ? Math.min(100, (gastos / ingresos) * 100) : 0
  const mes = format(new Date(), 'MMMM', { locale: es })
  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full lg:flex lg:flex-col">
      <div className="flex items-center justify-between mb-3 lg:mb-6">
        <p className="text-sm font-semibold text-white lg:text-[10px] lg:text-gray-500 lg:uppercase lg:tracking-[0.12em]">Ingresos vs Gastos</p>
        <p className="text-[11px] text-gray-400 capitalize">{mes}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3 lg:gap-6 lg:mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-ok" />
            <p className="text-xs text-gray-400">Ingresos</p>
          </div>
          <p className="text-lg lg:text-xl font-bold font-mono text-ok">{fmt(ingresos)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-bad" />
            <p className="text-xs text-gray-400">Gastos</p>
          </div>
          <p className="text-lg lg:text-xl font-bold font-mono text-bad">{fmt(gastos)}</p>
        </div>
      </div>
      {total > 0 && (
        <div className="lg:mt-auto">
          <div className="flex h-2 lg:h-3 rounded-full overflow-hidden gap-0.5 mb-1.5">
            <div className="bg-ok rounded-l-full" style={{ width: `${Math.max(0, 100 - pctGastos)}%` }} />
            <div className="bg-bad rounded-r-full" style={{ width: `${Math.min(pctGastos, 100)}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 text-right">
            {Math.round(pctGastos)}% de ingresos gastado
          </p>
        </div>
      )}
    </div>
  )
}

// ── Vista Pareja (todo personal combinado) ────────────────────
function VistaPareja({ txMesData, txHistoricoData, cuentas, tarjetas, apartados }) {
  const tx        = txMesData.filter((t) => t.contexto !== 'negocio')
  const txHist    = txHistoricoData.filter((t) => t.contexto !== 'negocio')
  const patrimonio = cuentas.filter((c) => c.persona !== 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(apartados, cuentas, (c) => c.persona !== 'negocio')
    - tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const ingresos  = tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos    = tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo     = ingresos - gastos

  const sparkFlujo   = useMemo(() => buildSparklineData(tx, 14), [tx])
  const sparkPatrim  = useMemo(() => buildSparklineData(txHist, 30), [txHist])

  const flujoAnterior = useMemo(() => flujoMesAnterior(txHist), [txHist])
  const deltaFlujo     = pctVsAnterior(flujo, flujoAnterior)
  const deltaPatrimonio = pctVsAnterior(patrimonio, patrimonio - flujo)

  return (
    <div className="space-y-3 lg:space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:gap-6">
        <MetricaCard label="Patrimonio" valor={patrimonio} sufijo={patrimonio >= 0 ? 'activo' : 'déficit'} sparkData={sparkPatrim} deltaPct={deltaPatrimonio} />
        <MetricaCard label="Flujo mes" valor={flujo} positivo={flujo >= 0} sufijo={flujo >= 0 ? 'positivo' : 'negativo'} sparkData={sparkFlujo} deltaPct={deltaFlujo} />
      </div>
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 space-y-3 lg:space-y-0">
        <div className="lg:col-span-7">
          {txHist.length > 0
            ? <GraficaFlujo transacciones={txHist} />
            : <div className="card p-4 flex items-center justify-center h-20"><p className="text-xs text-gray-400">Sin movimientos para graficar</p></div>
          }
        </div>
        <div className="lg:col-span-5">
          <IngresosGastosCard ingresos={ingresos} gastos={gastos} />
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
        <PresupuestosWidget transacciones={txMesData} />
        {tx.filter((t) => t.tipo === 'gasto').length > 0 && <GraficaCategorias transacciones={tx} />}
      </div>
      <UltimosMovimientos transacciones={[...tx].reverse()} />
    </div>
  )
}

// ── Vista individual de una persona ──────────────────────────
function VistaPersona({ persona, nombre, txMesData, txHistoricoData, cuentas, tarjetas, apartados }) {
  // Solo cuentas propias (no compartidas, no negocio)
  const cuentasPersona = cuentas.filter((c) => c.persona === persona)
  const tarjetasPersona = tarjetas.filter((t) => t.persona === persona)

  const saldoCuentas  = cuentasPersona.reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(apartados, cuentas, (c) => c.persona === persona)
  const deudaTarjetas = tarjetasPersona.reduce((s, t) => s + Number(t.saldo_total), 0)
  const patrimonio    = saldoCuentas - deudaTarjetas

  // Movimientos de esta persona (contexto personal)
  const tx = txMesData.filter((t) => t.contexto !== 'negocio' && (t.persona === persona || t.persona === 'ambos'))
  const txHist = txHistoricoData.filter((t) => t.contexto !== 'negocio' && (t.persona === persona || t.persona === 'ambos'))

  const ingresos = tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo    = ingresos - gastos

  const sparkFlujo  = useMemo(() => buildSparklineData(tx, 14), [tx])
  const sparkPatrim = useMemo(() => buildSparklineData(txHist, 30), [txHist])

  const flujoAnterior = useMemo(() => flujoMesAnterior(txHist), [txHist])
  const deltaFlujo     = pctVsAnterior(flujo, flujoAnterior)
  const deltaPatrimonio = pctVsAnterior(patrimonio, patrimonio - flujo)

  return (
    <div className="space-y-3 lg:space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:gap-6">
        <MetricaCard label={`Patrimonio de ${nombre}`} valor={patrimonio} sufijo={patrimonio >= 0 ? 'activo' : 'déficit'} sparkData={sparkPatrim} deltaPct={deltaPatrimonio} />
        <MetricaCard label="Flujo mes" valor={flujo} positivo={flujo >= 0} sufijo={flujo >= 0 ? 'positivo' : 'negativo'} sparkData={sparkFlujo} deltaPct={deltaFlujo} />
      </div>

      {cuentasPersona.length > 0 && (
        <Colapsable titulo={`Cuentas de ${nombre}`}>
          {cuentasPersona.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
              <p className="text-sm text-gray-300">{c.nombre}</p>
              <p className="text-sm font-mono font-medium text-white">{fmt(c.saldo)}</p>
            </div>
          ))}
        </Colapsable>
      )}

      {tarjetasPersona.length > 0 && (
        <Colapsable titulo={`Tarjetas de ${nombre}`}>
          {tarjetasPersona.map((t) => (
            <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
              <p className="text-sm text-gray-300">{t.nombre}</p>
              <p className="text-sm font-mono font-medium text-bad">-{fmt(t.saldo_total)}</p>
            </div>
          ))}
        </Colapsable>
      )}

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 space-y-3 lg:space-y-0">
        <div className="lg:col-span-7">
          {txHist.length > 0
            ? <GraficaFlujo transacciones={txHist} />
            : <div className="card p-4 flex items-center justify-center h-20"><p className="text-xs text-gray-400">Sin movimientos para graficar</p></div>
          }
        </div>
        <div className="lg:col-span-5">
          <IngresosGastosCard ingresos={ingresos} gastos={gastos} />
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
        <PresupuestosWidget transacciones={txMesData} persona={persona} />
        {tx.filter((t) => t.tipo === 'gasto').length > 0 && <GraficaCategorias transacciones={tx} />}
      </div>
      <UltimosMovimientos transacciones={[...tx].reverse()} />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function DashboardPersonal({ txMesData, txHistoricoData, nombres }) {
  const [subVista, setSubVista] = useState('pareja')
  const { data: cuentas = [] }  = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const { data: apartados = [] } = useTodosLosApartados()

  const SUB_TABS = [
    { id: 'pareja', label: '👫 Pareja' },
    { id: 'p1',     label: nombres.p1 },
    { id: 'p2',     label: nombres.p2 },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Sub-tabs */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0 lg:inline-flex lg:w-auto lg:mx-10 lg:mt-6 lg:mb-2 lg:p-1 lg:bg-surface-900 lg:rounded-xl lg:border lg:border-white/[0.04] lg:border-b-0">
        {SUB_TABS.map((t) => (
          <button
            key={t.id} onClick={() => setSubVista(t.id)}
            className={cn(
              'flex-1 py-1.5 rounded-xl text-xs font-medium transition-all border',
              'lg:flex-none lg:px-5 lg:py-1.5 lg:rounded-lg lg:border-0 lg:text-sm',
              subVista === t.id
                ? 'bg-surface-600 border-white/20 text-white lg:bg-[var(--accent)] lg:font-semibold'
                : 'border-transparent text-gray-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="page px-4 pt-4 lg:px-10 lg:pt-2">
        <div className="lg:max-w-6xl">
          {subVista === 'pareja' && (
            <VistaPareja
              txMesData={txMesData} txHistoricoData={txHistoricoData}
              cuentas={cuentas} tarjetas={tarjetas} apartados={apartados}
            />
          )}
          {subVista === 'p1' && (
            <VistaPersona
              persona="p1" nombre={nombres.p1}
              txMesData={txMesData} txHistoricoData={txHistoricoData}
              cuentas={cuentas} tarjetas={tarjetas} apartados={apartados}
            />
          )}
          {subVista === 'p2' && (
            <VistaPersona
              persona="p2" nombre={nombres.p2}
              txMesData={txMesData} txHistoricoData={txHistoricoData}
              cuentas={cuentas} tarjetas={tarjetas} apartados={apartados}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// src/modules/dashboard/components/DashboardPersonal.jsx
import { useState, useMemo } from 'react'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { buildSparklineData, buildCumulativoMes } from '../hooks/useDashboard'
import GraficaFlujo from './GraficaFlujo'
import GraficaCategorias from './GraficaCategorias'
import UltimosMovimientos from './UltimosMovimientos'
import Sparkline from './Sparkline'
import PresupuestosWidget from './PresupuestosWidget'
import TarjetasResumen from './TarjetasResumen'
import MetasResumen from './MetasResumen'
import PatrimonioDesglose from './PatrimonioDesglose'
import { useDeudaPorPersona } from '../hooks/useDeudaPorPersona'
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

// Monto de un solo tipo (ingreso/gasto) en el mes calendario anterior —
// usado por los deltas "vs mes anterior" de Ingresos y Gastos en el switch.
function montoMesAnterior(txFiltrado, tipo) {
  const hoy = new Date()
  const inicio = format(startOfMonth(subMonths(hoy, 1)), 'yyyy-MM-dd')
  const fin    = format(endOfMonth(subMonths(hoy, 1)), 'yyyy-MM-dd')
  return txFiltrado
    .filter((t) => t.fecha >= inicio && t.fecha <= fin && t.tipo === tipo)
    .reduce((s, t) => s + Number(t.monto), 0)
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
    <div className="card p-3.5 lg:p-5 flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-1.5 mb-1 lg:mb-2.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide lg:text-gray-500 lg:tracking-[0.1em] lg:font-semibold truncate min-w-0">{label}</p>
        <div className={cn('flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full lg:font-bold flex-shrink-0',
          isPos ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
        )}>
          {isPos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
          {sufijo}
        </div>
      </div>
      <p className={cn('text-xl lg:text-2xl font-bold font-mono leading-tight mb-1 lg:mb-1.5 truncate', isPos ? 'text-white' : 'text-bad')}>
        {fmt(Math.abs(valor))}
      </p>
      <div className="hidden lg:flex items-center gap-1 text-[10px] font-medium text-gray-500 whitespace-nowrap mb-2">
        {hayDelta ? (
          <>
            {deltaPos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {Math.round(Math.abs(deltaPct))}% vs mes ant.
          </>
        ) : (
          <span>sin dato anterior</span>
        )}
      </div>
      {sparkData && sparkData.length >= 2 && (
        <div className="mt-auto -mx-1 lg:h-10">
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

// Veredicto inmediato de qué tan sano viene el mes — antes el usuario tenía
// que leer 4 números sueltos para sacar esta conclusión. El criterio:
// flujo negativo = gastando más de lo que entra (rojo); ≥85% de ingresos ya
// gastado = ajustado (amarillo); si no, va bien (verde).
function SaludMes({ ingresos, gastos, flujo, nombre }) {
  const pctGastado = ingresos > 0 ? (gastos / ingresos) * 100 : 0

  let estado
  if (flujo < 0) {
    estado = {
      emoji: '🔴', color: 'text-bad', barColor: 'bg-bad', bg: 'bg-bad/10', borde: 'border-bad/25',
      veredicto: 'Gastando más de lo que entra',
      detalle: `Este mes ${nombre} gastó ${fmt(Math.abs(flujo))} más de lo que ingresó.`,
    }
  } else if (pctGastado >= 85) {
    estado = {
      emoji: '🟡', color: 'text-warn', barColor: 'bg-warn', bg: 'bg-warn/10', borde: 'border-warn/25',
      veredicto: 'Vas ajustado este mes',
      detalle: `Te queda ${fmt(flujo)} de margen — ya llevas ${Math.round(pctGastado)}% de tus ingresos gastado.`,
    }
  } else {
    estado = {
      emoji: '🟢', color: 'text-ok', barColor: 'bg-ok', bg: 'bg-ok/10', borde: 'border-ok/25',
      veredicto: 'Vas bien este mes',
      detalle: `Llevas ${fmt(flujo)} de sobrante y solo ${Math.round(pctGastado)}% de tus ingresos gastado.`,
    }
  }

  return (
    <div className={cn('card p-4 lg:p-6 border flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6', estado.bg, estado.borde)}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xl lg:text-2xl">{estado.emoji}</span>
          <span className={cn('text-sm lg:text-lg font-bold', estado.color)}>{estado.veredicto}</span>
        </div>
        <p className="text-xs lg:text-sm text-gray-300 leading-relaxed">{estado.detalle}</p>
      </div>
      <div className="w-full sm:w-40 lg:w-56 flex-shrink-0">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1.5">
          <div className={cn('h-full rounded-full', estado.barColor)} style={{ width: `${Math.min(pctGastado, 100)}%` }} />
        </div>
        <p className="text-[11px] text-gray-400 text-right">{Math.round(pctGastado)}% de ingresos gastado</p>
      </div>
    </div>
  )
}

// Cuentas vs inversiones del patrimonio (apartados personales cuentan como cuentas).
// cuentas + inversiones − deuda = patrimonio, igual que la regla de negocio.
function desglosePatrimonio(cuentasFiltradas, apartados, predCuenta, deudaTarjetas) {
  const inversiones = cuentasFiltradas
    .filter((c) => c.tipo === 'inversion')
    .reduce((s, c) => s + Number(c.saldo), 0)
  const cuentasSaldo = cuentasFiltradas
    .filter((c) => c.tipo !== 'inversion')
    .reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(apartados, cuentasFiltradas, predCuenta)
  return { cuentas: cuentasSaldo, inversiones, deuda: deudaTarjetas }
}

// ── Vista Pareja (todo personal combinado) ────────────────────
function VistaPareja({ txMesData, txHistoricoData, cuentas, tarjetas, apartados, deuda, nombres }) {
  const tx        = txMesData.filter((t) => t.contexto !== 'negocio')
  const txHist    = txHistoricoData.filter((t) => t.contexto !== 'negocio')
  const patrimonio = cuentas.filter((c) => c.persona !== 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(apartados, cuentas, (c) => c.persona !== 'negocio')
    - tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const ingresos  = tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos    = tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo     = ingresos - gastos
  const cuentasPareja = cuentas.filter((c) => c.persona !== 'negocio')
  const desglose  = desglosePatrimonio(
    cuentasPareja, apartados, () => true,
    tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  )

  const sparkFlujo   = useMemo(() => buildSparklineData(tx, 14), [tx])
  const sparkPatrim  = useMemo(() => buildSparklineData(txHist, 30), [txHist])
  const sparkIngresos = useMemo(() => buildCumulativoMes(tx, 'ingreso'), [tx])
  const sparkGastos   = useMemo(() => buildCumulativoMes(tx, 'gasto'), [tx])

  const flujoAnterior = useMemo(() => flujoMesAnterior(txHist), [txHist])
  const deltaFlujo     = pctVsAnterior(flujo, flujoAnterior)
  const deltaPatrimonio = pctVsAnterior(patrimonio, patrimonio - flujo)
  const ingresosAnterior = useMemo(() => montoMesAnterior(txHist, 'ingreso'), [txHist])
  const gastosAnterior   = useMemo(() => montoMesAnterior(txHist, 'gasto'), [txHist])
  const deltaIngresos = pctVsAnterior(ingresos, ingresosAnterior)
  const deltaGastos   = pctVsAnterior(gastos, gastosAnterior)

  const metricsGrid = [
    { label: 'Patrimonio',    valor: patrimonio, positivo: patrimonio >= 0, sufijo: patrimonio >= 0 ? 'activo' : 'déficit', deltaPct: deltaPatrimonio, sparkData: sparkPatrim },
    { label: 'Flujo del mes', valor: flujo,      positivo: flujo >= 0,      sufijo: flujo >= 0 ? 'positivo' : 'negativo',   deltaPct: deltaFlujo,      sparkData: sparkFlujo },
    { label: 'Ingresos',      valor: ingresos,   positivo: true,            sufijo: 'recibido',                            deltaPct: deltaIngresos,   sparkData: sparkIngresos },
    { label: 'Gastos',        valor: gastos,     positivo: false,           sufijo: 'gastado',                             deltaPct: deltaGastos,     sparkData: sparkGastos },
  ]

  return (
    <div className="space-y-3 lg:space-y-6">
      <SaludMes ingresos={ingresos} gastos={gastos} flujo={flujo} nombre="la pareja" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {metricsGrid.map((m) => <MetricaCard key={m.label} {...m} />)}
      </div>
      <PatrimonioDesglose {...desglose} detalleDeuda={`Ambos ${fmt(deuda.ambos)} · ${nombres.p1} ${fmt(deuda.p1)} · ${nombres.p2} ${fmt(deuda.p2)}`} />
      {txHist.length > 0 && <GraficaFlujo transacciones={txHist} />}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
        <IngresosGastosCard ingresos={ingresos} gastos={gastos} />
        <PresupuestosWidget transacciones={txMesData} />
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
        <TarjetasResumen tarjetas={tarjetas} />
        <MetasResumen />
      </div>
      {tx.filter((t) => t.tipo === 'gasto').length > 0 && <GraficaCategorias transacciones={tx} />}
      <UltimosMovimientos transacciones={[...tx].reverse()} />
    </div>
  )
}

// ── Vista individual de una persona ──────────────────────────
function VistaPersona({ persona, nombre, txMesData, txHistoricoData, cuentas, tarjetas, apartados, deuda }) {
  // Solo cuentas propias (no compartidas, no negocio)
  const cuentasPersona = cuentas.filter((c) => c.persona === persona)
  const tarjetasPersona = tarjetas.filter((t) => t.persona === persona)

  const saldoCuentas  = cuentasPersona.reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(apartados, cuentas, (c) => c.persona === persona)
  // Lo que le toca de la deuda de tarjetas según SUS gastos (sin los de Ambos)
  const deudaTarjetas = deuda[persona]
  const patrimonio    = saldoCuentas - deudaTarjetas

  // Movimientos de esta persona (contexto personal)
  const tx = txMesData.filter((t) => t.contexto !== 'negocio' && (t.persona === persona || t.persona === 'ambos'))
  const txHist = txHistoricoData.filter((t) => t.contexto !== 'negocio' && (t.persona === persona || t.persona === 'ambos'))

  const ingresos = tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo    = ingresos - gastos
  const desglose = desglosePatrimonio(cuentasPersona, apartados, () => true, deudaTarjetas)

  const sparkFlujo  = useMemo(() => buildSparklineData(tx, 14), [tx])
  const sparkPatrim = useMemo(() => buildSparklineData(txHist, 30), [txHist])
  const sparkIngresos = useMemo(() => buildCumulativoMes(tx, 'ingreso'), [tx])
  const sparkGastos   = useMemo(() => buildCumulativoMes(tx, 'gasto'), [tx])

  const flujoAnterior = useMemo(() => flujoMesAnterior(txHist), [txHist])
  const deltaFlujo     = pctVsAnterior(flujo, flujoAnterior)
  const deltaPatrimonio = pctVsAnterior(patrimonio, patrimonio - flujo)
  const ingresosAnterior = useMemo(() => montoMesAnterior(txHist, 'ingreso'), [txHist])
  const gastosAnterior   = useMemo(() => montoMesAnterior(txHist, 'gasto'), [txHist])
  const deltaIngresos = pctVsAnterior(ingresos, ingresosAnterior)
  const deltaGastos   = pctVsAnterior(gastos, gastosAnterior)

  const metricsGrid = [
    { label: `Patrimonio de ${nombre}`, valor: patrimonio, positivo: patrimonio >= 0, sufijo: patrimonio >= 0 ? 'activo' : 'déficit', deltaPct: deltaPatrimonio, sparkData: sparkPatrim },
    { label: 'Flujo del mes',           valor: flujo,      positivo: flujo >= 0,      sufijo: flujo >= 0 ? 'positivo' : 'negativo',   deltaPct: deltaFlujo,      sparkData: sparkFlujo },
    { label: 'Ingresos',                valor: ingresos,   positivo: true,            sufijo: 'recibido',                            deltaPct: deltaIngresos,   sparkData: sparkIngresos },
    { label: 'Gastos',                  valor: gastos,     positivo: false,           sufijo: 'gastado',                             deltaPct: deltaGastos,     sparkData: sparkGastos },
  ]

  return (
    <div className="space-y-3 lg:space-y-6">
      <SaludMes ingresos={ingresos} gastos={gastos} flujo={flujo} nombre={nombre} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {metricsGrid.map((m) => <MetricaCard key={m.label} {...m} />)}
      </div>
      <PatrimonioDesglose {...desglose} detalleDeuda="Según sus gastos con tarjeta" />

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

      {txHist.length > 0 && <GraficaFlujo transacciones={txHist} />}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
        <IngresosGastosCard ingresos={ingresos} gastos={gastos} />
        <PresupuestosWidget transacciones={txMesData} persona={persona} />
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-3 lg:space-y-0">
        <TarjetasResumen tarjetas={tarjetasPersona} />
        <MetasResumen persona={persona} />
      </div>
      {tx.filter((t) => t.tipo === 'gasto').length > 0 && <GraficaCategorias transacciones={tx} />}
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
  const deuda = useDeudaPorPersona(tarjetas)

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
              cuentas={cuentas} tarjetas={tarjetas} apartados={apartados} deuda={deuda} nombres={nombres}
            />
          )}
          {subVista === 'p1' && (
            <VistaPersona
              persona="p1" nombre={nombres.p1}
              txMesData={txMesData} txHistoricoData={txHistoricoData}
              cuentas={cuentas} tarjetas={tarjetas} apartados={apartados} deuda={deuda}
            />
          )}
          {subVista === 'p2' && (
            <VistaPersona
              persona="p2" nombre={nombres.p2}
              txMesData={txMesData} txHistoricoData={txHistoricoData}
              cuentas={cuentas} tarjetas={tarjetas} apartados={apartados} deuda={deuda}
            />
          )}
        </div>
      </div>
    </div>
  )
}

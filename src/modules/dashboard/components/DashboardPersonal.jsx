// src/modules/dashboard/components/DashboardPersonal.jsx
import { useState, useMemo } from 'react'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { buildSparklineData } from '../hooks/useDashboard'
import GraficaFlujo from './GraficaFlujo'
import GraficaCategorias from './GraficaCategorias'
import UltimosMovimientos from './UltimosMovimientos'
import Sparkline from './Sparkline'
import PresupuestosWidget from './PresupuestosWidget'
import { fmt, cn } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

function MetricaCard({ label, valor, positivo, sparkData, sufijo }) {
  const isPos = positivo ?? valor >= 0
  return (
    <div className="card p-3.5 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={cn('flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          isPos ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
        )}>
          {isPos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
          {sufijo}
        </div>
      </div>
      <p className={cn('text-xl font-bold font-mono leading-tight mb-2', isPos ? 'text-white' : 'text-bad')}>
        {fmt(Math.abs(valor))}
      </p>
      {sparkData && sparkData.length >= 2 && (
        <div className="mt-auto -mx-1">
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
            <div className="bg-ok rounded-l-full" style={{ width: `${Math.max(0, 100 - pctGastos)}%` }} />
            <div className="bg-bad rounded-r-full" style={{ width: `${Math.min(pctGastos, 100)}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 text-right">
            {Math.round(pctGastos)}% de ingresos gastado
          </p>
        </>
      )}
    </div>
  )
}

// ── Vista Pareja (todo personal combinado) ────────────────────
function VistaPareja({ txMesData, txHistoricoData, cuentas, tarjetas }) {
  const tx        = txMesData.filter((t) => t.contexto !== 'negocio')
  const txHist    = txHistoricoData.filter((t) => t.contexto !== 'negocio')
  const patrimonio = cuentas.filter((c) => c.persona !== 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
    - tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const ingresos  = tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos    = tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const flujo     = ingresos - gastos

  const sparkFlujo   = useMemo(() => buildSparklineData(tx, 14), [tx])
  const sparkPatrim  = useMemo(() => buildSparklineData(txHist, 30), [txHist])

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <MetricaCard label="Patrimonio" valor={patrimonio} sufijo={patrimonio >= 0 ? 'activo' : 'déficit'} sparkData={sparkPatrim} />
        <MetricaCard label="Flujo mes" valor={flujo} positivo={flujo >= 0} sufijo={flujo >= 0 ? 'positivo' : 'negativo'} sparkData={sparkFlujo} />
      </div>
      {txHist.length > 0
        ? <GraficaFlujo transacciones={txHist} />
        : <div className="card p-4 mb-3 flex items-center justify-center h-20"><p className="text-xs text-gray-500">Sin movimientos para graficar</p></div>
      }
      <IngresosGastosCard ingresos={ingresos} gastos={gastos} />
      <PresupuestosWidget transacciones={txMesData} />
      {tx.filter((t) => t.tipo === 'gasto').length > 0 && <GraficaCategorias transacciones={tx} />}
      <UltimosMovimientos transacciones={[...tx].reverse()} />
    </>
  )
}

// ── Vista individual de una persona ──────────────────────────
function VistaPersona({ persona, nombre, txMesData, txHistoricoData, cuentas, tarjetas }) {
  // Solo cuentas propias (no compartidas, no negocio)
  const cuentasPersona = cuentas.filter((c) => c.persona === persona)
  const tarjetasPersona = tarjetas.filter((t) => t.persona === persona)

  const saldoCuentas  = cuentasPersona.reduce((s, c) => s + Number(c.saldo), 0)
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

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <MetricaCard label={`Patrimonio de ${nombre}`} valor={patrimonio} sufijo={patrimonio >= 0 ? 'activo' : 'déficit'} sparkData={sparkPatrim} />
        <MetricaCard label="Flujo mes" valor={flujo} positivo={flujo >= 0} sufijo={flujo >= 0 ? 'positivo' : 'negativo'} sparkData={sparkFlujo} />
      </div>

      {/* Cuentas propias */}
      {cuentasPersona.length > 0 && (
        <div className="card p-4 mb-3">
          <p className="text-sm font-semibold text-white mb-3">Cuentas de {nombre}</p>
          {cuentasPersona.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
              <p className="text-sm text-gray-300">{c.nombre}</p>
              <p className="text-sm font-mono font-medium text-white">{fmt(c.saldo)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tarjetas propias */}
      {tarjetasPersona.length > 0 && (
        <div className="card p-4 mb-3">
          <p className="text-sm font-semibold text-white mb-3">Tarjetas de {nombre}</p>
          {tarjetasPersona.map((t) => (
            <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
              <p className="text-sm text-gray-300">{t.nombre}</p>
              <p className="text-sm font-mono font-medium text-bad">-{fmt(t.saldo_total)}</p>
            </div>
          ))}
        </div>
      )}

      {txHist.length > 0
        ? <GraficaFlujo transacciones={txHist} />
        : <div className="card p-4 mb-3 flex items-center justify-center h-20"><p className="text-xs text-gray-500">Sin movimientos para graficar</p></div>
      }
      <IngresosGastosCard ingresos={ingresos} gastos={gastos} />
      <PresupuestosWidget transacciones={txMesData} persona={persona} />
      {tx.filter((t) => t.tipo === 'gasto').length > 0 && <GraficaCategorias transacciones={tx} />}
      <UltimosMovimientos transacciones={[...tx].reverse()} />
    </>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function DashboardPersonal({ txMesData, txHistoricoData, nombres }) {
  const [subVista, setSubVista] = useState('pareja')
  const { data: cuentas = [] }  = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()

  const SUB_TABS = [
    { id: 'pareja', label: '👫 Pareja' },
    { id: 'p1',     label: nombres.p1 },
    { id: 'p2',     label: nombres.p2 },
  ]

  return (
    <>
      {/* Sub-tabs */}
      <div className="flex gap-1.5 mb-4">
        {SUB_TABS.map((t) => (
          <button
            key={t.id} onClick={() => setSubVista(t.id)}
            className={cn(
              'flex-1 py-1.5 rounded-xl text-xs font-medium transition-all border',
              subVista === t.id
                ? 'bg-surface-600 border-white/20 text-white'
                : 'border-transparent text-gray-500'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subVista === 'pareja' && (
        <VistaPareja
          txMesData={txMesData} txHistoricoData={txHistoricoData}
          cuentas={cuentas} tarjetas={tarjetas}
        />
      )}
      {subVista === 'p1' && (
        <VistaPersona
          persona="p1" nombre={nombres.p1}
          txMesData={txMesData} txHistoricoData={txHistoricoData}
          cuentas={cuentas} tarjetas={tarjetas}
        />
      )}
      {subVista === 'p2' && (
        <VistaPersona
          persona="p2" nombre={nombres.p2}
          txMesData={txMesData} txHistoricoData={txHistoricoData}
          cuentas={cuentas} tarjetas={tarjetas}
        />
      )}
    </>
  )
}

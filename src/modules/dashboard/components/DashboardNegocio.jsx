// src/modules/dashboard/components/DashboardNegocio.jsx
import { useMemo } from 'react'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { useDashboardData, buildSparklineData } from '../hooks/useDashboard'
import GraficaFlujo from './GraficaFlujo'
import GraficaCategorias from './GraficaCategorias'
import UltimosMovimientos from './UltimosMovimientos'
import Sparkline from './Sparkline'
import { fmt, cn } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

function MetricaNegocio({ label, valor, positivo, sparkData, sufijo }) {
  const isPos = positivo ?? valor >= 0
  return (
    <div className="card p-3.5 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        {sufijo && (
          <div className={cn('flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            isPos ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
          )}>
            {isPos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {sufijo}
          </div>
        )}
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

export default function DashboardNegocio() {
  const { data: cuentas = [] }        = useCuentas()
  const { data: todosApartados = [] } = useTodosLosApartados()
  const { txMes, txHistorico }        = useDashboardData()

  const txMesData       = txMes.data || []
  const txHistoricoData = txHistorico.data || []

  // ── Saldo negocio ──────────────────────────────────────────
  // Cuentas reales de negocio
  const cuentasNegocio = cuentas.filter((c) => c.persona === 'negocio')
  const saldoCuentasNegocio = cuentasNegocio.reduce((s, c) => s + Number(c.saldo), 0)

  // Apartados marcados como negocio en cuentas personales
  const apartadosNegocio = todosApartados.filter((a) => a.es_negocio)
  const saldoApartadosNegocio = apartadosNegocio.reduce((s, a) => s + Number(a.monto), 0)

  const capitalNegocio = saldoCuentasNegocio + saldoApartadosNegocio

  // ── Transacciones de negocio del mes ──────────────────────
  const txNegocioMes = txMesData.filter((t) => t.contexto === 'negocio')
  const txNegocioHistorico = txHistoricoData.filter((t) => t.contexto === 'negocio')

  const ingresosNegocio = txNegocioMes
    .filter((t) => t.tipo === 'ingreso')
    .reduce((s, t) => s + Number(t.monto), 0)

  const gastosNegocio = txNegocioMes
    .filter((t) => t.tipo === 'gasto')
    .reduce((s, t) => s + Number(t.monto), 0)

  const utilidad = ingresosNegocio - gastosNegocio

  const sparkUtilidad = useMemo(() => buildSparklineData(txNegocioMes, 14), [txNegocioMes])
  const sparkCapital  = useMemo(() => buildSparklineData(txNegocioHistorico, 30), [txNegocioHistorico])

  const mes = format(new Date(), 'MMMM', { locale: es })
  const total = ingresosNegocio + gastosNegocio
  const pctGastos = total > 0 ? Math.min(100, (gastosNegocio / ingresosNegocio) * 100) : 0

  return (
    <div className="page px-4 pt-4 space-y-3">
      {/* Métricas en grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricaNegocio
          label="Capital negocio"
          valor={capitalNegocio}
          positivo={capitalNegocio >= 0}
          sufijo="disponible"
          sparkData={sparkCapital}
        />
        <MetricaNegocio
          label="Utilidad del mes"
          valor={utilidad}
          positivo={utilidad >= 0}
          sufijo={utilidad >= 0 ? 'ganancia' : 'pérdida'}
          sparkData={sparkUtilidad}
        />
      </div>

      {/* Ingresos vs Gastos negocio */}
      <div className="card p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Ingresos vs Gastos</p>
          <p className="text-[11px] text-gray-400 capitalize">{mes}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-ok" />
              <p className="text-xs text-gray-400">Ingresos</p>
            </div>
            <p className="text-lg font-bold font-mono text-ok">{fmt(ingresosNegocio)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-bad" />
              <p className="text-xs text-gray-400">Gastos</p>
            </div>
            <p className="text-lg font-bold font-mono text-bad">{fmt(gastosNegocio)}</p>
          </div>
        </div>
        {total > 0 && (
          <>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-1.5">
              <div className="bg-ok rounded-l-full" style={{ width: `${Math.max(0, 100 - pctGastos)}%` }} />
              <div className="bg-bad rounded-r-full" style={{ width: `${Math.min(pctGastos, 100)}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 text-right">
              {Math.round(pctGastos)}% de ingresos en gastos
            </p>
          </>
        )}
      </div>

      {/* Desglose de capital */}
      {(cuentasNegocio.length > 0 || apartadosNegocio.length > 0) && (
        <div className="card p-4 mt-3">
          <p className="text-sm font-semibold text-white mb-3">Capital disponible</p>
          {cuentasNegocio.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
              <p className="text-sm text-gray-300">{c.nombre}</p>
              <p className="text-sm font-mono font-medium text-white">{fmt(c.saldo)}</p>
            </div>
          ))}
          {apartadosNegocio.map((a) => {
            const cuenta = cuentas.find((c) => c.id === a.cuenta_id)
            return (
              <div key={a.id} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
                <div>
                  <p className="text-sm text-gray-300">{a.emoji} {a.nombre}</p>
                  <p className="text-[10px] text-gray-400">en {cuenta?.nombre || 'cuenta personal'}</p>
                </div>
                <p className="text-sm font-mono font-medium text-[var(--accent)]">{fmt(a.monto)}</p>
              </div>
            )
          })}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/10">
            <p className="text-xs text-gray-400 font-medium">Total</p>
            <p className="text-sm font-mono font-bold text-white">{fmt(capitalNegocio)}</p>
          </div>
        </div>
      )}

      {/* Gráfica 6 meses — solo negocio */}
      {txNegocioHistorico.length > 0 ? (
        <div className="">
          <GraficaFlujo transacciones={txNegocioHistorico} />
        </div>
      ) : (
        <div className="card p-4 mt-3 flex items-center justify-center h-20">
          <p className="text-xs text-gray-400">Sin movimientos de negocio para graficar</p>
        </div>
      )}

      {/* Gastos por categoría — negocio */}
      {txNegocioMes.filter((t) => t.tipo === 'gasto').length > 0 && (
        <div className="">
          <GraficaCategorias transacciones={txNegocioMes} />
        </div>
      )}

      {/* Últimos movimientos de negocio */}
      {txNegocioMes.length > 0 && (
        <div className="">
          <UltimosMovimientos transacciones={[...txNegocioMes].reverse()} />
        </div>
      )}

      {txNegocioMes.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-2xl mb-2">🏪</p>
          <p className="text-sm text-white font-medium mb-1">Sin movimientos de negocio este mes</p>
          <p className="text-xs text-gray-400">Registra un gasto o ingreso con contexto "Negocio" para verlos aquí</p>
        </div>
      )}
    </div>
  )
}

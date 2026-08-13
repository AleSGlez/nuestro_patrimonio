// src/modules/cards/components/DetalleCorteTarjeta.jsx
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Modal from '@ui/Modal'
import { EmptyState } from '@ui/Field'
import { useDesgloseCorteTarjeta, useComparativoTarjeta, diasHasta } from '../hooks/useTarjetas'
import { fmt, fmtDate, cn } from '@lib/utils'

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Gastos vs. pagos por responsable — barras agrupadas ───────
// "Este período" usa el mismo rango que el desglose de arriba (próximo
// corte). "Historial" sí compara cosas de temporalidad distinta a propósito
// (todo lo gastado vs. todo lo pagado desde siempre) para ver quién ha usado
// más la tarjeta y quién la ha estado pagando más. La tabla de totales
// exactos solo tiene sentido junto con "Historial" — en "Este período" se
// oculta para no duplicar lo que ya muestra la gráfica.
function GraficaGastosPagos({ tarjeta, nombres }) {
  const [periodo, setPeriodo] = useState('periodo') // 'periodo' | 'historial'
  const { data, isPending } = useComparativoTarjeta(tarjeta, periodo, true)

  const chartData = data ? [
    { label: nombres.p1, gasto: data.gastos.p1, pago: data.pagos.p1 },
    { label: nombres.p2, gasto: data.gastos.p2, pago: data.pagos.p2 },
    { label: 'Negocio',  gasto: data.gastos.negocio, pago: data.pagos.negocio },
  ] : []
  const hayDatos = chartData.some((d) => d.gasto > 0 || d.pago > 0)

  return (
    <>
      <div className="card p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Gastos vs. pagos</p>
          <div className="flex bg-surface-700 rounded-lg p-0.5">
            {[['periodo', 'Este período'], ['historial', 'Historial']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPeriodo(id)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                  periodo === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <div className="skeleton h-40" />
        ) : !hayDatos ? (
          <p className="text-xs text-gray-500 py-8 text-center">Sin movimientos en este rango.</p>
        ) : (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={chartData} barCategoryGap="30%" barGap={3}>
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="gasto" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="pago"  name="Pagos"  fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {periodo === 'historial' && !isPending && data && (
        <div className="card p-4 mt-3">
          <p className="section-label mb-3">Totales exactos</p>
          <div className="space-y-3">
            {[
              { key: 'p1',      label: nombres.p1, gasto: data.gastos.p1, pago: data.pagos.p1 },
              { key: 'p2',      label: nombres.p2, gasto: data.gastos.p2, pago: data.pagos.p2 },
              { key: 'negocio', label: 'Negocio',  gasto: data.gastos.negocio, pago: data.pagos.negocio },
            ].map((f) => (
              <div key={f.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{f.label}</span>
                <span className="text-xs font-mono">
                  <span className="text-bad">Gastos {fmt(f.gasto)}</span>
                  <span className="text-gray-600"> · </span>
                  <span className="text-ok">Pagos {fmt(f.pago)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default function DetalleCorteTarjeta({ open, onClose, tarjeta, nombres }) {
  const [vista, setVista] = useState('resumen') // 'resumen' | 'movimientos'
  const { data, isPending } = useDesgloseCorteTarjeta(tarjeta, open && vista === 'resumen')

  if (!tarjeta) return null

  const diasLimite = diasHasta(data?.fechaLimiteProxima)
  const diasCorte  = diasHasta(data?.fechaCorteProxima)

  const lineas = data ? [
    { key: 'p1',      label: nombres.p1, emoji: '👤', valor: data.p1 },
    { key: 'p2',      label: nombres.p2, emoji: '👤', valor: data.p2 },
    { key: 'negocio', label: 'Negocio',  emoji: '🏪', valor: data.negocio },
    ...(data.disposicionEfectivo > 0
      ? [{ key: 'disposicion', label: 'Disposición de efectivo', emoji: '💵', valor: data.disposicionEfectivo }]
      : []),
  ] : []

  return (
    <Modal open={open} onClose={onClose} title={`${tarjeta.nombre}`}>
      <div className="flex bg-surface-700 rounded-xl p-1 mb-4">
        {[['resumen', 'Resumen del corte'], ['movimientos', 'Gastos y pagos']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={cn(
              'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
              vista === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {vista === 'resumen' ? (
        !tarjeta.dia_corte ? (
          <EmptyState
            emoji="✂️" title="Falta configurar el día de corte"
            description="Edita la tarjeta y define el día de corte para ver el desglose del próximo pago."
          />
        ) : isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
          </div>
        ) : (
          <>
            {/* Corte actual — ya facturado, por vencer */}
            <div className="card p-4 mb-3">
              <p className="text-xs text-gray-400 mb-1">
                {data?.fechaLimiteProxima && `Vence el ${fmtDate(data.fechaLimiteProxima, 'medium')}`}
                {diasLimite != null && ` · en ${diasLimite} ${diasLimite === 1 ? 'día' : 'días'}`}
              </p>
              <p className="text-2xl font-bold font-mono text-bad">{fmt(data?.corteActual || 0)}</p>
              <p className="text-xs text-gray-400">Corte actual — ya facturado</p>
            </div>

            {/* Próximo corte — aún se está acumulando, con desglose por responsable */}
            <div className="card p-4 mb-4">
              <p className="text-xs text-gray-400 mb-1">
                {data?.fechaCorteProxima && `Se cierra el ${fmtDate(data.fechaCorteProxima, 'medium')}`}
                {diasCorte != null && ` · en ${diasCorte} ${diasCorte === 1 ? 'día' : 'días'}`}
              </p>
              {data && (
                <p className="text-[11px] text-gray-500 mb-2">
                  Período: {fmtDate(data.inicio)} – {fmtDate(data.fin)}
                </p>
              )}
              <p className="text-2xl font-bold font-mono text-white">{fmt(data?.total || 0)}</p>
              <p className="text-xs text-gray-400">Próximo corte — aún se está acumulando</p>
            </div>

            {data?.total > 0 ? (
              <div className="card px-3">
                {lineas.map((l) => (
                  <div key={l.key} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
                    <span className="text-sm text-gray-300 flex items-center gap-2">
                      <span>{l.emoji}</span>{l.label}
                    </span>
                    <span className="text-sm font-mono font-semibold text-white">{fmt(l.valor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                emoji="✅" title="Sin movimientos en este período"
                description="Aún no hay compras que se vayan a cobrar en el próximo corte."
              />
            )}
          </>
        )
      ) : (
        <>
          <div className="card p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">Deuda total actual</p>
            <p className="text-2xl font-bold font-mono text-bad">{fmt(tarjeta.saldo_total)}</p>
          </div>

          <GraficaGastosPagos tarjeta={tarjeta} nombres={nombres} />
        </>
      )}
    </Modal>
  )
}

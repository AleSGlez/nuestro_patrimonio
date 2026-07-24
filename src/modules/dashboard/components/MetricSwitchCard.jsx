// src/modules/dashboard/components/MetricSwitchCard.jsx
import { useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { fmt, cn } from '@lib/utils'

// Card "hero" con switch entre varias métricas (Patrimonio/Flujo/Ingresos/
// Gastos) — cada una con su propio valor, delta vs mes anterior y curva de
// tendencia. Reemplaza el par de MetricaCard + la gráfica de 6 meses en
// VistaPareja (ver DashboardPersonal.jsx).
export default function MetricSwitchCard({ metrics }) {
  const [activo, setActivo] = useState(0)
  const m = metrics[activo]
  const chartData = (m.sparkData || []).map((v, i) => ({ i, v }))

  return (
    <div className="card p-4 lg:p-6 mb-3">
      <div className="relative flex bg-surface-700 lg:bg-surface-900 lg:border lg:border-white/[0.06] rounded-xl p-1 mb-4 lg:mb-6">
        <div
          className="absolute top-1 left-1 bottom-1 rounded-lg bg-[var(--accent)] transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 8px) / ${metrics.length})`,
            transform: `translateX(calc(${activo} * 100%))`,
          }}
        />
        {metrics.map((metric, i) => (
          <button
            key={metric.id}
            onClick={() => setActivo(i)}
            className={cn(
              'relative z-10 flex-1 py-2 text-xs lg:text-sm font-semibold rounded-lg transition-colors',
              i === activo ? 'text-white' : 'text-gray-400'
            )}
          >
            {metric.label}
          </button>
        ))}
      </div>

      <p className={cn('text-2xl lg:text-4xl font-bold font-mono mb-1 lg:mb-2', m.valorBad ? 'text-bad' : 'text-white')}>
        {fmt(Math.abs(m.valor))}
      </p>

      <div className="flex items-center gap-2 mb-4 lg:mb-6">
        <span className="text-xs lg:text-sm text-gray-400">vs mes anterior</span>
        {m.deltaPct !== null && m.deltaPct !== undefined ? (
          <span className={cn(
            'flex items-center gap-0.5 text-xs lg:text-sm font-bold font-mono px-2 py-0.5 rounded-full',
            m.deltaPct >= 0 ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
          )}>
            {m.deltaPct >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.round(Math.abs(m.deltaPct))}%
          </span>
        ) : (
          <span className="text-xs text-gray-500">sin dato anterior</span>
        )}
      </div>

      <div className="h-20 lg:h-40 -mx-1">
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`grad-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={m.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={m.color} strokeWidth={1.5} fill={`url(#grad-${m.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-500">Sin datos suficientes para graficar</p>
          </div>
        )}
      </div>
    </div>
  )
}

// src/modules/dashboard/components/GraficaFlujo.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { fmt } from '@lib/utils'

function buildData(transacciones) {
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM', { locale: es }),
      ingresos: 0,
      gastos: 0,
    }
  })

  transacciones.forEach((t) => {
    const key = t.fecha.slice(0, 7)
    const mes = meses.find((m) => m.key === key)
    if (!mes) return
    if (t.tipo === 'ingreso') mes.ingresos += Number(t.monto)
    if (t.tipo === 'gasto')   mes.gastos   += Number(t.monto)
  })

  return meses
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-gray-400 mb-1 capitalize">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function GraficaFlujo({ transacciones }) {
  const data = buildData(transacciones)

  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full lg:flex lg:flex-col">
      <p className="section-label mb-4 lg:mb-8">Flujo últimos 6 meses</p>
      <div className="lg:flex-1 lg:min-h-[160px]">
        <ResponsiveContainer width="100%" height={160} className="lg:!h-full">
          <BarChart data={data} barCategoryGap="25%" barGap={3}>
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4,4,0,0]} maxBarSize={24} />
            <Bar dataKey="gastos"   name="Gastos"   fill="#EF4444" radius={[4,4,0,0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

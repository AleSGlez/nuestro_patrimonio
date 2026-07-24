// src/modules/dashboard/components/GraficaCategorias.jsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt, CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO } from '@lib/utils'

const ALL_CATS = [...CAT_GASTO, ...CAT_INGRESO, ...CAT_NEGOCIO_GASTO]
const COLORS = ['#7C6EFA','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#8B5CF6','#F97316','#06B6D4','#84CC16']

function buildData(transacciones) {
  const map = {}
  transacciones
    .filter((t) => t.tipo === 'gasto')
    .forEach((t) => {
      map[t.categoria] = (map[t.categoria] || 0) + Number(t.monto)
    })

  return Object.entries(map)
    .map(([cat, monto]) => {
      const info = ALL_CATS.find((c) => c.value === cat) || { emoji: '📦', label: cat }
      return { name: `${info.emoji} ${info.label}`, value: monto }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-white mb-0.5">{payload[0].name}</p>
      <p className="font-mono text-[var(--accent)]">{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function GraficaCategorias({ transacciones }) {
  const data = buildData(transacciones)
  if (data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full lg:flex lg:flex-col">
      <p className="section-label mb-4 lg:mb-6">Gastos por categoría</p>
      <div className="flex items-center gap-4 lg:gap-8 lg:flex-1 lg:justify-center">
        <div className="flex-shrink-0 lg:!w-44 lg:!h-44" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data} cx="50%" cy="50%"
                innerRadius="53%" outerRadius="90%"
                dataKey="value" stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <p className="text-xs text-gray-300 truncate flex-1">{d.name}</p>
              <p className="text-xs font-mono text-gray-400 flex-shrink-0">{Math.round((d.value/total)*100)}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

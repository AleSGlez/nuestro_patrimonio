// src/modules/dashboard/components/GraficaFlujo.jsx
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { fmt } from '@lib/utils'

const COLOR_INGRESO = '#10B981'
const COLOR_GASTO_CUENTA  = '#EF4444' // efectivo / débito
const COLOR_GASTO_TARJETA = '#FCA5A5' // tarjeta de crédito

// Un gasto es "con tarjeta" si trae tarjeta_id o metodo_pago "tarjeta:UUID"
function esConTarjeta(t) {
  return !!t.tarjeta_id || String(t.metodo_pago || '').startsWith('tarjeta')
}

function buildData(transacciones) {
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM', { locale: es }),
      ingresos: 0,
      gastosCuenta: 0,
      gastosTarjeta: 0,
    }
  })

  transacciones.forEach((t) => {
    const key = t.fecha.slice(0, 7)
    const mes = meses.find((m) => m.key === key)
    if (!mes) return
    if (t.tipo === 'ingreso') mes.ingresos += Number(t.monto)
    if (t.tipo === 'gasto') {
      if (esConTarjeta(t)) mes.gastosTarjeta += Number(t.monto)
      else                 mes.gastosCuenta  += Number(t.monto)
    }
  })

  return meses
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-gray-400 mb-1 capitalize">{label}</p>
      <p style={{ color: COLOR_INGRESO }} className="font-mono">Ingresos: {fmt(d.ingresos)}</p>
      <p style={{ color: COLOR_GASTO_CUENTA }} className="font-mono">Gastos: {fmt(d.gastosCuenta + d.gastosTarjeta)}</p>
      <p style={{ color: COLOR_GASTO_CUENTA }} className="font-mono pl-2 opacity-90">· Efectivo/débito: {fmt(d.gastosCuenta)}</p>
      <p style={{ color: COLOR_GASTO_TARJETA }} className="font-mono pl-2 opacity-90">· Tarjeta: {fmt(d.gastosTarjeta)}</p>
    </div>
  )
}

function LeyendaItem({ color, texto }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {texto}
    </span>
  )
}

export default function GraficaFlujo({ transacciones }) {
  const data = buildData(transacciones)

  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full lg:flex lg:flex-col">
      <div className="flex items-start justify-between gap-2 mb-4 lg:mb-8">
        <p className="section-label">Flujo últimos 6 meses</p>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] text-gray-400">
          <LeyendaItem color={COLOR_INGRESO} texto="Ingresos" />
          <LeyendaItem color={COLOR_GASTO_CUENTA} texto="Efectivo/débito" />
          <LeyendaItem color={COLOR_GASTO_TARJETA} texto="Tarjeta" />
        </div>
      </div>
      <div className="lg:flex-1 lg:min-h-[160px]">
        <ResponsiveContainer width="100%" height={160} className="lg:!h-full">
          <BarChart data={data} barCategoryGap="25%" barGap={3}>
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill={COLOR_INGRESO} radius={[4,4,0,0]} maxBarSize={24} />
            {/* Barra de gastos apilada: abajo efectivo/débito, arriba tarjeta.
                Solo el segmento superior visible lleva esquinas redondeadas. */}
            <Bar dataKey="gastosCuenta" stackId="gastos" name="Efectivo/débito" fill={COLOR_GASTO_CUENTA} maxBarSize={24}>
              {data.map((m) => (
                <Cell key={m.key} radius={m.gastosTarjeta > 0 ? 0 : [4,4,0,0]} />
              ))}
            </Bar>
            <Bar dataKey="gastosTarjeta" stackId="gastos" name="Tarjeta" fill={COLOR_GASTO_TARJETA} radius={[4,4,0,0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

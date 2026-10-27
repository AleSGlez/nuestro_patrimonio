// src/modules/dashboard/components/GraficaFlujo.jsx
import { useState } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { parsearMetodoPago } from '@modules/transactions/hooks/useTransacciones'
import { fmt, cn } from '@lib/utils'

// Respaldo por si una tarjeta no tiene color guardado.
const COLOR_OTRAS = '#FCA5A5'
const COLORES_TARJETA = ['#FCA5A5', '#F9A8D4', '#FDBA74', '#C4B5FD', '#93C5FD']

// Una fila por mes. El gasto se parte en "efectivo/débito" (cuenta) y una
// columna por tarjeta (t_<id>) para poder apilar la barra de gastos.
function buildData(transacciones, tarjetasIds) {
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM', { locale: es }),
      ingresos: 0,
      gastos: 0,
      cuenta: 0,
      tarjeta: 0,
      otras: 0,
    }
  })

  transacciones.forEach((t) => {
    const mes = meses.find((m) => m.key === t.fecha.slice(0, 7))
    if (!mes) return
    const monto = Number(t.monto)
    if (t.tipo === 'ingreso') mes.ingresos += monto
    if (t.tipo === 'gasto') {
      mes.gastos += monto
      // Mismo criterio que antes en main: es "con tarjeta" si trae tarjeta_id
      // o metodo_pago "tarjeta:UUID". Si la tarjeta ya no está activa, el gasto
      // cuenta como tarjeta igual (queda en "Otras tarjetas").
      const metodo = parsearMetodoPago(t.metodo_pago, t.cuenta_id, t.tarjeta_id)
      const tarjetaId = metodo?.tipo === 'tarjeta' ? metodo.id : t.tarjeta_id
      const conTarjeta = !!tarjetaId || String(t.metodo_pago || '').startsWith('tarjeta')
      if (conTarjeta) {
        mes.tarjeta += monto
        if (tarjetaId && tarjetasIds.has(tarjetaId)) {
          mes[`t_${tarjetaId}`] = (mes[`t_${tarjetaId}`] || 0) + monto
        } else {
          mes.otras += monto
        }
      } else {
        mes.cuenta += monto
      }
    }
  })

  return meses
}

function segmentoSuperior(mes, segmentos) {
  return [...segmentos].reverse().find((sg) => mes[sg.key] > 0)?.key
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload
  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-gray-400 mb-1 capitalize">{label}</p>
      <p className="font-mono text-ok">Ingresos: {fmt(fila.ingresos)}</p>
      <p className="font-mono text-bad">Gastos: {fmt(fila.gastos)}</p>
    </div>
  )
}

function Linea({ label, valor, className, sub }) {
  return (
    <div className={cn('flex justify-between gap-3', sub && 'pl-3', className)}>
      <span>{label}</span>
      <span className="font-mono whitespace-nowrap">{valor}</span>
    </div>
  )
}

// Detalle del mes seleccionado: antes solo había un tooltip al pasar el dedo.
// Ahora es una fila colapsable con el desglose por tarjeta, balance, ahorro y
// la comparación contra el mes anterior.
function DetalleMes({ mes, anterior, tarjetas, abierto, onToggle }) {
  const neto = mes.ingresos - mes.gastos
  const ahorro = mes.ingresos > 0 ? (neto / mes.ingresos) * 100 : 0
  const colorNeto = neto >= 0 ? 'text-ok' : 'text-bad'

  let comparacion = null
  if (anterior) {
    const netoAnt = anterior.ingresos - anterior.gastos
    const ahorroAnt = anterior.ingresos > 0 ? (netoAnt / anterior.ingresos) * 100 : 0
    const dNeto = neto - netoAnt
    const dAhorro = ahorro - ahorroAnt
    comparacion = `vs ${anterior.label}: balance ${dNeto >= 0 ? '+' : '−'}${fmt(Math.abs(dNeto))} · ahorro ${dAhorro >= 0 ? '+' : '−'}${Math.abs(dAhorro).toFixed(1)} pts`
  }

  return (
    <div className="mt-3 bg-surface-700 border border-white/[0.08] rounded-xl p-3">
      <button
        onClick={onToggle}
        aria-expanded={abierto}
        className="w-full flex items-center justify-between gap-3 text-xs"
      >
        <span className="text-gray-400 capitalize">{mes.label} · detalle</span>
        <span className={cn('flex items-center gap-2 font-mono', colorNeto)}>
          {neto >= 0 ? '+' : '−'}{fmt(Math.abs(neto))}
          <ChevronDown size={16} className={cn('text-gray-400 transition-transform', abierto && 'rotate-180')} />
        </span>
      </button>

      {abierto && (
        <div className="mt-2.5 space-y-0.5 text-xs">
          <Linea label="Ingresos" valor={fmt(mes.ingresos)} className="text-ok" />
          <Linea label="Gastos" valor={fmt(mes.gastos)} className="text-bad" />
          <Linea label="· Efectivo/débito" valor={fmt(mes.cuenta)} className="text-bad" sub />
          {mes.tarjeta > 0 && (
            <>
              <Linea label="· Tarjeta" valor={fmt(mes.tarjeta)} className="text-bad" sub />
              {tarjetas.map((t) => (mes[`t_${t.id}`] > 0) && (
                <div key={t.id} className="flex justify-between gap-3 pl-6 opacity-90" style={{ color: t.colorFlujo }}>
                  <span>· {t.nombre}</span>
                  <span className="font-mono whitespace-nowrap">{fmt(mes[`t_${t.id}`])}</span>
                </div>
              ))}
              {mes.otras > 0 && (
                <div className="flex justify-between gap-3 pl-6 opacity-90" style={{ color: COLOR_OTRAS }}>
                  <span>· Otras tarjetas</span>
                  <span className="font-mono whitespace-nowrap">{fmt(mes.otras)}</span>
                </div>
              )}
            </>
          )}
          <div className="border-t border-white/[0.08] my-2" />
          <Linea label="Balance del mes" valor={`${neto >= 0 ? '+' : '−'}${fmt(Math.abs(neto))}`} className={colorNeto} />
          <Linea label="Ahorro" valor={`${ahorro.toFixed(1)}% de ingresos`} className={colorNeto} />
          {comparacion && <p className="text-[11px] text-gray-400 pt-1">{comparacion}</p>}
        </div>
      )}
    </div>
  )
}

export default function GraficaFlujo({ transacciones }) {
  const { data: todasTarjetas = [] } = useTarjetas()
  const [seleccionado, setSeleccionado] = useState(5) // último mes
  const [abierto, setAbierto] = useState(false)

  const idsConocidos = new Set(todasTarjetas.map((t) => t.id))
  const data = buildData(transacciones, idsConocidos)

  // Solo las tarjetas que realmente tuvieron gasto en estos 6 meses.
  const tarjetas = todasTarjetas
    .filter((t) => data.some((m) => m[`t_${t.id}`] > 0))
    .map((t, i) => ({ ...t, colorFlujo: t.color || COLORES_TARJETA[i % COLORES_TARJETA.length] }))

  // Orden de apilado, de abajo hacia arriba.
  const segmentos = [
    { key: 'cuenta', nombre: 'Efectivo/débito', color: '#EF4444' },
    ...tarjetas.map((t) => ({ key: `t_${t.id}`, nombre: t.nombre, color: t.colorFlujo })),
    { key: 'otras', nombre: 'Otras tarjetas', color: COLOR_OTRAS },
  ]

  const mes = data[seleccionado]

  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full lg:flex lg:flex-col">
      <p className="section-label mb-2">Flujo últimos 6 meses</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 mb-4 lg:mb-6">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-ok inline-block" />Ingresos</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-bad inline-block" />Efectivo/débito</span>
        {tarjetas.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: t.colorFlujo }} />{t.nombre}
          </span>
        ))}
      </div>

      <div className="lg:flex-1 lg:min-h-[160px]">
        <ResponsiveContainer width="100%" height={160} className="lg:!h-full">
          <BarChart
            data={data}
            barCategoryGap="25%"
            barGap={3}
            onClick={(e) => { if (e?.activeTooltipIndex != null) setSeleccionado(e.activeTooltipIndex) }}
          >
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
            {segmentos.map((sg) => (
              <Bar key={sg.key} dataKey={sg.key} name={sg.nombre} stackId="gastos" fill={sg.color} maxBarSize={24}>
                {/* Solo el segmento más alto de cada mes lleva esquinas redondeadas */}
                {data.map((m) => (
                  <Cell key={m.key} radius={segmentoSuperior(m, segmentos) === sg.key ? [4, 4, 0, 0] : 0} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DetalleMes
        mes={mes}
        anterior={data[seleccionado - 1]}
        tarjetas={tarjetas}
        abierto={abierto}
        onToggle={() => setAbierto((v) => !v)}
      />
    </div>
  )
}

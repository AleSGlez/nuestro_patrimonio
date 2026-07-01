// src/modules/dashboard/components/FlujoCard.jsx
import { fmt, cn } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function FlujoCard({ transacciones }) {
  const ingresos = transacciones
    .filter((t) => t.tipo === 'ingreso')
    .reduce((s, t) => s + Number(t.monto), 0)

  const gastos = transacciones
    .filter((t) => t.tipo === 'gasto')
    .reduce((s, t) => s + Number(t.monto), 0)

  const balance = ingresos - gastos
  const positivo = balance >= 0
  const mesLabel = format(new Date(), 'MMMM', { locale: es })

  return (
    <div className="card p-4 flex flex-col gap-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider capitalize">Flujo · {mesLabel}</p>
      <p className={cn('text-2xl font-bold font-mono leading-tight', positivo ? 'text-ok' : 'text-bad')}>
        {positivo ? '+' : ''}{fmt(balance)}
      </p>
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-500">Ingresos</p>
          <p className="text-xs font-mono text-ok">+{fmt(ingresos)}</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-500">Gastos</p>
          <p className="text-xs font-mono text-bad">-{fmt(gastos)}</p>
        </div>
      </div>
    </div>
  )
}

// src/modules/dashboard/components/PatrimonioCard.jsx
import { fmt, cn } from '@lib/utils'

export default function PatrimonioCard({ cuentas, tarjetas }) {
  const totalCuentas = cuentas
    .filter((c) => c.persona !== 'negocio')
    .reduce((s, c) => s + Number(c.saldo), 0)

  const totalDeuda = tarjetas
    .reduce((s, t) => s + Number(t.saldo_total), 0)

  const patrimonio = totalCuentas - totalDeuda

  return (
    <div className="card p-4 flex flex-col gap-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Patrimonio</p>
      <p className={cn('text-2xl font-bold font-mono leading-tight', patrimonio >= 0 ? 'text-white' : 'text-bad')}>
        {fmt(patrimonio)}
      </p>
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-500">Cuentas</p>
          <p className="text-xs font-mono text-ok">{fmt(totalCuentas)}</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-500">Deuda</p>
          <p className="text-xs font-mono text-bad">-{fmt(totalDeuda)}</p>
        </div>
      </div>
    </div>
  )
}

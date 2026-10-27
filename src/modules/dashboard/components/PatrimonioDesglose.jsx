// src/modules/dashboard/components/PatrimonioDesglose.jsx
import { fmt } from '@lib/utils'

// De qué está hecho el patrimonio: cuentas + inversiones − deuda en tarjetas.
// Cuadra con la regla de negocio del patrimonio personal, así que
// cuentas + inversiones − deuda = el número grande de la tarjeta Patrimonio.
export default function PatrimonioDesglose({ cuentas, inversiones, deuda }) {
  const items = [
    { label: 'Cuentas', valor: fmt(cuentas), clase: 'text-white' },
    { label: 'Inversiones', valor: fmt(inversiones), clase: 'text-white' },
    { label: 'Deuda en tarjetas', valor: `-${fmt(deuda)}`, clase: deuda > 0 ? 'text-bad' : 'text-white' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-4">
      {items.map((i) => (
        <div key={i.label} className="bg-surface-800 border border-white/[0.06] rounded-xl p-2.5 lg:p-4 min-w-0">
          <p className="text-[10px] text-gray-400 truncate">{i.label}</p>
          <p className={`text-[13px] lg:text-base font-mono font-medium mt-1 truncate ${i.clase}`}>{i.valor}</p>
        </div>
      ))}
    </div>
  )
}

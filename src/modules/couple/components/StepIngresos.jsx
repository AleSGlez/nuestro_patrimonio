// src/modules/couple/components/StepIngresos.jsx
import { AmountInput } from '@ui/Field'
import { fmt } from '@lib/utils'

export default function StepIngresos({ data, onChange, nombres }) {
  const total = (Number(data.ingreso1) || 0) + (Number(data.ingreso2) || 0)

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">💰</div>
        <h2 className="text-2xl font-bold text-white mb-2">Ingresos mensuales</h2>
        <p className="text-sm text-gray-400">Ayuda a calcular el flujo y score financiero</p>
      </div>

      <AmountInput
        label={`Ingreso de ${nombres.p1 || 'ti'}`}
        value={data.ingreso1}
        onChange={(v) => onChange({ ingreso1: v })}
        placeholder="0.00"
      />
      <AmountInput
        label={`Ingreso de ${nombres.p2 || 'tu pareja'}`}
        value={data.ingreso2}
        onChange={(v) => onChange({ ingreso2: v })}
        placeholder="0.00"
      />

      {total > 0 && (
        <div className="p-4 bg-ok/10 border border-ok/20 rounded-2xl text-center animate-scale-in">
          <p className="text-xs text-gray-400">Ingreso combinado mensual</p>
          <p className="text-2xl font-bold text-ok font-mono mt-1">{fmt(total)}</p>
        </div>
      )}
    </div>
  )
}

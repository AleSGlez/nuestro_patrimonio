// src/modules/accounts/components/CuentaCardCompact.jsx
import { Store } from 'lucide-react'
import { useApartados } from '../hooks/useApartados'
import { fmt } from '@lib/utils'

const TIPO_EMOJI = { debito: '💳', ahorro: '🏦', efectivo: '💵', inversion: '📈', transporte: '🚇' }

export default function CuentaCardCompact({ cuenta, onTap }) {
  const { data: apartados = [] } = useApartados(cuenta.id)
  const totalApartado = apartados.reduce((s, a) => s + Number(a.monto), 0)
  const tieneNegocio = apartados.some((a) => a.es_negocio)

  return (
    <button
      onClick={() => onTap(cuenta)}
      className="card p-3.5 text-left relative overflow-hidden active:scale-[0.97] transition-all"
    >
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cuenta.color }} />
      <div className="pl-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-base flex-shrink-0">{TIPO_EMOJI[cuenta.tipo]}</span>
          <p className="text-xs font-medium text-white truncate flex-1">{cuenta.nombre}</p>
          {tieneNegocio && <Store size={10} className="text-[var(--accent)] flex-shrink-0" />}
        </div>
        <p className="text-base font-bold font-mono text-white leading-tight truncate">{fmt(cuenta.saldo)}</p>
        {totalApartado > 0 && (
          <p className="text-[10px] text-gray-500 mt-0.5">+{fmt(totalApartado)} apartado</p>
        )}
      </div>
    </button>
  )
}

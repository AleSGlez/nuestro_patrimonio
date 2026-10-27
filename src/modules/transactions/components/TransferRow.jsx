// src/modules/transactions/components/TransferRow.jsx
// Fila de transferencia dentro de la lista de Movimientos — al tocarla abre el detalle
import { ArrowLeftRight } from 'lucide-react'
import { fmt } from '@lib/utils'

export const TIPO_TRANSFERENCIA = {
  entre_cuentas:         { emoji: '🔄', label: 'Entre cuentas' },
  pago_tarjeta:          { emoji: '💳', label: 'Pago de tarjeta' },
  disposicion_efectivo:  { emoji: '💰', label: 'Disposición de efectivo' },
  personal_a_negocio:    { emoji: '🏪', label: 'Personal → Negocio' },
  negocio_a_personal:    { emoji: '👤', label: 'Negocio → Personal' },
}

// Nombres de origen y destino de una transferencia
export function extremosTransferencia(t, cuentasMap, tarjetasMap) {
  const origen = t.tipo === 'disposicion_efectivo'
    ? (tarjetasMap[t.destino_tarjeta_id]?.nombre || 'Tarjeta')
    : (cuentasMap[t.origen_cuenta_id]?.nombre || 'Cuenta eliminada')
  const destino = t.destino_cuenta_id
    ? (cuentasMap[t.destino_cuenta_id]?.nombre || 'Cuenta eliminada')
    : t.destino_tarjeta_id
      ? (tarjetasMap[t.destino_tarjeta_id]?.nombre || 'Tarjeta eliminada')
      : '—'
  return { origen, destino }
}

export default function TransferRow({ transferencia, cuentasMap, tarjetasMap, onOpen }) {
  const info = TIPO_TRANSFERENCIA[transferencia.tipo] || { emoji: '🔄', label: transferencia.tipo }
  const { origen, destino } = extremosTransferencia(transferencia, cuentasMap, tarjetasMap)

  return (
    <button
      onClick={() => onOpen(transferencia)}
      className="w-full flex items-center gap-3 min-h-[60px] px-3 py-2 text-left border-t border-white/[0.05] first:border-0 active:bg-white/[0.03]"
    >
      <div className="w-[38px] h-[38px] rounded-xl bg-info/15 text-blue-300 flex items-center justify-center flex-shrink-0">
        <ArrowLeftRight size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{transferencia.descripcion || info.label}</p>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{origen} → {destino}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold font-mono text-blue-300">{fmt(transferencia.monto)}</p>
        {Number(transferencia.comision) > 0 && (
          <p className="text-[10px] text-warn">+{fmt(transferencia.comision)} com.</p>
        )}
      </div>
    </button>
  )
}

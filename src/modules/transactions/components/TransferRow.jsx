// src/modules/transactions/components/TransferRow.jsx
import { ArrowRight, Trash2 } from 'lucide-react'
import { fmt, fmtDate } from '@lib/utils'

const TIPO_INFO = {
  entre_cuentas:         { emoji: '🔄', label: 'Entre cuentas' },
  pago_tarjeta:          { emoji: '💳', label: 'Pago de tarjeta' },
  disposicion_efectivo:  { emoji: '💰', label: 'Disposición de efectivo' },
  personal_a_negocio:    { emoji: '🏪', label: 'Personal → Negocio' },
  negocio_a_personal:    { emoji: '👤', label: 'Negocio → Personal' },
}

export default function TransferRow({ transferencia, cuentasMap, tarjetasMap, onDelete }) {
  const info = TIPO_INFO[transferencia.tipo] || { emoji: '🔄', label: transferencia.tipo }

  const origenNombre = transferencia.tipo === 'disposicion_efectivo'
    ? (tarjetasMap[transferencia.destino_tarjeta_id]?.nombre || 'Tarjeta')
    : (cuentasMap[transferencia.origen_cuenta_id]?.nombre || 'Cuenta eliminada')

  const destinoNombre = transferencia.destino_cuenta_id
    ? (cuentasMap[transferencia.destino_cuenta_id]?.nombre || 'Cuenta eliminada')
    : transferencia.destino_tarjeta_id
      ? (tarjetasMap[transferencia.destino_tarjeta_id]?.nombre || 'Tarjeta eliminada')
      : '—'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-9 h-9 rounded-xl bg-surface-700 flex items-center justify-center text-base flex-shrink-0">
        {info.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">
          {transferencia.descripcion || info.label}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span className="truncate">{origenNombre}</span>
          <ArrowRight size={10} className="flex-shrink-0" />
          <span className="truncate">{destinoNombre}</span>
        </div>
        <p className="text-[11px] text-gray-600 mt-0.5">{fmtDate(transferencia.fecha)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold font-mono text-[var(--accent)]">{fmt(transferencia.monto)}</p>
        {Number(transferencia.comision) > 0 && (
          <p className="text-[10px] text-warn">+{fmt(transferencia.comision)} com.</p>
        )}
      </div>
      <button
        onClick={() => onDelete(transferencia)}
        aria-label="Eliminar transferencia"
        className="icon-btn text-gray-500 hover:text-bad flex-shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

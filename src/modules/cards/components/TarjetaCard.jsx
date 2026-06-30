// src/modules/cards/components/TarjetaCard.jsx
import { CreditCard, Pencil, Trash2 } from 'lucide-react'
import { fmt, cn } from '@lib/utils'
import { diasHasta } from '../hooks/useTarjetas'

export default function TarjetaCard({ tarjeta, onEdit, onDelete, onPagar, nombres }) {
  const uso = tarjeta.limite > 0 ? Math.min(100, (tarjeta.saldo_total / tarjeta.limite) * 100) : 0
  const disponible = Math.max(0, tarjeta.limite - tarjeta.saldo_total)
  const personaLabel = { p1: nombres.p1, p2: nombres.p2, ambos: 'Compartida' }[tarjeta.persona]

  const diasCorte  = diasHasta(tarjeta.fecha_corte_proxima)
  const diasLimite = diasHasta(tarjeta.fecha_limite_proxima)

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: tarjeta.color }} />
      <div className="pl-2">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={18} style={{ color: tarjeta.color }} />
            <div>
              <p className="text-sm font-semibold text-white">{tarjeta.nombre}</p>
              <p className="text-xs text-gray-500">{tarjeta.banco} · {personaLabel}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(tarjeta)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(tarjeta)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-bad">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">Deuda total</p>
            <p className="text-lg font-bold font-mono text-bad">{fmt(tarjeta.saldo_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Disponible</p>
            <p className="text-lg font-bold font-mono text-ok">{fmt(disponible)}</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Uso del crédito</span>
            <span>{Math.round(uso)}% de {fmt(tarjeta.limite)}</span>
          </div>
          <div className="h-1.5 bg-surface-500 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all',
                uso > 70 ? 'bg-bad' : uso > 40 ? 'bg-warn' : 'bg-ok')}
              style={{ width: `${uso}%` }}
            />
          </div>
        </div>

        {/* Pago sin intereses */}
        {tarjeta.pago_sin_intereses > 0 && (
          <div className="flex justify-between items-center mb-2 px-3 py-2 rounded-xl bg-[var(--accent-muted)]">
            <span className="text-xs text-gray-300">Pago sin intereses</span>
            <span className="text-sm font-semibold font-mono text-[var(--accent)]">{fmt(tarjeta.pago_sin_intereses)}</span>
          </div>
        )}

        {/* Fechas */}
        {(tarjeta.fecha_corte_proxima || tarjeta.fecha_limite_proxima) && (
          <div className="flex gap-4 mb-3 text-xs text-gray-400">
            {tarjeta.fecha_corte_proxima && (
              <span>✂️ Corte en {diasCorte} {diasCorte === 1 ? 'día' : 'días'}</span>
            )}
            {tarjeta.fecha_limite_proxima && (
              <span className={diasLimite <= 3 ? 'text-warn font-medium' : ''}>
                📅 Límite en {diasLimite} {diasLimite === 1 ? 'día' : 'días'}
              </span>
            )}
          </div>
        )}

        {tarjeta.saldo_total > 0 && (
          <button
            onClick={() => onPagar(tarjeta)}
            className="w-full py-2 rounded-xl text-xs font-semibold border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
          >
            Registrar pago
          </button>
        )}
      </div>
    </div>
  )
}

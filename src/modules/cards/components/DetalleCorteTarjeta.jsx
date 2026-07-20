// src/modules/cards/components/DetalleCorteTarjeta.jsx
import Modal from '@ui/Modal'
import { EmptyState } from '@ui/Field'
import { useDesgloseCorteTarjeta, diasHasta } from '../hooks/useTarjetas'
import { fmt, fmtDate } from '@lib/utils'

export default function DetalleCorteTarjeta({ open, onClose, tarjeta, nombres }) {
  const { data, isPending } = useDesgloseCorteTarjeta(tarjeta, open)

  if (!tarjeta) return null

  if (!tarjeta.dia_corte) {
    return (
      <Modal open={open} onClose={onClose} title={`Desglose del corte — ${tarjeta.nombre}`}>
        <EmptyState
          emoji="✂️" title="Falta configurar el día de corte"
          description="Edita la tarjeta y define el día de corte para ver el desglose del próximo pago."
        />
      </Modal>
    )
  }

  const dias = diasHasta(tarjeta.fecha_corte_proxima)

  const lineas = data ? [
    { key: 'p1',      label: nombres.p1, emoji: '👤', valor: data.p1 },
    { key: 'p2',      label: nombres.p2, emoji: '👤', valor: data.p2 },
    { key: 'negocio', label: 'Negocio',  emoji: '🏪', valor: data.negocio },
    ...(data.disposicionEfectivo > 0
      ? [{ key: 'disposicion', label: 'Disposición de efectivo', emoji: '💵', valor: data.disposicionEfectivo }]
      : []),
  ] : []

  return (
    <Modal open={open} onClose={onClose} title={`Desglose del corte — ${tarjeta.nombre}`}>
      {isPending ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
        </div>
      ) : (
        <>
          <div className="card p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">
              {tarjeta.fecha_corte_proxima && `Corte el ${fmtDate(tarjeta.fecha_corte_proxima, 'medium')}`}
              {dias != null && ` · en ${dias} ${dias === 1 ? 'día' : 'días'}`}
            </p>
            {data && (
              <p className="text-[11px] text-gray-500 mb-2">
                Período: {fmtDate(data.inicio)} – {fmtDate(data.fin)}
              </p>
            )}
            <p className="text-3xl font-bold font-mono text-bad">{fmt(data?.total || 0)}</p>
            <p className="text-xs text-gray-400">Total del próximo corte</p>
          </div>

          {data?.total > 0 ? (
            <div className="card px-3">
              {lineas.map((l) => (
                <div key={l.key} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-gray-300 flex items-center gap-2">
                    <span>{l.emoji}</span>{l.label}
                  </span>
                  <span className="text-sm font-mono font-semibold text-white">{fmt(l.valor)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              emoji="✅" title="Sin movimientos en este período"
              description="Aún no hay compras que se vayan a cobrar en el próximo corte."
            />
          )}
        </>
      )}
    </Modal>
  )
}

// src/modules/dashboard/components/TarjetasResumen.jsx
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { calcularFechasCorte, diasHasta } from '@modules/cards/hooks/useTarjetas'
import { fmt } from '@lib/utils'

const COLOR_RESPALDO = '#FCA5A5'

// Resumen de tarjetas de crédito para el Resumen de Finanzas: saldo contra
// límite, próximo pago límite y deuda total. Solo lectura — el detalle y los
// pagos viven en la pestaña Tarjetas.
export default function TarjetasResumen({ tarjetas }) {
  if (!tarjetas || tarjetas.length === 0) return null

  const deudaTotal = tarjetas.reduce((s, t) => s + Number(t.saldo_total || 0), 0)

  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full">
      <p className="text-sm font-semibold text-white mb-1 lg:mb-3 lg:text-[10px] lg:text-gray-500 lg:uppercase lg:tracking-[0.12em]">
        Tarjetas de crédito
      </p>

      <div>
        {tarjetas.map((t) => {
          const { limite: fechaLimite } = calcularFechasCorte(t.dia_corte, t.dia_limite_pago)
          const dias = diasHasta(fechaLimite)
          const saldo = Number(t.saldo_total || 0)
          const limiteCredito = Number(t.limite || 0)
          const pct = limiteCredito > 0 ? Math.min(100, (saldo / limiteCredito) * 100) : 0
          const color = t.color || COLOR_RESPALDO
          const cercano = dias !== null && dias <= 10

          return (
            <div key={t.id} className="flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0">
              <div
                className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-black/80"
                style={{ background: color }}
              >
                {(t.nombre || '?').slice(0, 2)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{t.nombre}</p>
                {fechaLimite && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Pago límite {format(parseISO(fechaLimite), 'd MMM', { locale: es })}
                    {cercano && (
                      <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warn/15 text-warn">
                        {dias <= 0 ? 'hoy' : `en ${dias} ${dias === 1 ? 'día' : 'días'}`}
                      </span>
                    )}
                  </p>
                )}
                <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-mono text-white">{fmt(saldo)}</p>
                {limiteCredito > 0 && <p className="text-[10px] text-gray-400 mt-0.5">de {fmt(limiteCredito)}</p>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between text-[11px] text-gray-400 pt-1">
        <span>Deuda total en tarjetas</span>
        <span className="font-mono text-bad">{fmt(deudaTotal)}</span>
      </div>
    </div>
  )
}

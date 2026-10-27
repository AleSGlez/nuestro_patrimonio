// src/modules/presupuestos/components/EtiquetaPresupuesto.jsx
// En el formulario de gasto: de qué presupuesto se descuenta según la categoría
import { Tag, ArrowRight, AlertTriangle } from 'lucide-react'
import { usePresupuestos, presupuestosDeGasto, calcularDisponible } from '../hooks/usePresupuestos'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { fmt, cn, montoParaPersona, CAT_GASTO } from '@lib/utils'

export default function EtiquetaPresupuesto({ categoria, persona, monto, fecha, txId = null }) {
  const { data: presupuestos = [] } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()

  const personales = presupuestos.filter((p) => !p.contexto || p.contexto === 'personal')
  if (!categoria || personales.length === 0) return null

  // Al editar, el gasto original no cuenta en el "disponible ahora"
  const txs = txId ? transacciones.filter((t) => t.id !== txId) : transacciones
  const etiquetados = presupuestosDeGasto(personales, categoria, persona)
  // Un gasto anterior al inicio del presupuesto no se descuenta de él
  const destinos = etiquetados.filter((p) => !fecha || fecha >= p.fecha_inicio)

  if (etiquetados.length === 0) {
    const c = CAT_GASTO.find((x) => x.value === categoria)
    return (
      <div className="bg-warn/[0.09] border border-warn/30 rounded-2xl p-3 mb-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <AlertTriangle size={15} className="text-warn flex-shrink-0" />
          <span className="text-xs font-semibold text-warn">Sin presupuesto</span>
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          {c ? `${c.emoji} ${c.label}` : categoria} no está etiquetada en ningún presupuesto, así que este gasto no se descuenta de ninguno. Puedes etiquetarla en Finanzas › Presupuestos.
        </p>
      </div>
    )
  }

  return destinos.map((p) => {
    const { disponible, presupuestoAcumulado, gastado } = calcularDisponible(p, txs)
    // Gasto 'ambos' contra un presupuesto individual cuenta al 50%
    const efecto = montoParaPersona({ monto: Number(monto) || 0, persona }, p.persona === 'ambos' ? null : p.persona)
    const despues = disponible - efecto
    const pct = presupuestoAcumulado > 0 ? Math.round(((gastado + efecto) / presupuestoAcumulado) * 100) : 0
    const barColor = pct >= 100 ? 'bg-bad' : pct >= 80 ? 'bg-warn' : 'bg-ok'

    return (
      <div key={p.id} className="bg-[var(--accent-muted)] border border-[var(--accent)]/40 rounded-2xl p-3 mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Tag size={13} className="text-[var(--accent-light)] flex-shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-light)]">Se descuenta de</span>
          <span className="text-xs font-semibold text-white bg-white/[0.07] border border-white/[0.12] px-2 py-0.5 rounded-full whitespace-nowrap truncate">
            {p.emoji} {p.nombre}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">Disponible ahora</p>
            <p className={cn('font-mono text-[15px] font-bold', disponible < 0 ? 'text-bad' : 'text-ok')}>
              {disponible < 0 ? '-' : ''}{fmt(Math.abs(disponible))}
            </p>
          </div>
          <ArrowRight size={18} className="text-gray-400 flex-shrink-0" />
          <div className="flex-1 text-right">
            <p className="text-[10px] text-gray-400">Después de este gasto</p>
            <p className={cn('font-mono text-[17px] font-bold', despues < 0 ? 'text-bad' : 'text-ok')}>
              {despues < 0 ? '-' : ''}{fmt(Math.abs(despues))}
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-surface-500 rounded-full overflow-hidden mt-2.5 mb-1.5">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className={cn('text-[10px]', despues < 0 ? 'text-bad' : 'text-gray-400')}>
          {despues < 0
            ? `Quedaría excedido en ${fmt(Math.abs(despues))} · ${pct}% usado`
            : `${pct}% usado del acumulado`}
        </p>
      </div>
    )
  })
}

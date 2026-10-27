// src/modules/presupuestos/components/DetallePresupuesto.jsx
// Detalle de un presupuesto: qué gastos contaron, repartidos por etiqueta
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { calcularDisponible } from '../hooks/usePresupuestos'
import { EmptyState } from '@ui/Field'
import { fmt, fmtDate, cn, montoParaPersona, getCatEmoji, CAT_GASTO } from '@lib/utils'

const TIPO_LABEL = { diario: 'Diario', semanal: 'Semanal', mensual: 'Mensual' }
const POR_LABEL  = { diario: 'al día', semanal: 'a la semana', mensual: 'al mes' }

const catLabel = (value) => {
  const c = CAT_GASTO.find((x) => x.value === value)
  return c ? `${c.emoji} ${c.label}` : `📦 ${value || 'Sin categoría'}`
}

export default function DetallePresupuesto({ presupuesto, transacciones, nombres, onBack }) {
  const [filtro, setFiltro] = useState('todas')
  const { disponible, presupuestoAcumulado, gastado, periodos, pctUsado, movimientos } =
    calcularDisponible(presupuesto, transacciones)
  const excedido = disponible < 0
  const personaCalculo = presupuesto.persona === 'ambos' ? null : presupuesto.persona
  const personaLabel = presupuesto.persona === 'ambos' ? 'Pareja'
    : presupuesto.persona === 'p1' ? nombres.p1 : nombres.p2

  // Reparto por etiqueta, de mayor a menor
  const totales = {}
  movimientos.forEach((t) => {
    totales[t.categoria] = (totales[t.categoria] || 0) + montoParaPersona(t, personaCalculo)
  })
  const reparto = Object.entries(totales)
    .map(([cat, total]) => ({ cat, total, pct: gastado > 0 ? Math.round((total / gastado) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)

  const visibles = filtro === 'todas' ? movimientos : movimientos.filter((t) => t.categoria === filtro)
  const sumaVisibles = visibles.reduce((s, t) => s + montoParaPersona(t, personaCalculo), 0)
  const barColor = pctUsado >= 100 ? 'bg-bad' : pctUsado >= 80 ? 'bg-warn' : 'bg-ok'

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        <div className="flex items-center gap-1 mb-3">
          <button onClick={onBack} aria-label="Volver a presupuestos" className="icon-btn -ml-2 text-gray-200">
            <ChevronLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-[var(--accent-muted)] flex-shrink-0">
            {presupuesto.emoji}
          </div>
          <div className="min-w-0 ml-1">
            <p className="text-[15px] font-bold text-white truncate">{presupuesto.nombre}</p>
            <p className="text-[11px] text-gray-400">
              {TIPO_LABEL[presupuesto.tipo]} · {personaLabel} · {fmt(presupuesto.monto_base)} {POR_LABEL[presupuesto.tipo]}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between mb-2.5">
          <div>
            <p className="section-label mb-0.5">{excedido ? 'Excedido' : 'Disponible acumulado'}</p>
            <p className={cn('text-[27px] leading-tight font-bold font-mono', excedido ? 'text-bad' : 'text-ok')}>
              {excedido ? '-' : '+'}{fmt(Math.abs(disponible))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Gastado</p>
            <p className="text-sm font-mono text-white font-medium">{fmt(gastado)}</p>
            <p className="text-[10px] text-gray-400">de {fmt(presupuestoAcumulado)}</p>
          </div>
        </div>

        <div className="h-2 bg-surface-500 rounded-full overflow-hidden mb-1.5">
          <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(pctUsado, 100)}%` }} />
        </div>
        <div className="flex justify-between">
          <p className="text-[11px] font-semibold text-gray-400">
            {pctUsado}% usado · {periodos} {presupuesto.tipo === 'diario' ? 'días' : presupuesto.tipo === 'semanal' ? 'semanas' : 'meses'} activo
          </p>
          <p className="text-[10px] text-gray-400">Desde el {fmtDate(presupuesto.fecha_inicio)}</p>
        </div>
      </div>

      <div className="page px-4 pt-3">
        {movimientos.length === 0 ? (
          <EmptyState
            emoji="🏷️" title="Sin gastos todavía"
            description="Aquí aparecerán los gastos cuya categoría está etiquetada en este presupuesto"
          />
        ) : (
          <>
            {/* Filtro por etiqueta */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
              {[{ cat: 'todas' }, ...reparto].map(({ cat }) => (
                <button
                  key={cat} onClick={() => setFiltro(cat)} aria-pressed={filtro === cat}
                  className={cn(
                    'flex-shrink-0 min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap border',
                    filtro === cat ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent-light)]'
                      : 'bg-surface-700 border-white/[0.06] text-gray-300'
                  )}
                >
                  {cat === 'todas' ? 'Todas' : catLabel(cat)}
                </button>
              ))}
            </div>

            {/* Reparto por etiqueta */}
            <p className="section-label mb-2">Reparto por etiqueta</p>
            <div className="card p-3 mb-5 space-y-3">
              {reparto.map((r) => (
                <div key={r.cat} className={cn(filtro !== 'todas' && filtro !== r.cat && 'opacity-35')}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-medium text-gray-200">{catLabel(r.cat)}</span>
                    <span>
                      <span className="text-xs font-mono font-semibold text-white">{fmt(r.total)}</span>
                      <span className="text-[10px] text-gray-400"> · {r.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-500 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', filtro === r.cat ? 'bg-[var(--accent)]' : 'bg-white/20')}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Movimientos */}
            <div className="flex justify-between items-baseline mb-2">
              <p className="section-label">
                {filtro === 'todas' ? 'Movimientos' : `Movimientos de ${catLabel(filtro)}`}
              </p>
              <p className="text-[11px] font-mono font-semibold text-gray-400">
                {visibles.length} · {fmt(sumaVisibles)}
              </p>
            </div>
            <div className="space-y-2">
              {visibles.map((t) => (
                <div key={t.id} className="card flex items-center gap-3 px-3 py-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-surface-700 flex-shrink-0">
                    {getCatEmoji(t.categoria)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{t.descripcion || catLabel(t.categoria)}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-medium text-[var(--accent-light)] bg-[var(--accent-muted)] border border-[var(--accent)]/40 px-1.5 py-px rounded-full whitespace-nowrap">
                        {catLabel(t.categoria)}
                      </span>
                      <span className="text-[10px] text-gray-400">{fmtDate(t.fecha)}</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-bad flex-shrink-0">
                    -{fmt(montoParaPersona(t, personaCalculo))}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
              Solo aparecen los gastos cuya categoría está etiquetada en este presupuesto.
            </p>
          </>
        )}
      </div>
    </>
  )
}

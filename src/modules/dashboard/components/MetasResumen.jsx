// src/modules/dashboard/components/MetasResumen.jsx
import { useMetas, calcularMeta } from '@modules/metas/hooks/useMetas'
import { fmt } from '@lib/utils'

const COLOR_RESPALDO = '#10B981'
const MAX_METAS = 4

// Avance de las metas de ahorro dentro del Resumen de Finanzas.
// persona: 'p1' | 'p2' | null (pareja = todas). En la vista de una persona se
// muestran sus metas y las compartidas ('ambos').
export default function MetasResumen({ persona = null }) {
  const { data: metas = [] } = useMetas()

  const visibles = metas
    .filter((m) => !persona || m.persona === persona || m.persona === 'ambos')
    .slice(0, MAX_METAS)

  if (visibles.length === 0) return null

  return (
    <div className="card p-4 lg:p-6 mb-3 lg:h-full">
      <p className="text-sm font-semibold text-white mb-1 lg:mb-3 lg:text-[10px] lg:text-gray-500 lg:uppercase lg:tracking-[0.12em]">
        Metas de ahorro
      </p>

      <div>
        {visibles.map((m) => {
          const { objetivo, actual, pct } = calcularMeta(m)
          const color = m.color || COLOR_RESPALDO
          return (
            <div key={m.id} className="py-3 border-b border-white/[0.06] last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-white truncate min-w-0">
                  <span className="mr-1.5">{m.emoji}</span>{m.nombre}
                </p>
                <p className="text-xs font-mono text-gray-300 flex-shrink-0">{pct}%</p>
              </div>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">{fmt(actual)} de {fmt(objetivo)}</p>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

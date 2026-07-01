// src/modules/dashboard/components/UltimosMovimientos.jsx
import { ChevronRight } from 'lucide-react'
import { fmt, fmtDate, cn, CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO } from '@lib/utils'
import { useAppStore } from '@store/appStore'

const ALL_CATS = [...CAT_GASTO, ...CAT_INGRESO, ...CAT_NEGOCIO_GASTO]
function getCat(value) {
  return ALL_CATS.find((c) => c.value === value) || { emoji: '📦', label: value }
}

export default function UltimosMovimientos({ transacciones, onVerTodos }) {
  const { setTab } = useAppStore()
  const ultimos = transacciones.slice(0, 5)

  if (ultimos.length === 0) return null

  return (
    <div className="card px-3 mb-3">
      <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-white">Últimos movimientos</p>
        <button
          onClick={() => setTab('transacciones')}
          className="flex items-center gap-0.5 text-xs text-[var(--accent)]"
        >
          Ver todos <ChevronRight size={13} />
        </button>
      </div>
      {ultimos.map((tx) => {
        const cat = getCat(tx.categoria)
        const isIngreso = tx.tipo === 'ingreso'
        return (
          <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
            <span className="text-base flex-shrink-0">{cat.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{tx.descripcion || cat.label}</p>
              <p className="text-[11px] text-gray-500">{fmtDate(tx.fecha)}</p>
            </div>
            <p className={cn('text-sm font-semibold font-mono flex-shrink-0', isIngreso ? 'text-ok' : 'text-white')}>
              {isIngreso ? '+' : '-'}{fmt(tx.monto)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

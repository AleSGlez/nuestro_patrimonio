// src/modules/presupuestos/components/ResumenRapido.jsx
// En el menú del botón +: cuánto queda en cada presupuesto y gastos para repetir
import { usePresupuestos, calcularDisponible } from '../hooks/usePresupuestos'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { fmt, cn } from '@lib/utils'

const PERIODO = { diario: 'hoy', semanal: 'esta semana', mensual: 'este mes' }
const TEXTO = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }
const BARRA = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' }

// Últimos gastos personales distintos (misma categoría/sub/descripción = uno)
function gastosRecientes(transacciones, max = 3) {
  const vistos = new Set()
  const lista = []
  const ordenadas = [...transacciones].sort((a, b) =>
    (b.fecha || '').localeCompare(a.fecha || '') || (b.created_at || '').localeCompare(a.created_at || ''))
  for (const t of ordenadas) {
    if (t.tipo !== 'gasto' || t.contexto !== 'personal') continue
    const clave = `${t.categoria}|${t.subcategoria || ''}|${(t.descripcion || '').toLowerCase()}`
    if (vistos.has(clave)) continue
    vistos.add(clave)
    lista.push(t)
    if (lista.length === max) break
  }
  return lista
}

export default function ResumenRapido({ onVerPresupuestos, onRepetir, className }) {
  const { data: presupuestos = [] } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()

  const personales = presupuestos
    .filter((p) => !p.contexto || p.contexto === 'personal')
    .slice(0, 4)
    .map((p) => ({ p, ...calcularDisponible(p, transacciones) }))
  const recientes = gastosRecientes(transacciones)

  if (personales.length === 0 && recientes.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {personales.length > 0 && (
        <div className="bg-surface-800 border border-white/10 rounded-2xl px-3.5 py-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="section-label">Te queda para gastar</span>
            <button onClick={onVerPresupuestos} className="text-[11px] font-semibold text-[var(--accent-light)] py-1">
              Ver presupuestos
            </button>
          </div>
          {personales.map(({ p, disponible, pctUsado }) => {
            const color = disponible < 0 || pctUsado >= 100 ? 'bad' : pctUsado >= 80 ? 'warn' : 'ok'
            return (
              <div key={p.id} className="py-1.5 border-t border-white/[0.06] first:border-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-white truncate">
                    {p.emoji} {p.nombre} <span className="font-normal text-[11px] text-gray-400">· {PERIODO[p.tipo]}</span>
                  </span>
                  <span className={cn('font-mono text-sm font-bold flex-shrink-0', TEXTO[color])}>
                    {disponible < 0 ? '-' : ''}{fmt(Math.abs(disponible))}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', BARRA[color])} style={{ width: `${Math.min(pctUsado, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {recientes.length > 0 && (
        <div>
          <p className="section-label px-1 mb-1.5">Repetir un gasto reciente</p>
          <div className="flex flex-wrap gap-1.5">
            {recientes.map((t) => (
              <button
                key={t.id} onClick={() => onRepetir(t)}
                className="min-h-[36px] px-3 rounded-full bg-surface-700 border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 active:scale-95"
              >
                <span className="truncate max-w-[140px]">{t.descripcion || t.subcategoria || t.categoria}</span>
                <span className="font-mono text-gray-400">{fmt(t.monto)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

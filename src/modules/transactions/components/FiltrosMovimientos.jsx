// src/modules/transactions/components/FiltrosMovimientos.jsx
// Filtros de Movimientos en chips: fecha, método de pago, quién, contexto, cuenta y categoría.
// Se aplican en vivo; el botón de abajo solo cierra.
import { Check } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import Modal from '@ui/Modal'
import { TODAS_CATEGORIAS, TIPOS_PAGO } from '../movimientos'
import { cn, currentMonth, today, TIPO_EMOJI_CUENTA } from '@lib/utils'

export const FILTROS_VACIOS = { pagos: [], personas: [], contextos: [], cuentas: [], categorias: [] }

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={activo}
      className={cn(
        'inline-flex items-center gap-1 min-h-[38px] px-3 rounded-full text-xs font-medium border transition-all',
        activo ? 'bg-[var(--accent-muted)] border-[var(--accent)]/50 text-[var(--accent-light)]'
          : 'bg-surface-700 border-white/10 text-gray-200'
      )}
    >
      {children}
      {activo && <Check size={13} strokeWidth={3} />}
    </button>
  )
}

function Grupo({ titulo, children }) {
  return (
    <div className="mb-5">
      <p className="label mb-2">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

// Contenido de los filtros: va dentro del Modal en celular y como panel
// fijo a la izquierda en computadora
export function PanelFiltros({ periodo, setPeriodo, filtros, setFiltros, cuentas, tarjetas, nombres }) {
  const mesActual  = currentMonth()
  const mesPasado  = format(subMonths(new Date(), 1), 'yyyy-MM')
  const periodoId  = periodo.tipo === 'mes'
    ? (periodo.mes === mesActual ? 'mes' : periodo.mes === mesPasado ? 'mesPasado' : null)
    : periodo.tipo

  const PERIODOS = [
    ['hoy', 'Hoy', { tipo: 'hoy' }],
    ['7d', 'Últimos 7 días', { tipo: '7d' }],
    ['mes', 'Este mes', { tipo: 'mes', mes: mesActual }],
    ['mesPasado', 'Mes pasado', { tipo: 'mes', mes: mesPasado }],
    ['3m', 'Últimos 3 meses', { tipo: '3m' }],
    ['rango', 'Elegir fechas…', { tipo: 'rango', desde: `${mesActual}-01`, hasta: today() }],
  ]

  const toggle = (grupo, valor) => setFiltros((f) => ({
    ...f,
    [grupo]: f[grupo].includes(valor) ? f[grupo].filter((v) => v !== valor) : [...f[grupo], valor],
  }))

  return (
    <>
      {/* Fecha: un solo periodo a la vez */}
      <div className="mb-5">
        <p className="label mb-2">Fecha</p>
        <div className="flex flex-wrap gap-1.5">
          {PERIODOS.map(([id, label, valor]) => (
            <Chip key={id} activo={periodoId === id} onClick={() => setPeriodo(valor)}>{label}</Chip>
          ))}
        </div>
        {periodo.tipo === 'rango' && (
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <div>
              <label htmlFor="filtro-desde" className="block text-[11px] text-gray-400 mb-1">Desde</label>
              <input id="filtro-desde" type="date" value={periodo.desde || ''} max={periodo.hasta || undefined}
                onChange={(e) => setPeriodo({ ...periodo, desde: e.target.value })} className="input" />
            </div>
            <div>
              <label htmlFor="filtro-hasta" className="block text-[11px] text-gray-400 mb-1">Hasta</label>
              <input id="filtro-hasta" type="date" value={periodo.hasta || ''} min={periodo.desde || undefined}
                onChange={(e) => setPeriodo({ ...periodo, hasta: e.target.value })} className="input" />
            </div>
          </div>
        )}
      </div>

      <Grupo titulo="Método de pago">
        {TIPOS_PAGO.map((p) => (
          <Chip key={p.value} activo={filtros.pagos.includes(p.value)} onClick={() => toggle('pagos', p.value)}>{p.label}</Chip>
        ))}
      </Grupo>

      <Grupo titulo="De quién">
        {[['p1', nombres.p1], ['p2', nombres.p2], ['ambos', 'Ambos']].map(([v, label]) => (
          <Chip key={v} activo={filtros.personas.includes(v)} onClick={() => toggle('personas', v)}>{label}</Chip>
        ))}
      </Grupo>

      <Grupo titulo="Contexto">
        {[['personal', '👤 Personal'], ['negocio', '🏪 Negocio']].map(([v, label]) => (
          <Chip key={v} activo={filtros.contextos.includes(v)} onClick={() => toggle('contextos', v)}>{label}</Chip>
        ))}
      </Grupo>

      {(cuentas.length > 0 || tarjetas.length > 0) && (
        <Grupo titulo="Cuenta o tarjeta">
          {cuentas.map((c) => (
            <Chip key={c.id} activo={filtros.cuentas.includes(`cuenta:${c.id}`)} onClick={() => toggle('cuentas', `cuenta:${c.id}`)}>
              {TIPO_EMOJI_CUENTA[c.tipo] || '🏦'} {c.nombre}
            </Chip>
          ))}
          {tarjetas.map((t) => (
            <Chip key={t.id} activo={filtros.cuentas.includes(`tarjeta:${t.id}`)} onClick={() => toggle('cuentas', `tarjeta:${t.id}`)}>
              💳 {t.nombre}
            </Chip>
          ))}
        </Grupo>
      )}

      <Grupo titulo="Categoría">
        {TODAS_CATEGORIAS.map((c) => (
          <Chip key={c.value} activo={filtros.categorias.includes(c.value)} onClick={() => toggle('categorias', c.value)}>
            {c.emoji} {c.label}
          </Chip>
        ))}
      </Grupo>
    </>
  )
}

export default function FiltrosMovimientos({ open, onClose, onLimpiar, totalResultados, ...panel }) {
  return (
    <Modal open={open} onClose={onClose} title="Filtros">
      <div className="flex justify-end -mt-2 mb-1">
        <button onClick={onLimpiar} className="min-h-[44px] px-1 text-[13px] font-semibold text-[var(--accent-light)]">
          Limpiar todo
        </button>
      </div>

      <PanelFiltros {...panel} />

      <button onClick={onClose} className="btn-primary w-full py-3.5 text-sm font-semibold">
        Ver {totalResultados} {totalResultados === 1 ? 'movimiento' : 'movimientos'}
      </button>
    </Modal>
  )
}

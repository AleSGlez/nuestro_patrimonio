// src/modules/transactions/components/DetalleMovimiento.jsx
// Bottom sheet al tocar un movimiento: todos sus datos + Editar / Repetir / Eliminar.
// `item` = { kind: 'tx' | 'transfer', data }
import { Pencil, Copy, Trash2, ArrowLeftRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Modal from '@ui/Modal'
import { usePresupuestos, presupuestosDeGasto, calcularDisponible } from '@modules/presupuestos/hooks/usePresupuestos'
import { useTransacciones } from '../hooks/useTransacciones'
import { getCatInfo, etiquetaMetodo } from '../movimientos'
import { TIPO_TRANSFERENCIA, extremosTransferencia } from './TransferRow'
import { fmt, cn } from '@lib/utils'

function Fila({ label, children }) {
  return (
    <div className="flex justify-between items-center gap-3 min-h-[46px] border-t border-white/[0.06] first:border-0">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-white text-right">{children}</span>
    </div>
  )
}

// De qué presupuesto(s) se descontó un gasto personal
function PresupuestosDelGasto({ tx }) {
  const { data: presupuestos = [] } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()
  const personales = presupuestos.filter((p) => !p.contexto || p.contexto === 'personal')
  const destinos = presupuestosDeGasto(personales, tx.categoria, tx.persona, tx.subcategoria)
    .filter((p) => tx.fecha >= p.fecha_inicio)
  if (destinos.length === 0) return <span className="text-gray-400">Ninguno</span>
  return (
    <span className="flex flex-col items-end gap-1">
      {destinos.map((p) => {
        const { disponible } = calcularDisponible(p, transacciones)
        return (
          <span key={p.id} className="text-[11px] font-semibold text-[var(--accent-light)] bg-[var(--accent-muted)] border border-[var(--accent)]/40 px-2 py-0.5 rounded-full">
            {p.emoji} {p.nombre} · {disponible < 0 ? `excedido ${fmt(Math.abs(disponible))}` : `quedan ${fmt(disponible)}`}
          </span>
        )
      })}
    </span>
  )
}

const fechaLarga = (fecha) => {
  const s = format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DetalleMovimiento({ item, onClose, nombres, cuentasMap, tarjetasMap, onEditar, onRepetir, onEliminar }) {
  if (!item) return null
  const { kind, data } = item

  if (kind === 'transfer') {
    const info = TIPO_TRANSFERENCIA[data.tipo] || { emoji: '🔄', label: data.tipo }
    const { origen, destino } = extremosTransferencia(data, cuentasMap, tarjetasMap)
    return (
      <Modal open onClose={onClose}>
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-info/15 text-blue-300 flex items-center justify-center mb-2.5">
            <ArrowLeftRight size={24} />
          </div>
          <p className="text-[15px] font-semibold text-white mb-1">{data.descripcion || info.label}</p>
          <p className="text-[32px] leading-tight font-bold font-mono text-blue-300">{fmt(data.monto)}</p>
          <p className="text-xs text-gray-400 mt-1">{fechaLarga(data.fecha)} · Transferencia</p>
        </div>
        <div className="bg-surface-700 rounded-2xl px-3.5 mb-3">
          <Fila label="Tipo">{info.emoji} {info.label}</Fila>
          <Fila label="De">{origen}</Fila>
          <Fila label="A">{destino}</Fila>
          {Number(data.comision) > 0 && <Fila label="Comisión"><span className="text-warn">{fmt(data.comision)}</span></Fila>}
        </div>
        <button onClick={() => onEliminar(item)} className="w-full min-h-[46px] flex items-center justify-center gap-1.5 text-[13px] font-semibold text-bad">
          <Trash2 size={14} /> Eliminar transferencia
        </button>
      </Modal>
    )
  }

  const tx = data
  const cat = getCatInfo(tx.categoria)
  const esIngreso = tx.tipo === 'ingreso'
  const metodo = etiquetaMetodo(tx, cuentasMap, tarjetasMap)
  const personaLabel = tx.persona === 'p1' ? nombres.p1 : tx.persona === 'p2' ? nombres.p2 : 'Ambos'

  return (
    <Modal open onClose={onClose}>
      <div className="flex flex-col items-center text-center mb-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-700 flex items-center justify-center text-[26px] mb-2.5">{cat.emoji}</div>
        <p className="text-[15px] font-semibold text-white mb-1">{tx.descripcion || cat.label}</p>
        <p className={cn('text-[32px] leading-tight font-bold font-mono', esIngreso ? 'text-ok' : 'text-white')}>
          {esIngreso ? '+' : '-'}{fmt(tx.monto)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {fechaLarga(tx.fecha)} · {esIngreso ? 'Ingreso' : 'Gasto'} {tx.contexto === 'negocio' ? 'de negocio' : 'personal'}
        </p>
      </div>

      <div className="bg-surface-700 rounded-2xl px-3.5 mb-3">
        <Fila label="Categoría">{cat.emoji} {cat.label}{tx.subcategoria && ` › ${tx.subcategoria}`}</Fila>
        <Fila label={esIngreso ? 'Entró a' : 'Pagado con'}>{metodo || <span className="text-gray-400">Sin cuenta</span>}</Fila>
        {tx.contexto !== 'negocio' && (
          <Fila label="De quién">
            {personaLabel}
            {tx.persona === 'ambos' && <span className="text-gray-400"> · {fmt(Number(tx.monto) / 2)} c/u</span>}
          </Fila>
        )}
        {!esIngreso && tx.contexto !== 'negocio' && (
          <Fila label="Presupuesto"><PresupuestosDelGasto tx={tx} /></Fila>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={() => onEditar(tx)} className="btn-primary min-h-[50px] text-sm font-semibold">
          <Pencil size={15} /> Editar
        </button>
        <button onClick={() => onRepetir(tx)} className="btn-ghost min-h-[50px] text-sm font-semibold">
          <Copy size={15} /> Repetir
        </button>
      </div>
      <button onClick={() => onEliminar(item)} className="w-full min-h-[46px] flex items-center justify-center gap-1.5 text-[13px] font-semibold text-bad">
        <Trash2 size={14} /> Eliminar movimiento
      </button>
    </Modal>
  )
}

// src/modules/negocio-hub/PresupuestoNegocioPage.jsx
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Check, AlertCircle, TrendingDown } from 'lucide-react'
import { usePresupuestos, useCrearPresupuesto, useActualizarPresupuesto, useEliminarPresupuesto, calcularDisponible, calcularDesglose, labelPeriodo } from '@modules/presupuestos/hooks/usePresupuestos'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { useToast } from '@ui/Toast'
import { EmptyState, AmountInput, Select, Input } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { fmt, cn, today, CAT_NEGOCIO_GASTO } from '@lib/utils'

const FRECUENCIAS = [
  { value: 'mensual',    label: 'Mensual' },
  { value: 'semanal',    label: 'Semanal' },
  { value: 'trimestral', label: 'Trimestral' },
]

const EMOJIS_NEGOCIO = ['📦','🚚','📣','💻','🔧','🤝','⚙️','🎯','💰','📊']

// ── Formulario ────────────────────────────────────────────────
function FormPresupuestoNegocio({ open, onClose, presupuesto = null }) {
  const toast = useToast()
  const crear = useCrearPresupuesto()
  const actualizar = useActualizarPresupuesto()
  const isEdit = Boolean(presupuesto)
  const loading = crear.isPending || actualizar.isPending

  const CAT_OPTS = [
    { value: '', label: 'General (todos los gastos de negocio)' },
    ...CAT_NEGOCIO_GASTO.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` })),
  ]

  const [nombre, setNombre]         = useState(presupuesto?.nombre || '')
  const [emoji, setEmoji]           = useState(presupuesto?.emoji || '📦')
  const [tipo, setTipo]             = useState(presupuesto?.tipo || 'mensual')
  const [montoBase, setMontoBase]   = useState(presupuesto?.monto_base ? String(presupuesto.monto_base) : '')
  const [categoria, setCategoria]   = useState(presupuesto?.categoria || '')
  const [fechaInicio, setFechaInicio] = useState(presupuesto?.fecha_inicio || today())

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!montoBase || Number(montoBase) <= 0) { toast.error('Ingresa el monto'); return }
    const payload = {
      nombre: nombre.trim(), emoji, tipo,
      monto_base: Number(montoBase),
      persona: 'ambos',
      contexto: 'negocio',
      categoria: categoria || null,
      fecha_inicio: fechaInicio,
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: presupuesto.id, data: payload })
        toast.success('Presupuesto actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Presupuesto de negocio creado')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto de negocio'}>
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS_NEGOCIO.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all',
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              )}>{e}</button>
          ))}
        </div>
      </div>

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Packaging mensual, Publicidad" autoFocus />

      <Select label="Categoría de negocio" value={categoria} onChange={setCategoria} options={CAT_OPTS} />

      <div className="grid grid-cols-2 gap-3">
        <AmountInput label="Límite" value={montoBase} onChange={setMontoBase}
          placeholder="0.00" className="mb-0" />
        <Select label="Frecuencia" value={tipo} onChange={setTipo}
          options={FRECUENCIAS} className="mb-0" />
      </div>

      <div className="mt-3 mb-4">
        <label className="label">Fecha de inicio</label>
        <input type="date" value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)} className="input" />
      </div>

      <button onClick={handleSave} disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Crear presupuesto'}</>}
      </button>
    </Modal>
  )
}

// ── Card de presupuesto de negocio ────────────────────────────
function PresupuestoNegocioCard({ presupuesto, transacciones, onEdit, onDelete }) {
  // Filtrar solo gastos de negocio de esta categoría
  const txFiltradas = useMemo(() => {
    return transacciones.filter((t) => {
      if (t.tipo !== 'gasto' || t.contexto !== 'negocio') return false
      if (presupuesto.categoria) {
        const cats = presupuesto.categoria === 'inventario'
          ? ['inventario', 'compra_producto']
          : [presupuesto.categoria]
        if (!cats.includes(t.categoria)) return false
      }
      return t.fecha >= presupuesto.fecha_inicio
    })
  }, [transacciones, presupuesto])

  const { disponible, presupuestoAcumulado, gastado, pctUsado } = calcularDisponible(presupuesto, txFiltradas)
  const desglose  = calcularDesglose(presupuesto)
  const excedido  = disponible < 0
  const barColor  = pctUsado >= 100 ? 'bg-bad' : pctUsado >= 80 ? 'bg-warn' : 'bg-ok'

  const catInfo = CAT_NEGOCIO_GASTO.find((c) => c.value === presupuesto.categoria)

  return (
    <div className={cn('card p-4', excedido && 'border border-bad/40')}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
            excedido ? 'bg-bad/10' : 'bg-[var(--accent-muted)]'
          )}>
            {presupuesto.emoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white">{presupuesto.nombre}</p>
              {excedido && <span className="text-[10px] bg-bad/20 text-bad px-1.5 py-0.5 rounded-full">Excedido</span>}
            </div>
            <p className="text-[11px] text-gray-500">
              {catInfo ? `${catInfo.emoji} ${catInfo.label}` : 'General'} · {labelPeriodo(presupuesto.tipo)}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(presupuesto)}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(presupuesto)}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-bad">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
            {excedido ? 'Excedido' : 'Disponible'}
          </p>
          <p className={cn('text-2xl font-bold font-mono', excedido ? 'text-bad' : 'text-ok')}>
            {excedido ? '-' : '+'}{fmt(Math.abs(disponible))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">Gastado</p>
          <p className="text-sm font-mono text-white font-medium">{fmt(gastado)}</p>
          <p className="text-[10px] text-gray-500">de {fmt(presupuestoAcumulado)}</p>
        </div>
      </div>

      <div className="h-2 bg-surface-500 rounded-full overflow-hidden mb-1.5">
        <div className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(pctUsado, 100)}%` }} />
      </div>

      <div className="flex justify-between mb-2">
        <p className={cn('text-[11px] font-medium',
          pctUsado >= 100 ? 'text-bad' : pctUsado >= 80 ? 'text-warn' : 'text-gray-500')}>
          {pctUsado}% usado
        </p>
        <p className="text-[10px] text-gray-500">
          {excedido ? 'Se descuenta del siguiente período' : `Acumulado: ${fmt(disponible)}`}
        </p>
      </div>

      {desglose && (
        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-gray-500 self-center">Equivale a:</p>
          {desglose.porSemana && (
            <div className="flex-1 bg-surface-700 rounded-xl p-2 text-center">
              <p className="text-[10px] text-gray-500">Por semana</p>
              <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(desglose.porSemana)}</p>
            </div>
          )}
          {desglose.porDia && (
            <div className="flex-1 bg-surface-700 rounded-xl p-2 text-center">
              <p className="text-[10px] text-gray-500">Por día</p>
              <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(desglose.porDia)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function PresupuestoNegocioPage() {
  const toast = useToast()
  const { data: todosPresupuestos = [], isPending } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()
  const eliminar = useEliminarPresupuesto()

  const [formOpen, setFormOpen]     = useState(false)
  const [editPresup, setEditPresup] = useState(null)

  // Solo presupuestos de negocio
  const presupuestos = todosPresupuestos.filter((p) => p.contexto === 'negocio')

  const items = useMemo(() => presupuestos.map((p) => {
    const txFiltradas = transacciones.filter((t) => {
      if (t.tipo !== 'gasto' || t.contexto !== 'negocio') return false
      if (p.categoria) {
        const cats = p.categoria === 'inventario'
          ? ['inventario', 'compra_producto']
          : [p.categoria]
        if (!cats.includes(t.categoria)) return false
      }
      return t.fecha >= p.fecha_inicio
    })
    return { ...p, ...calcularDisponible(p, txFiltradas) }
  }), [presupuestos, transacciones])

  const excedidos  = items.filter((i) => i.disponible < 0)
  const enRegla    = items.filter((i) => i.disponible >= 0)
  const gastadoTotal = items.reduce((s, i) => s + i.gastado, 0)
  const limiteTotal  = items.reduce((s, i) => s + i.presupuestoAcumulado, 0)

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    try { await eliminar.mutateAsync(p.id); toast.success('Eliminado') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        {items.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className={cn('rounded-xl p-3', excedidos.length > 0 ? 'bg-bad/10 border border-bad/20' : 'bg-ok/10 border border-ok/20')}>
                <p className="text-[10px] text-gray-400">Excedidos</p>
                <p className={cn('text-lg font-bold', excedidos.length > 0 ? 'text-bad' : 'text-ok')}>
                  {excedidos.length}/{items.length}
                </p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3">
                <p className="text-[10px] text-gray-400">Gastado</p>
                <p className="text-sm font-bold font-mono text-white">{fmt(gastadoTotal)}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3">
                <p className="text-[10px] text-gray-400">Límite total</p>
                <p className="text-sm font-bold font-mono text-gray-300">{fmt(limiteTotal)}</p>
              </div>
            </div>

            {excedidos.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-bad/10 border border-bad/20 rounded-xl">
                <AlertCircle size={14} className="text-bad flex-shrink-0" />
                <p className="text-xs text-bad">
                  {excedidos.map((e) => e.nombre).join(', ')} {excedidos.length === 1 ? 'excedido' : 'excedidos'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-40" />)}</div>
        ) : presupuestos.length === 0 ? (
          <EmptyState emoji="🏪" title="Sin presupuestos de negocio"
            description="Crea límites de gasto para packaging, envíos, publicidad y más" />
        ) : (
          <div className="space-y-3">
            {/* Excedidos primero */}
            {[...items.filter((i) => i.disponible < 0), ...items.filter((i) => i.disponible >= 0)]
              .map((p) => (
                <PresupuestoNegocioCard
                  key={p.id} presupuesto={p} transacciones={transacciones}
                  onEdit={(p) => { setEditPresup(p); setFormOpen(true) }}
                  onDelete={handleDelete}
                />
              ))
            }
          </div>
        )}
      </div>

      <button onClick={() => { setEditPresup(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormPresupuestoNegocio
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPresup(null) }}
        presupuesto={editPresup}
      />
    </>
  )
}

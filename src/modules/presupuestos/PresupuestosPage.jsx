// src/modules/presupuestos/PresupuestosPage.jsx
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePresupuestos, useEliminarPresupuesto, calcularDisponible, calcularDesglose, labelPeriodo } from './hooks/usePresupuestos'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import FormPresupuesto from './components/FormPresupuesto'
import { fmt, cn } from '@lib/utils'

const TIPO_LABEL = { diario: 'Diario', semanal: 'Semanal', mensual: 'Mensual' }
const TABS = [
  { id: 'todos',    label: 'Todos' },
  { id: 'diario',   label: '📅 Diario' },
  { id: 'semanal',  label: '🗓️ Semanal' },
  { id: 'mensual',  label: '📆 Mensual' },
]

function PresupuestoCard({ presupuesto, transacciones, nombres, onEdit, onDelete }) {
  const { disponible, presupuestoAcumulado, gastado, periodos, pctUsado } = calcularDisponible(presupuesto, transacciones)
  const desglose    = calcularDesglose(presupuesto)
  const excedido    = disponible < 0
  const personaLabel = presupuesto.persona === 'ambos' ? 'Pareja'
    : presupuesto.persona === 'p1' ? nombres.p1 : nombres.p2

  const barColor = pctUsado >= 100 ? 'bg-bad' : pctUsado >= 80 ? 'bg-warn' : 'bg-ok'

  return (
    <div className={cn('card p-4', excedido && 'border border-bad/40')}>
      {/* Header */}
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
              {excedido && (
                <span className="text-[10px] bg-bad/20 text-bad px-1.5 py-0.5 rounded-full font-medium">
                  Excedido
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              {TIPO_LABEL[presupuesto.tipo]} · {personaLabel} · {labelPeriodo(presupuesto.tipo)}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(presupuesto)} aria-label="Editar presupuesto" className="icon-btn text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(presupuesto)} aria-label="Eliminar presupuesto" className="icon-btn text-gray-500 hover:text-bad">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Disponible */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
            {excedido ? 'Excedido' : 'Disponible acumulado'}
          </p>
          <div className="flex items-center gap-2">
            <p className={cn('text-2xl font-bold font-mono', excedido ? 'text-bad' : 'text-ok')}>
              {excedido ? '-' : '+'}{fmt(Math.abs(disponible))}
            </p>
            {excedido
              ? <TrendingDown size={16} className="text-bad" />
              : disponible > Number(presupuesto.monto_base)
                ? <TrendingUp size={16} className="text-ok" />
                : <Minus size={16} className="text-gray-500" />
            }
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Gastado</p>
          <p className="text-sm font-mono text-white font-medium">{fmt(gastado)}</p>
          <p className="text-[10px] text-gray-400">de {fmt(presupuestoAcumulado)}</p>
        </div>
      </div>

      {/* Barra */}
      <div className="h-2 bg-surface-500 rounded-full overflow-hidden mb-1.5">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(pctUsado, 100)}%` }} />
      </div>
      <div className="flex justify-between mb-2">
        <p className={cn('text-[11px] font-medium', pctUsado >= 100 ? 'text-bad' : pctUsado >= 80 ? 'text-warn' : 'text-gray-400')}>
          {pctUsado}% usado
        </p>
        <p className="text-[10px] text-gray-400">
          {excedido
            ? 'Se descuenta del siguiente período'
            : `Sobrante acumulado: ${fmt(disponible)}`}
        </p>
      </div>

      {/* Desglose semanal/diario */}
      {desglose && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-gray-400 self-center mr-1">Equivale a:</p>
          {desglose.porSemana && (
            <div className="flex-1 bg-surface-700 rounded-xl p-2 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Por semana</p>
              <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(desglose.porSemana)}</p>
            </div>
          )}
          {desglose.porDia && (
            <div className="flex-1 bg-surface-700 rounded-xl p-2 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Por día</p>
              <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(desglose.porDia)}</p>
            </div>
          )}
        </div>
      )}

      {/* Períodos info */}
      {periodos > 1 && (
        <p className="text-[10px] text-gray-600 mt-2">
          {periodos} {presupuesto.tipo === 'diario' ? 'días' : presupuesto.tipo === 'semanal' ? 'semanas' : 'meses'} activo
          · {fmt(presupuesto.monto_base)}/{presupuesto.tipo === 'diario' ? 'día' : presupuesto.tipo === 'semanal' ? 'sem' : 'mes'} base
        </p>
      )}
    </div>
  )
}

export default function PresupuestosPage() {
  const { nombres } = useAppStore()
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: presupuestos = [], isPending } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()
  const eliminar = useEliminarPresupuesto()

  const [formOpen, setFormOpen]     = useState(false)
  const [editPresup, setEditPresup] = useState(null)
  const [tabActivo, setTabActivo]   = useState('todos')

  const items = useMemo(() => presupuestos
    .filter((p) => !p.contexto || p.contexto === 'personal')
    .map((p) => ({
    ...p, ...calcularDisponible(p, transacciones),
  })), [presupuestos, transacciones])

  const excedidos = items.filter((i) => i.disponible < 0)
  const enRegla   = items.filter((i) => i.disponible >= 0)

  const filtrados = tabActivo === 'todos'
    ? items
    : items.filter((i) => i.tipo === tabActivo)

  const handleDelete = async (p) => {
    if (!(await confirmar({ message: `¿Eliminar el presupuesto "${p.nombre}"?` }))) return
    try {
      await eliminar.mutateAsync(p.id)
      toast.success('Presupuesto eliminado')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        {/* Resumen rápido */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className={cn('rounded-xl p-3', excedidos.length > 0 ? 'bg-bad/10 border border-bad/20' : 'bg-ok/10 border border-ok/20')}>
              <p className="text-[10px] text-gray-400 mb-0.5">Excedidos</p>
              <p className={cn('text-lg font-bold', excedidos.length > 0 ? 'text-bad' : 'text-ok')}>
                {excedidos.length} / {items.length}
              </p>
            </div>
            <div className="bg-surface-700 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-0.5">En regla</p>
              <p className="text-lg font-bold text-white">{enRegla.length} / {items.length}</p>
            </div>
          </div>
        )}

        {/* Tabs tipo */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const count = t.id === 'todos'
              ? items.length
              : items.filter((i) => i.tipo === t.id).length
            const hayExcedidosEnTab = t.id === 'todos'
              ? excedidos.length > 0
              : items.filter((i) => i.tipo === t.id && i.disponible < 0).length > 0
            return (
              <button
                key={t.id} onClick={() => setTabActivo(t.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all relative',
                  tabActivo === t.id ? 'bg-[var(--accent)] text-white' : 'bg-surface-700 text-gray-400'
                )}
              >
                {t.label}{count > 0 && ` (${count})`}
                {hayExcedidosEnTab && <span className="absolute -top-1 -right-1 w-2 h-2 bg-bad rounded-full" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">
            {[1,2].map((i) => <div key={i} className="skeleton h-40" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            emoji="🎯" title="Sin presupuestos"
            description="Crea un límite de gasto diario, semanal o mensual con roll-over automático"
          />
        ) : (
          <div className="space-y-3">
            {/* Excedidos primero */}
            {filtrados.filter((i) => i.disponible < 0).map((p) => (
              <PresupuestoCard key={p.id} presupuesto={p} transacciones={transacciones}
                nombres={nombres}
                onEdit={(p) => { setEditPresup(p); setFormOpen(true) }}
                onDelete={handleDelete}
              />
            ))}
            {/* Luego los en regla */}
            {filtrados.filter((i) => i.disponible >= 0).map((p) => (
              <PresupuestoCard key={p.id} presupuesto={p} transacciones={transacciones}
                nombres={nombres}
                onEdit={(p) => { setEditPresup(p); setFormOpen(true) }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditPresup(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormPresupuesto
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPresup(null) }}
        presupuesto={editPresup}
      />
    </>
  )
}

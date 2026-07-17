// src/modules/transactions/TransactionsPage.jsx
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Filter, Search, X } from 'lucide-react'
import { useTransacciones, useEliminarTransaccion } from './hooks/useTransacciones'
import { useTransferenciasList } from './hooks/useTransferenciasList'
import { useEliminarTransferencia } from '@modules/accounts/hooks/useTransferencias'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import FormTransaccion from './components/FormTransaccion'
import TransferRow from './components/TransferRow'
import { fmt, fmtDate, currentMonth, cn, CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO } from '@lib/utils'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

const ALL_CATS = [...CAT_GASTO, ...CAT_INGRESO, ...CAT_NEGOCIO_GASTO]
function getCatInfo(value) {
  return ALL_CATS.find((c) => c.value === value) || { emoji: '📦', label: value }
}

function TxRow({ tx, nombres, onEdit, onDelete }) {
  const isIngreso = tx.tipo === 'ingreso'
  const cat = getCatInfo(tx.categoria)
  const personaLabel = tx.persona === 'p1' ? nombres.p1 : tx.persona === 'p2' ? nombres.p2 : 'Ambos'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-9 h-9 rounded-xl bg-surface-700 flex items-center justify-center text-base flex-shrink-0">
        {cat.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white font-medium truncate">{tx.descripcion || cat.label}</p>
          {tx.contexto === 'negocio' && <span className="text-xs flex-shrink-0">🏪</span>}
        </div>
        <p className="text-xs text-gray-400">{fmtDate(tx.fecha)} · {personaLabel}</p>
      </div>
      <p className={cn('text-sm font-semibold font-mono flex-shrink-0', isIngreso ? 'text-ok' : 'text-white')}>
        {isIngreso ? '+' : '-'}{fmt(tx.monto)}
      </p>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEdit(tx)} aria-label="Editar movimiento" className="icon-btn text-gray-500 hover:text-white">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(tx)} aria-label="Eliminar movimiento" className="icon-btn text-gray-500 hover:text-bad">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function MonthPicker({ value, onChange }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-sm capitalize">
      <option value="">Todos los meses</option>
      {months.map((m) => (
        <option key={m.value} value={m.value} className="bg-surface-800 capitalize">{m.label}</option>
      ))}
    </select>
  )
}

export default function TransactionsPage() {
  const { nombres } = useAppStore()
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const eliminar = useEliminarTransaccion()
  const eliminarTransf = useEliminarTransferencia()

  const [vista, setVista]         = useState('movimientos') // 'movimientos' | 'transferencias'
  const [formOpen, setFormOpen]   = useState(false)
  const [editTx, setEditTx]       = useState(null)
  const [search, setSearch]       = useState('')
  const [filterTipo, setFilterTipo]         = useState('')
  const [filterContexto, setFilterContexto] = useState('')
  const [filterPersona, setFilterPersona]   = useState('')
  const [filterMes, setFilterMes] = useState(currentMonth())
  const [showFilters, setShowFilters] = useState(false)

  const { data: transacciones = [], isPending: txPending } = useTransacciones({ mes: filterMes || undefined })
  const { data: transferencias = [], isPending: transfPending } = useTransferenciasList({ mes: filterMes || undefined })

  const cuentasMap = useMemo(() => Object.fromEntries(cuentas.map((c) => [c.id, c])), [cuentas])
  const tarjetasMap = useMemo(() => Object.fromEntries(tarjetas.map((t) => [t.id, t])), [tarjetas])

  const filtered = useMemo(() => {
    return transacciones.filter((t) => {
      if (filterTipo && t.tipo !== filterTipo) return false
      if (filterContexto && t.contexto !== filterContexto) return false
      if (filterPersona && t.persona !== filterPersona) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.descripcion?.toLowerCase().includes(q) && !t.categoria.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transacciones, filterTipo, filterContexto, filterPersona, search])

  const filteredTransfers = useMemo(() => {
    if (!search) return transferencias
    const q = search.toLowerCase()
    return transferencias.filter((t) => t.descripcion?.toLowerCase().includes(q))
  }, [transferencias, search])

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach((t) => {
      if (!groups[t.fecha]) groups[t.fecha] = []
      groups[t.fecha].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const groupedTransfers = useMemo(() => {
    const groups = {}
    filteredTransfers.forEach((t) => {
      if (!groups[t.fecha]) groups[t.fecha] = []
      groups[t.fecha].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTransfers])

  const totales = useMemo(() => ({
    ingresos: filtered.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0),
    gastos:   filtered.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0),
  }), [filtered])

  const totalTransferido = useMemo(
    () => filteredTransfers.reduce((s, t) => s + Number(t.monto) + Number(t.comision || 0), 0),
    [filteredTransfers]
  )

  const handleDelete = async (tx) => {
    if (!(await confirmar({ message: `¿Eliminar este movimiento de ${fmt(tx.monto)}?` }))) return
    try {
      await eliminar.mutateAsync({ tx, cuentas, tarjetas })
      toast.success('Movimiento eliminado')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleDeleteTransfer = async (transferencia) => {
    if (!(await confirmar({ message: '¿Ah, te equivocaste? Solo confirma y la eliminamos.' }))) return
    try {
      await eliminarTransf.mutateAsync({ transferencia, cuentas, tarjetas })
      toast.success('Transferencia eliminada')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const activeFilters = [filterTipo, filterContexto, filterPersona].filter(Boolean).length

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        {/* Toggle Movimientos / Transferencias */}
        <div className="flex bg-surface-700 rounded-xl p-1 mb-3">
          {[['movimientos','💸 Movimientos'],['transferencias','🔄 Transferencias']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className={cn(
                'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                vista === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mb-2.5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={vista === 'movimientos' ? 'Buscar movimientos…' : 'Buscar transferencias…'}
            className="input-sm pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {vista === 'movimientos' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                showFilters || activeFilters > 0 ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-surface-700 text-gray-400'
              )}
            >
              <Filter size={13} /> Filtros {activeFilters > 0 && `(${activeFilters})`}
            </button>
          )}
          {vista === 'movimientos' && <div className="flex-1" />}
          {vista === 'movimientos' ? (
            <div className="text-right">
              <p className="text-xs text-ok font-mono">+{fmt(totales.ingresos)}</p>
              <p className="text-xs text-bad font-mono">-{fmt(totales.gastos)}</p>
            </div>
          ) : (
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-400">Total movido este período</p>
              <p className="text-sm font-mono text-[var(--accent)] font-semibold">{fmt(totalTransferido)}</p>
            </div>
          )}
        </div>

        {showFilters && vista === 'movimientos' && (
          <div className="mt-3 space-y-2 animate-slide-up">
            <MonthPicker value={filterMes} onChange={setFilterMes} />
            <div className="grid grid-cols-3 gap-2">
              <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="input-sm">
                <option value="">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="gasto">Gastos</option>
              </select>
              <select value={filterContexto} onChange={(e) => setFilterContexto(e.target.value)} className="input-sm">
                <option value="">Todo</option>
                <option value="personal">👤 Personal</option>
                <option value="negocio">🏪 Negocio</option>
              </select>
              <select value={filterPersona} onChange={(e) => setFilterPersona(e.target.value)} className="input-sm">
                <option value="">Todos</option>
                <option value="p1">{nombres.p1}</option>
                <option value="p2">{nombres.p2}</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>
        )}

        {vista === 'transferencias' && (
          <div className="mt-3 animate-slide-up">
            <MonthPicker value={filterMes} onChange={setFilterMes} />
          </div>
        )}
      </div>

      <div className="page px-4">
        {vista === 'movimientos' ? (
          txPending ? (
            <div className="space-y-3 mt-4">
              {[1,2,3].map((i) => <div key={i} className="skeleton h-16" />)}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              emoji="💸" title="Sin movimientos"
              description={search ? 'No hay resultados para tu búsqueda' : 'Registra tu primer ingreso o gasto'}
              action={
                <button onClick={() => { setEditTx(null); setFormOpen(true) }} className="btn-primary px-6 py-2.5 text-sm">
                  <Plus size={15} /> Agregar
                </button>
              }
            />
          ) : (
            grouped.map(([fecha, txs]) => (
              <div key={fecha} className="mt-4">
                <p className="section-label mb-2">{fmtDate(fecha, 'long')}</p>
                <div className="card px-3">
                  {txs.map((tx) => (
                    <TxRow
                      key={tx.id} tx={tx} nombres={nombres}
                      onEdit={(t) => { setEditTx(t); setFormOpen(true) }}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        ) : (
          transfPending ? (
            <div className="space-y-3 mt-4">
              {[1,2].map((i) => <div key={i} className="skeleton h-16" />)}
            </div>
          ) : groupedTransfers.length === 0 ? (
            <EmptyState emoji="🔄" title="Sin transferencias" description="Aquí verás tus movimientos entre cuentas, pagos de tarjeta y disposiciones" />
          ) : (
            groupedTransfers.map(([fecha, items]) => (
              <div key={fecha} className="mt-4">
                <p className="section-label mb-2">{fmtDate(fecha, 'long')}</p>
                <div className="card px-3">
                  {items.map((t) => (
                    <TransferRow key={t.id} transferencia={t} cuentasMap={cuentasMap} tarjetasMap={tarjetasMap} onDelete={handleDeleteTransfer} />
                  ))}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {vista === 'movimientos' && (
        <button onClick={() => { setEditTx(null); setFormOpen(true) }} className="fab">
          <Plus size={24} />
        </button>
      )}

      <FormTransaccion
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTx(null) }}
        tx={editTx}
      />
    </>
  )
}

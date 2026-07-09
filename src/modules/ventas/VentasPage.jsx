// src/modules/ventas/VentasPage.jsx
import { useState, useMemo } from 'react'
import { Plus, TrendingUp, Package, ChevronRight, X } from 'lucide-react'
import { useVentas, useVentaItems, useCancelarVenta, METODOS_COBRO } from './hooks/useVentas'
import { useClientes } from '@modules/clientes/hooks/useClientes'
import { useToast } from '@ui/Toast'
import { EmptyState } from '@ui/Field'
import FormVenta from './components/FormVenta'
import { fmt, cn, fmtDate } from '@lib/utils'

const METODO_LABEL = Object.fromEntries(METODOS_COBRO.map((m) => [m.value, m.label]))

function DetalleVenta({ venta, clientes, onClose }) {
  const { data: items = [] } = useVentaItems(venta?.id)
  const cancelar = useCancelarVenta()
  const toast = useToast()

  if (!venta) return null
  const cliente = clientes.find((c) => c.id === venta.cliente_id)

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar esta venta? No revierte el stock automáticamente.')) return
    try { await cancelar.mutateAsync(venta.id); toast.success('Venta cancelada'); onClose() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-surface-800 rounded-t-3xl p-5 border-t border-white/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-white">
              Venta — {fmtDate(venta.fecha)}
            </p>
            <p className="text-xs text-gray-500">
              {cliente?.nombre || 'Sin cliente'} · {METODO_LABEL[venta.metodo_cobro]}
            </p>
          </div>
          <span className={cn('text-[10px] px-2 py-1 rounded-full font-medium',
            venta.estado === 'completada' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'
          )}>
            {venta.estado}
          </span>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2.5 bg-surface-700 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium">Carta #{item.producto_id.slice(-6)}</p>
                <p className="text-[10px] text-gray-500">
                  {item.cantidad}x · Costo: {fmt(item.costo_unitario)} c/u
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-white">{fmt(item.subtotal)}</p>
                <p className={cn('text-[10px] font-mono', item.ganancia_item >= 0 ? 'text-ok' : 'text-bad')}>
                  {item.ganancia_item >= 0 ? '+' : ''}{fmt(item.ganancia_item)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="bg-surface-700 rounded-xl p-3 space-y-1.5 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Total venta</span>
            <span className="font-mono text-white">{fmt(venta.total_venta)}</span>
          </div>
          {venta.comision_monto > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-warn">Comisión ({venta.comision_pct}%)</span>
              <span className="font-mono text-warn">-{fmt(venta.comision_monto)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Costo total</span>
            <span className="font-mono text-bad">-{fmt(venta.total_costo)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-1.5">
            <span className="text-white">Ganancia</span>
            <span className={cn('font-mono', venta.ganancia >= 0 ? 'text-ok' : 'text-bad')}>
              {fmt(venta.ganancia)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cerrar</button>
          {venta.estado === 'completada' && (
            <button onClick={handleCancelar} className="px-4 py-2.5 rounded-xl text-bad text-sm border border-bad/30">
              Cancelar venta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VentasPage() {
  const toast = useToast()
  const { data: ventas = [], isPending }  = useVentas()
  const { data: clientes = [] }           = useClientes()
  const [formOpen, setFormOpen]           = useState(false)
  const [detalleVenta, setDetalleVenta]   = useState(null)

  const stats = useMemo(() => ({
    totalVentas:  ventas.filter((v) => v.estado === 'completada').reduce((s, v) => s + Number(v.total_venta), 0),
    totalGanancia: ventas.filter((v) => v.estado === 'completada').reduce((s, v) => s + Number(v.ganancia), 0),
    numVentas:    ventas.filter((v) => v.estado === 'completada').length,
  }), [ventas])

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-700 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 mb-1">Ventas</p>
            <p className="text-lg font-bold text-white">{stats.numVentas}</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 mb-1">Ingresos</p>
            <p className="text-sm font-bold font-mono text-white">{fmt(stats.totalVentas)}</p>
          </div>
          <div className="bg-ok/10 border border-ok/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 mb-1">Ganancia</p>
            <p className="text-sm font-bold font-mono text-ok">{fmt(stats.totalGanancia)}</p>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        ) : ventas.length === 0 ? (
          <EmptyState emoji="💰" title="Sin ventas registradas"
            description="Registra tu primera venta tocando el botón +" />
        ) : (
          <div className="space-y-2">
            {ventas.map((v) => {
              const cliente = clientes.find((c) => c.id === v.cliente_id)
              return (
                <button key={v.id} onClick={() => setDetalleVenta(v)}
                  className="card p-4 w-full text-left active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white">
                      {cliente?.nombre || 'Venta sin cliente'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={cn('text-xs font-mono font-bold', v.ganancia >= 0 ? 'text-ok' : 'text-bad')}>
                        +{fmt(v.ganancia)}
                      </p>
                      <ChevronRight size={14} className="text-gray-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500">
                      {fmtDate(v.fecha)} · {METODO_LABEL[v.metodo_cobro]}
                    </p>
                    <p className="text-xs font-mono text-gray-300">{fmt(v.total_venta)}</p>
                  </div>
                  {v.estado === 'cancelada' && (
                    <span className="text-[10px] bg-bad/10 text-bad px-1.5 py-0.5 rounded-full mt-1 inline-block">Cancelada</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={() => setFormOpen(true)} className="fab">
        <Plus size={24} />
      </button>

      <FormVenta open={formOpen} onClose={() => setFormOpen(false)} />

      {detalleVenta && (
        <DetalleVenta
          venta={detalleVenta}
          clientes={clientes}
          onClose={() => setDetalleVenta(null)}
        />
      )}
    </>
  )
}

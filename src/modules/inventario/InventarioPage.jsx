// src/modules/inventario/InventarioPage.jsx
import { useState, useMemo } from 'react'
import { Plus, Package, Pencil, Trash2, ChevronRight, FileSpreadsheet, Minus, Users } from 'lucide-react'
import { useLotes, useProductos, useEliminarProducto, useVenderProducto, calcularCostoReal, calcularMargen } from './hooks/useInventario'
import { useToast } from '@ui/Toast'
import { EmptyState } from '@ui/Field'
import FormLote from './components/FormLote'
import FormProducto from './components/FormProducto'
import ImportarExcel from './components/ImportarExcel'
import ProveedoresPage from './components/ProveedoresPage'
import { fmt, cn } from '@lib/utils'

const ESTADO_INFO = {
  pendiente:   { label: 'Pendiente',    color: 'text-gray-400', bg: 'bg-gray-400/10' },
  en_transito: { label: 'En tránsito',  color: 'text-warn',     bg: 'bg-warn/10' },
  recibido:    { label: 'Recibido',     color: 'text-ok',       bg: 'bg-ok/10' },
  cancelado:   { label: 'Cancelado',    color: 'text-bad',      bg: 'bg-bad/10' },
}

const COND_LABEL = { mint: '✨', near_mint: '👍', played: '⚠️', damaged: '❌' }

// ── Vista de productos de un lote ─────────────────────────────
function VistaLote({ lote, onBack, onEditLote }) {
  const toast = useToast()
  const { data: productos = [], isPending } = useProductos({ loteId: lote.id })
  const eliminar = useEliminarProducto()
  const vender   = useVenderProducto()

  const [formProductoOpen, setFormProductoOpen] = useState(false)
  const [editProducto, setEditProducto]         = useState(null)
  const [importarOpen, setImportarOpen]         = useState(false)

  const totalInvertido = productos.reduce((s, p) => s + (calcularCostoReal(p) * p.cantidad_compra), 0)
  const totalStock     = productos.reduce((s, p) => s + Number(p.cantidad_stock), 0)
  const totalVendidas  = productos.reduce((s, p) => s + (Number(p.cantidad_compra) - Number(p.cantidad_stock)), 0)

  const info = ESTADO_INFO[lote.estado]

  const handleVender = async (producto) => {
    if (producto.cantidad_stock <= 0) { toast.error('Sin stock disponible'); return }
    if (!confirm(`¿Registrar venta de 1 "${producto.nombre_jp || producto.nombre_en}"?`)) return
    try {
      await vender.mutateAsync({ producto, cantidad: 1 })
      toast.success('Venta registrada — stock actualizado')
    } catch (e) { toast.error(e.message) }
  }

  const handleEliminar = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre_jp || p.nombre_en}"?`)) return
    try { await eliminar.mutateAsync(p.id); toast.success('Carta eliminada') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          ← Volver a lotes
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-white">{lote.nombre}</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', info.color, info.bg)}>
              {info.label}
            </span>
          </div>
          <button onClick={() => onEditLote(lote)} className="btn-ghost px-2 py-1 text-xs">
            <Pencil size={13} /> Editar lote
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-surface-700 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-gray-500">Invertido</p>
            <p className="text-sm font-bold font-mono text-white">{fmt(totalInvertido)}</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-gray-500">En stock</p>
            <p className="text-sm font-bold text-ok">{totalStock}</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-gray-500">Vendidas</p>
            <p className="text-sm font-bold text-[var(--accent)]">{totalVendidas}</p>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-3">
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setEditProducto(null); setFormProductoOpen(true) }}
            className="btn-primary flex-1 py-2.5 text-xs">
            <Plus size={14} /> Agregar carta
          </button>
          <button onClick={() => setImportarOpen(true)} className="btn-ghost px-3 py-2.5 text-xs">
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>

        {isPending ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        ) : productos.length === 0 ? (
          <EmptyState emoji="🃏" title="Sin cartas" description="Agrega cartas o importa desde Excel" />
        ) : (
          <div className="space-y-2">
            {productos.map((p) => {
              const costoReal = calcularCostoReal(p)
              const margen = calcularMargen(p)
              const sinStock = p.cantidad_stock <= 0
              return (
                <div key={p.id} className={cn('card p-3.5', sinStock && 'opacity-60')}>
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-semibold text-white truncate">
                          {p.nombre_jp || p.nombre_en}
                        </p>
                        <span className="text-[10px] flex-shrink-0">{COND_LABEL[p.condicion]}</span>
                        {p.idioma !== 'ambos' && (
                          <span className="text-[10px] text-gray-500 flex-shrink-0">{p.idioma}</span>
                        )}
                      </div>
                      {p.nombre_jp && p.nombre_en && (
                        <p className="text-[11px] text-gray-500 truncate">{p.nombre_en}</p>
                      )}
                      <p className="text-[10px] text-gray-500">{p.serie} {p.numero_carta && `· #${p.numero_carta}`}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditProducto(p); setFormProductoOpen(true) }}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleEliminar(p)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-bad">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="text-[9px] text-gray-500">Costo</p>
                        <p className="text-xs font-mono text-gray-300">{fmt(costoReal)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500">Venta</p>
                        <p className="text-xs font-mono text-white">{p.precio_venta ? fmt(p.precio_venta) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500">Margen</p>
                        <p className={cn('text-xs font-mono font-medium', margen ? (margen.margen >= 0 ? 'text-ok' : 'text-bad') : 'text-gray-600')}>
                          {margen ? `${Math.round(margen.pct)}%` : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-[9px] text-gray-500">Stock</p>
                        <p className={cn('text-sm font-bold', sinStock ? 'text-bad' : 'text-ok')}>
                          {p.cantidad_stock}/{p.cantidad_compra}
                        </p>
                      </div>
                      {!sinStock && (
                        <button
                          onClick={() => handleVender(p)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-medium"
                        >
                          <Minus size={10} /> Vender
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FormProducto open={formProductoOpen} onClose={() => { setFormProductoOpen(false); setEditProducto(null) }}
        producto={editProducto} loteId={lote.id} />
      <ImportarExcel open={importarOpen} onClose={() => setImportarOpen(false)} loteId={lote.id} />
    </>
  )
}

// ── Vista principal: lista de lotes ───────────────────────────
export default function InventarioPage() {
  const toast = useToast()
  const { data: lotes = [], isPending } = useLotes()
  const { data: todosProductos = [] }   = useProductos()

  const [formLoteOpen, setFormLoteOpen] = useState(false)
  const [editLote, setEditLote]         = useState(null)
  const [loteActivo, setLoteActivo]     = useState(null)
  const [verProveedores, setVerProveedores] = useState(false)

  if (verProveedores) {
    return <ProveedoresPage onBack={() => setVerProveedores(false)} />
  }

  // Resumen general
  const totalStock     = todosProductos.reduce((s, p) => s + Number(p.cantidad_stock), 0)
  const totalInvertido = todosProductos.reduce((s, p) => s + calcularCostoReal(p) * p.cantidad_compra, 0)
  const totalVendidas  = todosProductos.reduce((s, p) => s + (p.cantidad_compra - p.cantidad_stock), 0)

  if (loteActivo) {
    return <VistaLote
      lote={lotes.find((l) => l.id === loteActivo) || loteActivo}
      onBack={() => setLoteActivo(null)}
      onEditLote={(l) => { setEditLote(l); setFormLoteOpen(true) }}
    />
  }

  return (
    <>
      <div className="top-header">
        <div className="flex gap-4 flex-1">
          <div>
            <p className="section-label">En stock</p>
            <p className="text-xl font-bold text-ok">{totalStock}</p>
          </div>
          <div>
            <p className="section-label">Vendidas</p>
            <p className="text-xl font-bold text-[var(--accent)]">{totalVendidas}</p>
          </div>
          <div>
            <p className="section-label">Invertido</p>
            <p className="text-lg font-bold font-mono text-white">{fmt(totalInvertido)}</p>
          </div>
        </div>
        <button onClick={() => setVerProveedores(true)} className="btn-ghost px-2 py-1.5 text-xs flex-shrink-0">
          <Users size={14} /> Proveedores
        </button>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : lotes.length === 0 ? (
          <EmptyState emoji="📦" title="Sin lotes" description="Crea tu primer lote de compra para empezar a registrar tu inventario" />
        ) : (
          <div className="space-y-3">
            {lotes.map((lote) => {
              const productosLote = todosProductos.filter((p) => p.lote_id === lote.id)
              const stockLote = productosLote.reduce((s, p) => s + Number(p.cantidad_stock), 0)
              const totalLote = productosLote.reduce((s, p) => s + Number(p.cantidad_compra), 0)
              const info = ESTADO_INFO[lote.estado]
              const costoExtra = Number(lote.costo_envio) + Number(lote.costo_aduanas) + Number(lote.costo_otros)

              return (
                <button key={lote.id} onClick={() => setLoteActivo(lote.id)}
                  className="card p-4 w-full text-left active:scale-[0.98] transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{lote.nombre}</p>
                      <p className="text-[11px] text-gray-500">{lote.fecha_compra}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', info.color, info.bg)}>
                        {info.label}
                      </span>
                      <ChevronRight size={14} className="text-gray-600" />
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500">Cartas</p>
                      <p className="text-sm font-bold text-white">{totalLote}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Stock</p>
                      <p className="text-sm font-bold text-ok">{stockLote}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Envío+Aduanas</p>
                      <p className="text-sm font-mono text-gray-300">{fmt(costoExtra)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={() => { setEditLote(null); setFormLoteOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormLote open={formLoteOpen} onClose={() => { setFormLoteOpen(false); setEditLote(null) }} lote={editLote} />
    </>
  )
}

// src/modules/ventas/components/FormVenta.jsx
import { useState, useMemo } from 'react'
import { Plus, Trash2, Check, Search, ChevronDown } from 'lucide-react'
import Modal from '@ui/Modal'
import { AmountInput, Select, Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useProductos } from '@modules/inventario/hooks/useInventario'
import { useClientes } from '@modules/clientes/hooks/useClientes'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useRegistrarVenta, METODOS_COBRO, calcularCostoReal } from '../hooks/useVentas'
import { fmt, cn, today, getNivelCliente } from '@lib/utils'

export default function FormVenta({ open, onClose }) {
  const toast = useToast()
  const { data: productos = [] } = useProductos()
  const { data: clientes = [] }  = useClientes()
  const { data: cuentas = [] }   = useCuentas()
  const registrar = useRegistrarVenta()

  const [busqueda, setBusqueda]     = useState('')
  const [items, setItems]           = useState([])       // { producto, cantidad, precioVenta }
  const [clienteId, setClienteId]   = useState('')
  const [fecha, setFecha]           = useState(today())
  const [metodoCobro, setMetodo]    = useState('efectivo')
  const [cuentaId, setCuentaId]     = useState('')
  const [nota, setNota]             = useState('')
  const [paso, setPaso]             = useState(1)        // 1=cartas, 2=pago

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return productos
      .filter((p) => p.cantidad_stock > 0)
      .filter((p) =>
        !q ||
        p.nombre_jp?.toLowerCase().includes(q) ||
        p.nombre_en?.toLowerCase().includes(q) ||
        p.serie?.toLowerCase().includes(q) ||
        p.numero_carta?.toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [productos, busqueda])

  const agregarProducto = (p) => {
    const existe = items.find((i) => i.producto.id === p.id)
    if (existe) return
    setItems((prev) => [...prev, {
      producto: p,
      cantidad: 1,
      precioVenta: p.precio_venta ? String(p.precio_venta) : '',
    }])
    setBusqueda('')
  }

  const quitarItem = (id) => setItems((prev) => prev.filter((i) => i.producto.id !== id))

  const actualizarItem = (id, campo, valor) => {
    setItems((prev) => prev.map((i) =>
      i.producto.id === id ? { ...i, [campo]: valor } : i
    ))
  }

  // Totales en tiempo real
  const totales = useMemo(() => {
    const comisionPct = METODOS_COBRO.find((m) => m.value === metodoCobro)?.comision || 0
    let totalVenta = 0, totalCosto = 0
    items.forEach((item) => {
      const pv = Number(item.precioVenta) || 0
      const costo = calcularCostoReal(item.producto)
      totalVenta += pv * item.cantidad
      totalCosto += costo * item.cantidad
    })
    const comision = totalVenta * (comisionPct / 100)
    return {
      totalVenta, totalCosto,
      comision, comisionPct,
      ganancia: totalVenta - totalCosto - comision,
      neto: totalVenta - comision,
    }
  }, [items, metodoCobro])

  const handleGuardar = async () => {
    if (items.length === 0) { toast.error('Agrega al menos una carta'); return }
    const sinPrecio = items.find((i) => !i.precioVenta || Number(i.precioVenta) <= 0)
    if (sinPrecio) { toast.error(`Falta el precio de venta de "${sinPrecio.producto.nombre_jp || sinPrecio.producto.nombre_en}"`); return }

    try {
      await registrar.mutateAsync({
        items, clienteId, fecha, metodoCobro, cuentaId, nota, cuentas,
      })
      toast.success('Venta registrada ✅')
      setItems([]); setClienteId(''); setCuentaId(''); setNota(''); setPaso(1)
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const clienteOpts = [
    { value: '', label: 'Sin cliente específico' },
    ...clientes.map((c) => ({
      value: c.id,
      label: `${getNivelCliente(c.nivel).emoji} ${c.nombre}${c.telefono ? ` · ${c.telefono}` : ''}`,
    })),
  ]

  const cuentaOpts = [
    { value: '', label: 'No registrar en cuenta' },
    ...cuentas.map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` })),
  ]

  return (
    <Modal open={open} onClose={onClose} title="Nueva venta">
      {/* Tabs de paso */}
      <div className="flex bg-surface-700 rounded-xl p-1 mb-4">
        {[['1','🃏 Cartas'],['2','💳 Pago']].map(([p, label]) => (
          <button key={p} onClick={() => setPaso(Number(p))}
            className={cn('flex-1 py-2 text-xs font-medium rounded-lg transition-all',
              paso === Number(p) ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
            )}>{label}</button>
        ))}
      </div>

      {paso === 1 && (
        <>
          {/* Buscador de productos */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar carta por nombre, serie, número..."
              className="input pl-9 text-sm"
            />
          </div>

          {/* Resultados de búsqueda */}
          {busqueda.length > 0 && (
            <div className="bg-surface-700 rounded-xl mb-3 max-h-48 overflow-y-auto">
              {productosFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 p-3 text-center">Sin resultados</p>
              ) : productosFiltrados.map((p) => (
                <button key={p.id} onClick={() => agregarProducto(p)}
                  className="w-full flex items-center gap-2.5 p-2.5 hover:bg-surface-600 text-left border-b border-white/[0.05] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{p.nombre_jp || p.nombre_en}</p>
                    <p className="text-[10px] text-gray-400">{p.serie} {p.numero_carta && `· #${p.numero_carta}`} · Stock: {p.cantidad_stock}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{fmt(calcularCostoReal(p))} costo</p>
                  <Plus size={14} className="text-[var(--accent)] flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Items agregados */}
          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              Busca y agrega las cartas que se vendieron
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {items.map((item) => {
                const costo = calcularCostoReal(item.producto)
                const ganancia = (Number(item.precioVenta) || 0) - costo
                return (
                  <div key={item.producto.id} className="card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {item.producto.nombre_jp || item.producto.nombre_en}
                        </p>
                        <p className="text-[10px] text-gray-400">Costo: {fmt(costo)}</p>
                      </div>
                      <button onClick={() => quitarItem(item.producto.id)}
                        className="text-gray-500 hover:text-bad flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Cant.</label>
                        <input type="number" min="1" max={item.producto.cantidad_stock}
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(item.producto.id, 'cantidad', Number(e.target.value))}
                          className="input text-center text-sm py-1.5" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-400 block mb-1">Precio venta c/u</label>
                        <input type="number" placeholder="0.00"
                          value={item.precioVenta}
                          onChange={(e) => actualizarItem(item.producto.id, 'precioVenta', e.target.value)}
                          className="input text-sm py-1.5" />
                      </div>
                    </div>
                    {item.precioVenta > 0 && (
                      <p className={cn('text-[10px] mt-1 font-medium', ganancia >= 0 ? 'text-ok' : 'text-bad')}>
                        Ganancia: {fmt(ganancia * item.cantidad)} ({ganancia >= 0 ? '+' : ''}{Math.round((ganancia/costo)*100)}%)
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Resumen rápido */}
          {items.length > 0 && (
            <div className="bg-surface-700 rounded-xl p-3 mb-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-400">Total venta</p>
                <p className="text-sm font-bold font-mono text-white">{fmt(totales.totalVenta)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Costo</p>
                <p className="text-sm font-bold font-mono text-bad">{fmt(totales.totalCosto)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Ganancia</p>
                <p className={cn('text-sm font-bold font-mono', totales.ganancia >= 0 ? 'text-ok' : 'text-bad')}>
                  {fmt(totales.ganancia)}
                </p>
              </div>
            </div>
          )}

          <button onClick={() => setPaso(2)} disabled={items.length === 0}
            className="btn-primary w-full py-3 text-sm font-semibold">
            Siguiente — Datos de pago →
          </button>
        </>
      )}

      {paso === 2 && (
        <>
          {/* Resumen */}
          <div className="bg-surface-700 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-400 mb-2">{items.length} carta{items.length > 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400">Total venta</p>
                <p className="text-base font-bold font-mono text-white">{fmt(totales.totalVenta)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Ganancia bruta</p>
                <p className={cn('text-base font-bold font-mono', totales.ganancia >= 0 ? 'text-ok' : 'text-bad')}>
                  {fmt(totales.ganancia)}
                </p>
              </div>
            </div>
          </div>

          <Select label="Cliente" value={clienteId} onChange={setClienteId} options={clienteOpts} />

          <div className="mb-3">
            <label className="label">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
          </div>

          {/* Método de cobro */}
          <div className="mb-3">
            <label className="label">Método de cobro</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_COBRO.map((m) => (
                <button key={m.value} onClick={() => setMetodo(m.value)}
                  className={cn('p-2.5 rounded-xl border text-xs font-medium text-left transition-all',
                    metodoCobro === m.value ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-white' : 'border-white/10 text-gray-400'
                  )}>
                  {m.label}
                  {m.comision > 0 && <span className="text-[10px] text-warn block">{m.comision}% comisión</span>}
                </button>
              ))}
            </div>
            {totales.comisionPct > 0 && (
              <p className="text-[11px] text-warn mt-1.5">
                Comisión {totales.comisionPct}%: -{fmt(totales.comision)} → Recibes {fmt(totales.neto)}
              </p>
            )}
          </div>

          <Select label="Cuenta donde llega el dinero" value={cuentaId} onChange={setCuentaId} options={cuentaOpts} />
          <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Referencia, tracking, etc." />

          <div className="flex gap-2 mt-3">
            <button onClick={() => setPaso(1)} className="btn-ghost flex-1 py-3 text-sm">
              ← Volver
            </button>
            <button onClick={handleGuardar} disabled={registrar.isPending}
              className="btn-primary flex-1 py-3 text-sm font-semibold">
              {registrar.isPending ? <Spinner size="sm" /> : <><Check size={15} /> Registrar venta</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

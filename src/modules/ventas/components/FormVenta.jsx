// src/modules/ventas/components/FormVenta.jsx
import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { AmountInput, Select, Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useClientes } from '@modules/clientes/hooks/useClientes'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useRegistrarVenta, METODOS_COBRO } from '../hooks/useVentas'
import { fmt, cn, today, getNivelCliente } from '@lib/utils'

export default function FormVenta({ open, onClose }) {
  const toast = useToast()
  const { data: clientes = [] }  = useClientes()
  const { data: cuentas = [] }   = useCuentas()
  const registrar = useRegistrarVenta()

  const [items, setItems]           = useState([])       // { id, descripcion, cantidad, precioVenta, costo }
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [nuevoPrecio, setNuevoPrecio]           = useState('')
  const [nuevoCosto, setNuevoCosto]             = useState('')
  const [clienteId, setClienteId]   = useState('')
  const [fecha, setFecha]           = useState(today())
  const [metodoCobro, setMetodo]    = useState('efectivo')
  const [cuentaId, setCuentaId]     = useState('')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [nota, setNota]             = useState('')
  const [paso, setPaso]             = useState(1)        // 1=cartas, 2=pago

  const agregarItem = () => {
    if (!nuevaDescripcion.trim()) { toast.error('Escribe qué vendiste'); return }
    if (!nuevoPrecio || Number(nuevoPrecio) <= 0) { toast.error('Escribe el precio de venta'); return }
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      descripcion: nuevaDescripcion.trim(),
      cantidad: 1,
      precioVenta: nuevoPrecio,
      costo: nuevoCosto || '0',
    }])
    setNuevaDescripcion(''); setNuevoPrecio(''); setNuevoCosto('')
  }

  const quitarItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))

  const actualizarItem = (id, campo, valor) => {
    setItems((prev) => prev.map((i) =>
      i.id === id ? { ...i, [campo]: valor } : i
    ))
  }

  // Totales en tiempo real
  const totales = useMemo(() => {
    const comisionPct = METODOS_COBRO.find((m) => m.value === metodoCobro)?.comision || 0
    let totalVenta = 0, totalCosto = 0
    items.forEach((item) => {
      const pv = Number(item.precioVenta) || 0
      const costo = Number(item.costo) || 0
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

  // Al entrar al paso de pago, sugerir el monto recibido = total (pago completo)
  useEffect(() => {
    if (paso === 2) setMontoRecibido(String(totales.totalVenta))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso])

  const recibido  = cuentaId ? Math.min(Number(montoRecibido) || 0, totales.totalVenta) : 0
  const pendiente = Math.max(0, totales.totalVenta - recibido)

  const handleGuardar = async () => {
    if (items.length === 0) { toast.error('Agrega al menos una línea de venta'); return }
    const incompleto = items.find((i) => !i.descripcion || !i.precioVenta || Number(i.precioVenta) <= 0)
    if (incompleto) { toast.error(`Falta el precio de venta de "${incompleto.descripcion}"`); return }
    // Todo el dinero de la venta debe quedar rastreado: o entra a una cuenta,
    // o queda como adeudo de un cliente. Antes una venta sin cuenta y sin
    // cliente se registraba sin dejar rastro de a dónde fue el dinero.
    if (pendiente > 0 && !clienteId) {
      toast.error(cuentaId
        ? 'Selecciona un cliente para registrar el saldo pendiente como adeudo'
        : 'Sin cuenta destino la venta queda como adeudo: selecciona un cliente, o una cuenta si ya te pagaron')
      return
    }

    try {
      await registrar.mutateAsync({
        items, clienteId, clientes, fecha, metodoCobro, cuentaId, montoRecibido, nota, cuentas,
      })
      toast.success(pendiente > 0 ? 'Venta registrada — con saldo pendiente ✅' : 'Venta registrada ✅')
      setItems([]); setClienteId(''); setCuentaId(''); setMontoRecibido(''); setNota(''); setPaso(1)
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
        {[['1','🃏 Qué vendiste'],['2','💳 Pago']].map(([p, label]) => (
          <button key={p} onClick={() => setPaso(Number(p))}
            className={cn('flex-1 py-2 text-xs font-medium rounded-lg transition-all',
              paso === Number(p) ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
            )}>{label}</button>
        ))}
      </div>

      {paso === 1 && (
        <>
          {/* Agregar línea de venta */}
          <div className="card p-3 mb-3 space-y-2">
            <Input
              label="Qué vendiste" value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
              placeholder="Ej. Charizard PSA 9"
              className="mb-0"
            />
            <div className="grid grid-cols-2 gap-2">
              <AmountInput label="Precio de venta" value={nuevoPrecio} onChange={setNuevoPrecio} className="mb-0" />
              <AmountInput label="Costo" value={nuevoCosto} onChange={setNuevoCosto} className="mb-0" />
            </div>
            <button onClick={agregarItem} className="btn-ghost w-full py-2.5 text-xs font-semibold">
              <Plus size={14} /> Agregar a la venta
            </button>
          </div>

          {/* Items agregados */}
          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              Escribe arriba qué vendiste para empezar
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {items.map((item) => {
                const costo = Number(item.costo) || 0
                const ganancia = (Number(item.precioVenta) || 0) - costo
                return (
                  <div key={item.id} className="card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="flex-1 min-w-0 text-xs font-semibold text-white truncate">
                        {item.descripcion}
                      </p>
                      <button onClick={() => quitarItem(item.id)}
                        className="text-gray-500 hover:text-bad flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Cant.</label>
                        <input type="number" min="1"
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(item.id, 'cantidad', Number(e.target.value) || 1)}
                          className="input text-center text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Precio c/u</label>
                        <input type="number" placeholder="0.00"
                          value={item.precioVenta}
                          onChange={(e) => actualizarItem(item.id, 'precioVenta', e.target.value)}
                          className="input text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Costo c/u</label>
                        <input type="number" placeholder="0.00"
                          value={item.costo}
                          onChange={(e) => actualizarItem(item.id, 'costo', e.target.value)}
                          className="input text-sm py-1.5" />
                      </div>
                    </div>
                    {item.precioVenta > 0 && (
                      <p className={cn('text-[10px] mt-1 font-medium', ganancia >= 0 ? 'text-ok' : 'text-bad')}>
                        Ganancia: {fmt(ganancia * item.cantidad)}
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
            <p className="text-xs text-gray-400 mb-2">{items.length} línea{items.length > 1 ? 's' : ''}</p>
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

          {cuentaId && (
            <>
              <AmountInput
                label="Monto recibido ahora" value={montoRecibido} onChange={setMontoRecibido}
                placeholder="0.00"
              />
              <p className="text-[11px] text-gray-400 -mt-3 mb-4">
                Déjalo igual al total para pago completo, o bájalo si el cliente pagó solo una parte.
              </p>
              {pendiente > 0 && (
                <p className={cn('text-[11px] mb-4 -mt-2', clienteId ? 'text-warn' : 'text-bad')}>
                  {clienteId
                    ? `Pendiente: ${fmt(pendiente)} — se registrará como adeudo en Cobros`
                    : `Pendiente: ${fmt(pendiente)} — selecciona un cliente arriba para poder rastrear este saldo`}
                </p>
              )}
            </>
          )}

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

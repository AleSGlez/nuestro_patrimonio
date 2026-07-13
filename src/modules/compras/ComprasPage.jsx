// src/modules/compras/ComprasPage.jsx
import { useState, useMemo } from 'react'
import { Plus, ChevronRight, Check, Package, ArrowRight } from 'lucide-react'
import { useLotes, useProductosLote, useCrearLote, useAvanzarEstadoLote, ESTADOS_LOTE, METODOS_PAGO_COMPRA } from './hooks/useCompras'
import { useProveedores } from '@modules/inventario/hooks/useInventario'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useToast } from '@ui/Toast'
import { EmptyState, Input, AmountInput, Select } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import ImportarCartasLote from './components/ImportarCartasLote'
import { fmt, cn, today, fmtDate } from '@lib/utils'

function FormLote({ open, onClose }) {
  const toast = useToast()
  const { data: proveedores = [] } = useProveedores()
  const { data: cuentas = [] }     = useCuentas()
  const crear = useCrearLote()

  const [paso, setPaso]             = useState(1)
  const [nombre, setNombre]         = useState('')
  const [tipo, setTipo]             = useState('buyee')
  const [proveedorId, setProveedor] = useState('')
  const [fecha, setFecha]           = useState(today())
  const [fechaEst, setFechaEst]     = useState('')
  const [montoJpy, setMontoJpy]     = useState('')
  const [tipoCambio, setTipoCambio] = useState('')
  const [costoEnvio, setCostoEnvio] = useState('')
  const [costoAduana, setCostoAduana] = useState('')
  const [cuentaId, setCuentaId]     = useState('')
  const [metodoPago, setMetodo]     = useState('transferencia')
  const [estado, setEstado]         = useState('pagado')
  const [notas, setNotas]           = useState('')
  const [productos, setProductos]   = useState([])

  const provOpts = [
    { value: '', label: 'Sin proveedor específico' },
    ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
  ]
  const cuentaOpts = [
    { value: '', label: 'No registrar pago' },
    ...cuentas.map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` })),
  ]

  // Totales calculados
  const montoMXN  = (Number(montoJpy) || 0) * (Number(tipoCambio) || 1)
  const totalMXN  = montoMXN + (Number(costoEnvio) || 0) + (Number(costoAduana) || 0)
  const costoProrr = productos.length > 0 ? ((Number(costoEnvio) || 0) + (Number(costoAduana) || 0)) / productos.length : 0

  const handleGuardar = async () => {
    if (!fecha) { toast.error('Selecciona la fecha'); return }

    try {
      await crear.mutateAsync({
        loteData: {
          nombre: nombre.trim() || `Lote ${fecha}`,
          tipo, proveedor_id: proveedorId || null,
          fecha, fecha_estimada: fechaEst || null,
          monto_total_jpy: Number(montoJpy) || 0,
          tipo_cambio: Number(tipoCambio) || 1,
          costo_envio: Number(costoEnvio) || 0,
          costo_aduana: Number(costoAduana) || 0,
          cuenta_id: cuentaId || null,
          metodo_pago: metodoPago,
          estado, notas: notas.trim() || null,
        },
        productos,
        cuentas,
      })
      toast.success('Compra registrada ✅')
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva compra">
      {/* Paso tabs */}
      <div className="flex bg-surface-700 rounded-xl p-1 mb-4">
        {[['1','📋 Datos'],['2','🃏 Cartas'],['3','💳 Pago']].map(([p, label]) => (
          <button key={p} onClick={() => setPaso(Number(p))}
            className={cn('flex-1 py-1.5 text-xs font-medium rounded-lg transition-all',
              paso === Number(p) ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
            )}>{label}</button>
        ))}
      </div>

      {/* Paso 1 — Datos del lote */}
      {paso === 1 && (
        <>
          {/* Tipo */}
          <div className="flex gap-2 mb-4">
            {[['buyee','🏭 Buyee'],['individual','👤 Individual'],['otro','📦 Otro']].map(([v, label]) => (
              <button key={v} onClick={() => setTipo(v)}
                className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                  tipo === v ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-white/10 text-gray-400'
                )}>{label}</button>
            ))}
          </div>

          <Input label="Nombre del lote (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Lote Buyee julio, Compra XY" />
          <Select label="Proveedor" value={proveedorId} onChange={setProveedor} options={provOpts} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de compra</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Fecha estimada llegada</label>
              <input type="date" value={fechaEst} onChange={(e) => setFechaEst(e.target.value)} className="input" />
            </div>
          </div>

          <div className="mb-3">
            <label className="label">Estado actual</label>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_LOTE.map((e) => (
                <button key={e.value} onClick={() => setEstado(e.value)}
                  className={cn('flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all',
                    estado === e.value ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-white' : 'border-white/10 text-gray-400'
                  )}>
                  <span>{e.emoji}</span>{e.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Número de pedido Buyee, tracking, etc." />

          <button onClick={() => setPaso(2)} className="btn-primary w-full py-3 text-sm font-semibold">
            Siguiente — Cartas →
          </button>
        </>
      )}

      {/* Paso 2 — Importar cartas */}
      {paso === 2 && (
        <>
          <ImportarCartasLote
            onProductos={setProductos}
            productosActuales={productos}
          />

          {/* Resumen costos */}
          {productos.length > 0 && (
            <div className="mt-3 p-3 bg-surface-700 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-white">{productos.length} cartas · Costo prorrateado: {fmt(costoProrr)} c/u</p>
              <p className="text-gray-400">Suma de todos los precios: {fmt(productos.reduce((s, p) => s + (Number(p.precio_unitario_compra) || 0) * (Number(p.cantidad_compra) || 1), 0))}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-500 mt-2 mb-3">
            {productos.length === 0 ? 'Puedes continuar sin cartas y agregarlas después desde Inventario.' : `Las ${productos.length} cartas quedarán en estado "${estado === 'recibido' ? 'disponible' : 'en tránsito'}" en el inventario.`}
          </p>

          <div className="flex gap-2">
            <button onClick={() => setPaso(1)} className="btn-ghost flex-1 py-3 text-sm">← Atrás</button>
            <button onClick={() => setPaso(3)} className="btn-primary flex-1 py-3 text-sm font-semibold">Siguiente →</button>
          </div>
        </>
      )}

      {/* Paso 3 — Pago */}
      {paso === 3 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <AmountInput label={tipo === 'buyee' ? 'Monto en JPY' : 'Monto'} value={montoJpy}
              onChange={setMontoJpy} placeholder="0" className="mb-0" />
            {tipo === 'buyee' && (
              <AmountInput label="Tipo de cambio (MXN/JPY)" value={tipoCambio}
                onChange={setTipoCambio} placeholder="0.12" className="mb-0" />
            )}
          </div>

          {tipo === 'buyee' && montoJpy && tipoCambio && (
            <p className="text-xs text-gray-400 mt-1 mb-3">
              = {fmt(montoMXN)} MXN en cartas
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <AmountInput label="Costo de envío (MXN)" value={costoEnvio}
              onChange={setCostoEnvio} placeholder="0.00" className="mb-0" />
            <AmountInput label="Costo de aduana (MXN)" value={costoAduana}
              onChange={setCostoAduana} placeholder="0.00" className="mb-0" />
          </div>

          {totalMXN > 0 && (
            <div className="mt-3 p-3 bg-surface-700 rounded-xl grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-500">Cartas</p>
                <p className="text-sm font-bold font-mono text-white">{fmt(montoMXN)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Envío+Aduana</p>
                <p className="text-sm font-bold font-mono text-bad">{fmt((Number(costoEnvio)||0)+(Number(costoAduana)||0))}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Total</p>
                <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(totalMXN)}</p>
              </div>
            </div>
          )}

          <Select label="Método de pago" value={metodoPago} onChange={setMetodo}
            options={METODOS_PAGO_COMPRA} className="mt-3" />
          <Select label="Cuenta donde sale el dinero" value={cuentaId} onChange={setCuentaId}
            options={cuentaOpts} />

          <div className="flex gap-2 mt-2">
            <button onClick={() => setPaso(2)} className="btn-ghost flex-1 py-3 text-sm">← Atrás</button>
            <button onClick={handleGuardar} disabled={crear.isPending}
              className="btn-primary flex-1 py-3 text-sm font-semibold">
              {crear.isPending ? <Spinner size="sm" /> : <><Check size={15} /> Registrar compra</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ── Card de estado del lote ───────────────────────────────────
function LoteCard({ lote, onClick }) {
  const estadoInfo = ESTADOS_LOTE.find((e) => e.value === lote.estado) || ESTADOS_LOTE[0]
  const totalMXN = (Number(lote.monto_total_jpy || 0) * Number(lote.tipo_cambio || 1))
    + Number(lote.costo_envio || 0) + Number(lote.costo_aduana || 0)

  return (
    <button onClick={onClick} className="card p-4 w-full text-left active:scale-[0.98] transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-white">{lote.nombre}</p>
          <p className="text-[11px] text-gray-500">{fmtDate(lote.fecha)}</p>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full font-medium flex-shrink-0"
          style={{ backgroundColor: `${estadoInfo.color}20`, color: estadoInfo.color }}>
          {estadoInfo.emoji} {estadoInfo.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-base font-bold font-mono text-white">{fmt(totalMXN)}</p>
        <ChevronRight size={16} className="text-gray-500" />
      </div>
    </button>
  )
}

// ── Detalle del lote ─────────────────────────────────────────
function DetalleLote({ lote, onClose }) {
  const toast = useToast()
  const { data: productos = [] } = useProductosLote(lote?.id)
  const avanzar = useAvanzarEstadoLote()

  if (!lote) return null

  const estadoActualIdx = ESTADOS_LOTE.findIndex((e) => e.value === lote.estado)
  const siguienteEstado = ESTADOS_LOTE[estadoActualIdx + 1]
  const totalMXN = (Number(lote.monto_total_jpy || 0) * Number(lote.tipo_cambio || 1))
    + Number(lote.costo_envio || 0) + Number(lote.costo_aduana || 0)

  const handleAvanzar = async () => {
    if (!siguienteEstado) return
    try {
      await avanzar.mutateAsync({ loteId: lote.id, nuevoEstado: siguienteEstado.value })
      toast.success(`Estado actualizado: ${siguienteEstado.label}${siguienteEstado.value === 'recibido' ? ' — cartas disponibles en inventario ✅' : ''}`)
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-surface-800 rounded-t-3xl p-5 border-t border-white/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        <p className="text-base font-bold text-white mb-1">{lote.nombre}</p>
        <p className="text-xs text-gray-500 mb-4">{fmtDate(lote.fecha)}</p>

        {/* Timeline de estados */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {ESTADOS_LOTE.map((e, i) => {
            const completado = ESTADOS_LOTE.findIndex((s) => s.value === lote.estado) >= i
            return (
              <div key={e.value} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn('flex flex-col items-center gap-1')}>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm',
                    completado ? 'text-white' : 'bg-surface-700 text-gray-500'
                  )} style={completado ? { backgroundColor: e.color } : {}}>
                    {e.emoji}
                  </div>
                  <p className={cn('text-[9px] text-center w-12', completado ? 'text-white' : 'text-gray-500')}>
                    {e.label.split(' ')[0]}
                  </p>
                </div>
                {i < ESTADOS_LOTE.length - 1 && (
                  <div className={cn('h-0.5 w-4 mb-4 flex-shrink-0', completado ? 'bg-ok' : 'bg-surface-600')} />
                )}
              </div>
            )
          })}
        </div>

        {/* Costos */}
        <div className="bg-surface-700 rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-500">Cartas</p>
            <p className="text-sm font-bold font-mono text-white">
              {fmt(Number(lote.monto_total_jpy || 0) * Number(lote.tipo_cambio || 1))}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Envío+Aduana</p>
            <p className="text-sm font-bold font-mono text-bad">
              {fmt(Number(lote.costo_envio || 0) + Number(lote.costo_aduana || 0))}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Total</p>
            <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(totalMXN)}</p>
          </div>
        </div>

        {/* Cartas del lote */}
        <p className="section-label mb-2">{productos.length} cartas en este lote</p>
        <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2.5 bg-surface-700 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{p.nombre_jp || p.nombre_en}</p>
                <p className="text-[10px] text-gray-500">{p.serie} · x{p.cantidad_stock}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-gray-300">{fmt(p.precio_unitario_compra)}</p>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full',
                  p.estado === 'disponible' ? 'bg-ok/10 text-ok' :
                  p.estado === 'en_transito' ? 'bg-warn/10 text-warn' : 'bg-surface-600 text-gray-400'
                )}>{p.estado}</span>
              </div>
            </div>
          ))}
          {productos.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-3">Sin cartas registradas en este lote</p>
          )}
        </div>

        {/* Botón avanzar estado */}
        {siguienteEstado && (
          <button onClick={handleAvanzar} disabled={avanzar.isPending}
            className="btn-primary w-full py-3 text-sm font-semibold mb-2 flex items-center justify-center gap-2">
            {avanzar.isPending ? <Spinner size="sm" /> : (
              <><ArrowRight size={15} /> Marcar como: {siguienteEstado.emoji} {siguienteEstado.label}</>
            )}
          </button>
        )}

        <button onClick={onClose} className="btn-ghost w-full py-2.5 text-sm">Cerrar</button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function ComprasPage() {
  const { data: lotes = [], isPending } = useLotes()
  const [formOpen, setFormOpen]         = useState(false)
  const [detalleLote, setDetalleLote]   = useState(null)

  const enTransito  = lotes.filter((l) => l.estado !== 'recibido')
  const recibidos   = lotes.filter((l) => l.estado === 'recibido')

  return (
    <>
      <div className="top-header">
        <div className="flex gap-3">
          <div className="bg-warn/10 border border-warn/20 rounded-xl px-4 py-2.5 text-center">
            <p className="text-[10px] text-gray-400">En tránsito</p>
            <p className="text-lg font-bold text-warn">{enTransito.length}</p>
          </div>
          <div className="bg-ok/10 border border-ok/20 rounded-xl px-4 py-2.5 text-center">
            <p className="text-[10px] text-gray-400">Recibidos</p>
            <p className="text-lg font-bold text-ok">{recibidos.length}</p>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        ) : lotes.length === 0 ? (
          <EmptyState emoji="🛒" title="Sin compras registradas"
            description="Registra tus lotes de Buyee o compras individuales" />
        ) : (
          <div className="space-y-4">
            {enTransito.length > 0 && (
              <div>
                <p className="section-label mb-2">🚚 En tránsito</p>
                <div className="space-y-2">
                  {enTransito.map((l) => (
                    <LoteCard key={l.id} lote={l} onClick={() => setDetalleLote(l)} />
                  ))}
                </div>
              </div>
            )}
            {recibidos.length > 0 && (
              <div>
                <p className="section-label mb-2">✅ Recibidos</p>
                <div className="space-y-2">
                  {recibidos.map((l) => (
                    <LoteCard key={l.id} lote={l} onClick={() => setDetalleLote(l)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={() => setFormOpen(true)} className="fab"><Plus size={24} /></button>

      <FormLote open={formOpen} onClose={() => setFormOpen(false)} />
      {detalleLote && <DetalleLote lote={detalleLote} onClose={() => setDetalleLote(null)} />}
    </>
  )
}

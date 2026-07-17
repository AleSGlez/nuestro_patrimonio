// src/modules/inventario/components/FormLote.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearLote, useActualizarLote, useProrratearLote, useProductos } from '../hooks/useInventario'
import { useProveedores } from '../hooks/useInventario'
import { today } from '@lib/utils'

const ESTADOS = [
  { value: 'pendiente',    label: '⏳ Pendiente' },
  { value: 'en_transito', label: '✈️ En tránsito' },
  { value: 'recibido',    label: '✅ Recibido' },
  { value: 'cancelado',   label: '❌ Cancelado' },
]

const MONEDAS = [
  { value: 'MXN', label: '🇲🇽 MXN' },
  { value: 'JPY', label: '🇯🇵 JPY' },
  { value: 'USD', label: '🇺🇸 USD' },
]

export default function FormLote({ open, onClose, lote = null }) {
  const toast = useToast()
  const { data: proveedores = [] } = useProveedores()
  const crear = useCrearLote()
  const actualizar = useActualizarLote()
  const prorratear = useProrratearLote()
  const isEdit = Boolean(lote)
  const loading = crear.isPending || actualizar.isPending

  // Para prorratear al editar costos de un lote existente
  const { data: productosDelLote = [] } = useProductos({ loteId: lote?.id })

  const [nombre, setNombre]           = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fechaCompra, setFechaCompra] = useState(today())
  const [fechaLlegada, setFechaLlegada] = useState('')
  const [costoEnvio, setCostoEnvio]   = useState('')
  const [costoAduanas, setCostoAduanas] = useState('')
  const [costoOtros, setCostoOtros]   = useState('')
  const [tipoCambio, setTipoCambio]   = useState('1')
  const [moneda, setMoneda]           = useState('MXN')
  const [estado, setEstado]           = useState('pendiente')
  const [nota, setNota]               = useState('')

  useEffect(() => {
    if (!open) return
    if (lote) {
      setNombre(lote.nombre); setProveedorId(lote.proveedor_id || '')
      setFechaCompra(lote.fecha_compra); setFechaLlegada(lote.fecha_llegada || '')
      setCostoEnvio(String(lote.costo_envio)); setCostoAduanas(String(lote.costo_aduanas))
      setCostoOtros(String(lote.costo_otros)); setTipoCambio(String(lote.tipo_cambio || 1))
      setMoneda(lote.moneda_origen || 'MXN'); setEstado(lote.estado); setNota(lote.nota || '')
    } else {
      setNombre(''); setProveedorId(''); setFechaCompra(today()); setFechaLlegada('')
      setCostoEnvio(''); setCostoAduanas(''); setCostoOtros(''); setTipoCambio('1')
      setMoneda('MXN'); setEstado('pendiente'); setNota('')
    }
  }, [open, lote])

  const totalCostos = (Number(costoEnvio) || 0) + (Number(costoAduanas) || 0) + (Number(costoOtros) || 0)

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre del lote'); return }
    const payload = {
      nombre: nombre.trim(),
      proveedor_id: proveedorId || null,
      fecha_compra: fechaCompra,
      fecha_llegada: fechaLlegada || null,
      costo_envio: Number(costoEnvio) || 0,
      costo_aduanas: Number(costoAduanas) || 0,
      costo_otros: Number(costoOtros) || 0,
      tipo_cambio: Number(tipoCambio) || 1,
      moneda_origen: moneda,
      estado, nota: nota.trim() || null,
    }
    try {
      if (isEdit) {
        const [updated] = await actualizar.mutateAsync({ id: lote.id, data: payload })
        // Re-prorratear si hay productos en el lote
        if (productosDelLote.length > 0) {
          await prorratear.mutateAsync({ lote: payload, productos: productosDelLote })
        }
        toast.success('Lote actualizado y costos prorrateados')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Lote creado')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const proveedorOpts = [
    { value: '', label: 'Sin proveedor específico' },
    ...proveedores.map((p) => ({ value: p.id, label: `${p.nombre} (${p.plataforma})` })),
  ]

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar lote' : 'Nuevo lote de compra'}>
      <Input label="Nombre del lote" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Buyee Lote Mayo 2026" autoFocus />

      <Select label="Proveedor" value={proveedorId} onChange={setProveedorId} options={proveedorOpts} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Fecha de compra</label>
          <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Fecha de llegada</label>
          <input type="date" value={fechaLlegada} onChange={(e) => setFechaLlegada(e.target.value)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Select label="Moneda" value={moneda} onChange={setMoneda} options={MONEDAS} className="mb-0" />
        {moneda !== 'MXN' && (
          <AmountInput label="Tipo de cambio" value={tipoCambio} onChange={setTipoCambio} placeholder="18.50" className="mb-0" />
        )}
      </div>

      <p className="section-label mt-4 mb-2">Costos del lote (en MXN)</p>
      <div className="grid grid-cols-3 gap-2">
        <AmountInput label="Envío" value={costoEnvio} onChange={setCostoEnvio} placeholder="0.00" className="mb-0" />
        <AmountInput label="Aduanas" value={costoAduanas} onChange={setCostoAduanas} placeholder="0.00" className="mb-0" />
        <AmountInput label="Otros" value={costoOtros} onChange={setCostoOtros} placeholder="0.00" className="mb-0" />
      </div>
      {totalCostos > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Total costos extra: <span className="text-white font-medium">${totalCostos.toLocaleString('es-MX')}</span>
          {' '}— se prorrateará entre las cartas del lote
        </p>
      )}

      <Select label="Estado" value={estado} onChange={setEstado} options={ESTADOS} className="mt-3" />
      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia de orden, etc." />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar y prorratear' : 'Crear lote'}</>}
      </button>
    </Modal>
  )
}

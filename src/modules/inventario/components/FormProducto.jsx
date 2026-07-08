// src/modules/inventario/components/FormProducto.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearProducto, useActualizarProducto, calcularCostoReal, calcularMargen } from '../hooks/useInventario'
import { fmt } from '@lib/utils'

const IDIOMAS = [
  { value: 'JP', label: '🇯🇵 Japonés (JP)' },
  { value: 'EN', label: '🇺🇸 Inglés (EN)' },
  { value: 'ambos', label: '🌐 Ambos' },
]

const CONDICIONES = [
  { value: 'mint',       label: '✨ Mint' },
  { value: 'near_mint',  label: '👍 Near Mint' },
  { value: 'played',     label: '⚠️ Played' },
  { value: 'damaged',    label: '❌ Damaged' },
]

export default function FormProducto({ open, onClose, producto = null, loteId = null }) {
  const toast = useToast()
  const crear = useCrearProducto()
  const actualizar = useActualizarProducto()
  const isEdit = Boolean(producto)
  const loading = crear.isPending || actualizar.isPending

  const [nombreJp, setNombreJp]       = useState('')
  const [nombreEn, setNombreEn]       = useState('')
  const [serie, setSerie]             = useState('')
  const [numeroCarta, setNumero]      = useState('')
  const [idioma, setIdioma]           = useState('JP')
  const [condicion, setCondicion]     = useState('mint')
  const [cantidad, setCantidad]       = useState('1')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [nota, setNota]               = useState('')

  useEffect(() => {
    if (!open) return
    if (producto) {
      setNombreJp(producto.nombre_jp || ''); setNombreEn(producto.nombre_en || '')
      setSerie(producto.serie || ''); setNumero(producto.numero_carta || '')
      setIdioma(producto.idioma); setCondicion(producto.condicion)
      setCantidad(String(producto.cantidad_compra))
      setPrecioCompra(String(producto.precio_unitario_compra))
      setPrecioVenta(producto.precio_venta ? String(producto.precio_venta) : '')
      setNota(producto.nota || '')
    } else {
      setNombreJp(''); setNombreEn(''); setSerie(''); setNumero('')
      setIdioma('JP'); setCondicion('mint'); setCantidad('1')
      setPrecioCompra(''); setPrecioVenta(''); setNota('')
    }
  }, [open, producto])

  // Preview de margen
  const previewProducto = producto
    ? { ...producto, precio_unitario_compra: precioCompra, precio_venta: precioVenta }
    : { precio_unitario_compra: precioCompra, costo_extra_prorrateado: 0, precio_venta: precioVenta }
  const margen = precioVenta && precioCompra ? calcularMargen(previewProducto) : null

  const handleSave = async () => {
    if (!nombreJp && !nombreEn) { toast.error('Ingresa al menos el nombre JP o EN'); return }
    if (!precioCompra || Number(precioCompra) < 0) { toast.error('Ingresa el precio de compra'); return }

    const payload = {
      nombre_jp: nombreJp.trim() || null,
      nombre_en: nombreEn.trim() || null,
      serie: serie.trim() || null,
      numero_carta: numeroCarta.trim() || null,
      idioma, condicion,
      cantidad_compra: Number(cantidad) || 1,
      precio_unitario_compra: Number(precioCompra) || 0,
      precio_venta: precioVenta ? Number(precioVenta) : null,
      nota: nota.trim() || null,
      lote_id: loteId || producto?.lote_id || null,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: producto.id, data: payload })
        toast.success('Carta actualizada')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Carta agregada al inventario')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const nombreDisplay = nombreJp || nombreEn || 'Carta'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Editar: ${nombreDisplay}` : 'Agregar carta'}>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Idioma" value={idioma} onChange={setIdioma} options={IDIOMAS} className="mb-0" />
        <Select label="Condición" value={condicion} onChange={setCondicion} options={CONDICIONES} className="mb-0" />
      </div>

      <Input label="Nombre JP" value={nombreJp} onChange={(e) => setNombreJp(e.target.value)}
        placeholder="ピカチュウ" className="mt-3" />
      <Input label="Nombre EN" value={nombreEn} onChange={(e) => setNombreEn(e.target.value)}
        placeholder="Pikachu" />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Serie" value={serie} onChange={(e) => setSerie(e.target.value)}
          placeholder="Ej: Scarlet & Violet" className="mb-0" />
        <Input label="Número" value={numeroCarta} onChange={(e) => setNumero(e.target.value)}
          placeholder="025/198" className="mb-0" />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="col-span-1">
          <label className="label">Cantidad</label>
          <input
            type="number" min="1" value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="input text-center"
          />
        </div>
        <AmountInput label="Precio compra c/u" value={precioCompra} onChange={setPrecioCompra}
          placeholder="0.00" className="mb-0 col-span-1" />
        <AmountInput label="Precio venta" value={precioVenta} onChange={setPrecioVenta}
          placeholder="0.00" className="mb-0 col-span-1" />
      </div>

      {margen && (
        <div className={`mt-2 p-3 rounded-xl text-sm ${margen.margen >= 0 ? 'bg-ok/10 border border-ok/20' : 'bg-bad/10 border border-bad/20'}`}>
          <p className={margen.margen >= 0 ? 'text-ok' : 'text-bad'}>
            Margen: {fmt(margen.margen)} ({Math.round(margen.pct)}%)
            {margen.margen >= 0 ? ' 📈' : ' 📉'}
          </p>
        </div>
      )}

      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)}
        placeholder="Referencia, condición especial, etc." />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Agregar carta'}</>}
      </button>
    </Modal>
  )
}

// src/modules/clientes/components/FormCargoCliente.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useVentasCliente, useRegistrarMovimientoCliente } from '../hooks/useClientes'
import { today, fmt, fmtDate } from '@lib/utils'

export default function FormCargoCliente({ open, onClose, clientes = [] }) {
  const toast = useToast()
  const registrar = useRegistrarMovimientoCliente()

  const [clienteId, setClienteId]     = useState('')
  const [monto, setMonto]             = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha]             = useState(today())
  const [ventaId, setVentaId]         = useState('')

  const { data: ventasCliente = [] } = useVentasCliente(clienteId)

  useEffect(() => {
    if (!open) return
    setClienteId(''); setMonto(''); setDescripcion(''); setFecha(today()); setVentaId('')
  }, [open])

  const clienteOpts = clientes.map((c) => ({ value: c.id, label: c.nombre }))
  const ventaOpts = ventasCliente.map((v) => ({
    value: v.id, label: `${fmtDate(v.fecha)} — ${fmt(v.total_venta)}`,
  }))

  const handleSave = async () => {
    if (!clienteId) { toast.error('Selecciona un cliente'); return }
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa un monto válido'); return }

    const cliente = clientes.find((c) => c.id === clienteId)
    try {
      await registrar.mutateAsync({
        cliente, tipo: 'cargo', monto: Number(monto),
        descripcion: descripcion.trim() || null, fecha,
        ventaId: ventaId || null,
      })
      toast.success('Cargo registrado')
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo cargo">
      {clientes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Agrega primero un cliente en la pestaña Clientes.
        </p>
      ) : (
        <>
          <Select
            label="Cliente" value={clienteId} onChange={setClienteId}
            options={clienteOpts} placeholder="Selecciona cliente"
          />
          <AmountInput label="Monto del adeudo" value={monto} onChange={setMonto} placeholder="0.00" />
          {clienteId && ventaOpts.length > 0 && (
            <Select
              label="Venta relacionada (opcional)" value={ventaId} onChange={setVentaId}
              options={ventaOpts} placeholder="Sin relacionar a una venta"
            />
          )}
          <Input
            label="Descripción (opcional)" value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Charizard VMAX Alt Art"
          />
          <div className="mb-5">
            <label className="label">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
          </div>
          <button
            onClick={handleSave} disabled={registrar.isPending}
            className="btn-primary w-full py-3.5 text-sm font-semibold"
          >
            {registrar.isPending ? <Spinner size="sm" /> : <><Check size={16} />Registrar cargo</>}
          </button>
        </>
      )}
    </Modal>
  )
}

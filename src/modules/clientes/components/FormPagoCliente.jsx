// src/modules/clientes/components/FormPagoCliente.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useRegistrarMovimientoCliente } from '../hooks/useClientes'
import { today, fmt } from '@lib/utils'

export default function FormPagoCliente({ open, onClose, cliente }) {
  const toast = useToast()
  const { data: cuentas = [] } = useCuentas()
  const registrar = useRegistrarMovimientoCliente()

  const [monto, setMonto]             = useState('')
  const [cuentaId, setCuentaId]       = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha]             = useState(today())

  useEffect(() => {
    if (!open || !cliente) return
    setMonto(String(cliente.saldo_pendiente))
    setCuentaId(''); setDescripcion(''); setFecha(today())
  }, [open, cliente])

  if (!cliente) return null

  const cuentaOpts = cuentas.map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` }))

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (!cuentaId) { toast.error('Selecciona a qué cuenta entra el dinero'); return }

    try {
      await registrar.mutateAsync({
        cliente, tipo: 'pago', monto: Number(monto),
        descripcion: descripcion.trim() || null, fecha, cuentaId, cuentas,
      })
      toast.success(Number(monto) >= Number(cliente.saldo_pendiente) ? 'Adeudo liquidado ✅' : 'Pago parcial registrado')
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Registrar pago — ${cliente.nombre}`}>
      <div className="card p-4 mb-4 text-center">
        <p className="text-xs text-gray-400 mb-1">Debe actualmente</p>
        <p className="text-2xl font-bold font-mono text-bad">{fmt(cliente.saldo_pendiente)}</p>
      </div>

      <AmountInput label="Monto del pago" value={monto} onChange={setMonto} placeholder="0.00" />
      <p className="text-xs text-gray-400 -mt-3 mb-4">
        Déjalo igual al saldo para liquidar todo, o bájalo para un pago parcial.
      </p>

      <Select
        label="Cuenta destino" value={cuentaId} onChange={setCuentaId}
        options={cuentaOpts} placeholder="¿A dónde entra el dinero?"
      />
      <Input
        label="Descripción (opcional)" value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Nota del pago"
      />
      <div className="mb-5">
        <label className="label">Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
      </div>

      <button
        onClick={handleSave} disabled={registrar.isPending}
        className="btn w-full py-3.5 text-sm font-semibold bg-ok hover:brightness-110 text-white"
      >
        {registrar.isPending ? <Spinner size="sm" /> : <><Check size={16} />Registrar pago</>}
      </button>
    </Modal>
  )
}

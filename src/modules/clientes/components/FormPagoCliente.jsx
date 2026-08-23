// src/modules/clientes/components/FormPagoCliente.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { useRegistrarMovimientoCliente, useCargosPendientesCliente } from '../hooks/useClientes'
import { today, fmt, opcionesApartadosNegocio, TIPO_EMOJI_CUENTA } from '@lib/utils'

const PAGO_GENERAL = '__general__'

export default function FormPagoCliente({ open, onClose, cliente }) {
  const toast = useToast()
  const { data: cuentas = [] } = useCuentas()
  const { data: todosApartados = [] } = useTodosLosApartados()
  const { data: cargosPendientes = [] } = useCargosPendientesCliente(cliente?.id)
  const registrar = useRegistrarMovimientoCliente()

  const [aplicaA, setAplicaA]         = useState(PAGO_GENERAL)
  const [monto, setMonto]             = useState('')
  const [metodoValor, setMetodoValor] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha]             = useState(today())

  useEffect(() => {
    if (!open || !cliente) return
    setAplicaA(PAGO_GENERAL)
    setMonto(String(cliente.saldo_pendiente))
    setMetodoValor(''); setDescripcion(''); setFecha(today())
  }, [open, cliente])

  if (!cliente) return null

  const cargoSeleccionado = cargosPendientes.find((c) => c.id === aplicaA) || null

  // Cargos con saldo propio > 0 que se pueden cobrar por separado — permite
  // "debe por 2 cosas, paga solo la cosa 1" sin tocar el resto del adeudo.
  const aplicaOpts = [
    { value: PAGO_GENERAL, label: 'Pago general (todo el saldo)' },
    ...cargosPendientes.map((c) => ({
      value: c.id,
      label: `${c.descripcion || 'Cargo'} — restante ${fmt(c.saldo_restante)}`,
    })),
  ]

  const handleAplicaChange = (value) => {
    setAplicaA(value)
    const cargo = cargosPendientes.find((c) => c.id === value)
    setMonto(String(cargo ? cargo.saldo_restante : cliente.saldo_pendiente))
  }

  // Destino del dinero: cuenta directa o apartado de negocio (mismo patrón
  // que FormTransaccion — "apartado:UUID:cuentaUUID" via opcionesApartadosNegocio).
  const cuentaOpts = cuentas.map((c) => ({
    value: `cuenta:${c.id}`,
    label: `${TIPO_EMOJI_CUENTA[c.tipo] || '💳'} ${c.nombre} — ${fmt(c.saldo)}`,
  }))
  const metodoOpts = [...cuentaOpts, ...opcionesApartadosNegocio(todosApartados)]

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (!metodoValor) { toast.error('Selecciona a dónde entra el dinero'); return }
    if (cargoSeleccionado && Number(monto) > Number(cargoSeleccionado.saldo_restante)) {
      toast.error('El monto no puede ser mayor al restante de ese cargo'); return
    }

    try {
      await registrar.mutateAsync({
        cliente, tipo: 'pago', monto: Number(monto),
        descripcion: descripcion.trim() || null, fecha,
        metodoPago: metodoValor,
        cargoId: cargoSeleccionado ? cargoSeleccionado.id : null,
        cuentas,
      })
      const liquidado = cargoSeleccionado
        ? Number(monto) >= Number(cargoSeleccionado.saldo_restante)
        : Number(monto) >= Number(cliente.saldo_pendiente)
      toast.success(liquidado ? (cargoSeleccionado ? 'Cargo liquidado ✅' : 'Adeudo liquidado ✅') : 'Pago parcial registrado')
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

      {cargosPendientes.length > 0 && (
        <Select
          label="¿A qué aplica este pago?" value={aplicaA} onChange={handleAplicaChange}
          options={aplicaOpts}
        />
      )}

      <AmountInput label="Monto del pago" value={monto} onChange={setMonto} placeholder="0.00" />
      <p className="text-xs text-gray-400 -mt-3 mb-4">
        {cargoSeleccionado
          ? 'Déjalo igual al restante para liquidar este cargo, o bájalo para un pago parcial.'
          : 'Déjalo igual al saldo para liquidar todo, o bájalo para un pago parcial.'}
      </p>

      <Select
        label="¿A dónde entra el dinero?" value={metodoValor} onChange={setMetodoValor}
        options={metodoOpts} placeholder="Cuenta o apartado de negocio"
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

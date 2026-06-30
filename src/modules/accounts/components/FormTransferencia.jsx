// src/modules/accounts/components/FormTransferencia.jsx
import { useState } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { AmountInput, Select, Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCuentas } from '../hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useTransferirEntreCuentas, usePagarTarjeta, useTransferirPersonalNegocio } from '../hooks/useTransferencias'
import { fmt, today, cn } from '@lib/utils'

const TIPOS = [
  { id: 'entre_cuentas',       label: 'Entre cuentas' },
  { id: 'pago_tarjeta',        label: 'Pagar tarjeta' },
  { id: 'personal_a_negocio',  label: 'Personal → Negocio' },
  { id: 'negocio_a_personal',  label: 'Negocio → Personal' },
]

export default function FormTransferencia({ open, onClose }) {
  const toast = useToast()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const transferir = useTransferirEntreCuentas()
  const pagarTarjeta = usePagarTarjeta()
  const transferirPN = useTransferirPersonalNegocio()

  const [tipo, setTipo]           = useState('entre_cuentas')
  const [origenId, setOrigenId]   = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [monto, setMonto]         = useState('')
  const [descripcion, setDesc]    = useState('')
  const [fecha, setFecha]         = useState(today())

  const loading = transferir.isPending || pagarTarjeta.isPending || transferirPN.isPending

  const cuentasPersonal = cuentas.filter((c) => c.persona !== 'negocio')
  const cuentasNegocio  = cuentas.filter((c) => c.persona === 'negocio')

  const origenOpts = (tipo === 'personal_a_negocio' ? cuentasPersonal
    : tipo === 'negocio_a_personal' ? cuentasNegocio
    : cuentas
  ).map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` }))

  const destinoOpts = tipo === 'personal_a_negocio' ? cuentasNegocio
    : tipo === 'negocio_a_personal' ? cuentasPersonal
    : cuentas.filter((c) => c.id !== origenId)

  const destinoOptsFmt = destinoOpts.map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` }))
  const tarjetaOpts = tarjetas.map((t) => ({ value: t.id, label: `${t.nombre} — deuda ${fmt(t.saldo_total)}` }))

  const reset = () => {
    setOrigenId(''); setDestinoId(''); setMonto(''); setDesc(''); setFecha(today())
  }

  const handleSave = async () => {
    if (!origenId)  { toast.error('Selecciona origen'); return }
    if (!destinoId) { toast.error('Selecciona destino'); return }
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }

    try {
      if (tipo === 'pago_tarjeta') {
        const cuenta  = cuentas.find((c) => c.id === origenId)
        const tarjeta = tarjetas.find((t) => t.id === destinoId)
        await pagarTarjeta.mutateAsync({
          cuentaId: origenId, cuentaSaldo: cuenta.saldo,
          tarjetaId: destinoId,
          tarjetaSaldoTotal: tarjeta.saldo_total,
          tarjetaSaldoAnterior: tarjeta.saldo_periodo_anterior,
          monto, descripcion, fecha,
        })
      } else if (tipo === 'personal_a_negocio' || tipo === 'negocio_a_personal') {
        const origen  = cuentas.find((c) => c.id === origenId)
        const destino = cuentas.find((c) => c.id === destinoId)
        await transferirPN.mutateAsync({
          tipo, origenId, destinoId,
          origenSaldo: origen.saldo, destinoSaldo: destino.saldo,
          monto, descripcion, fecha,
        })
      } else {
        const origen  = cuentas.find((c) => c.id === origenId)
        const destino = cuentas.find((c) => c.id === destinoId)
        await transferir.mutateAsync({
          origenId, destinoId,
          origenSaldo: origen.saldo, destinoSaldo: destino.saldo,
          monto, descripcion, fecha,
        })
      }
      toast.success('Transferencia registrada ✅')
      reset()
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva transferencia">
      <div className="grid grid-cols-2 gap-1.5 mb-5">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTipo(t.id); setOrigenId(''); setDestinoId('') }}
            className={cn(
              'py-2.5 px-2 text-xs font-medium rounded-xl border transition-all',
              tipo === t.id
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-white/10 text-gray-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AmountInput label="Monto" value={monto} onChange={setMonto} placeholder="0.00" />

      <Select
        label={tipo === 'negocio_a_personal' ? 'Cuenta negocio origen' : 'Cuenta origen'}
        value={origenId} onChange={setOrigenId} options={origenOpts}
        placeholder="Selecciona cuenta"
      />

      {tipo === 'pago_tarjeta' ? (
        <Select label="Tarjeta a pagar" value={destinoId} onChange={setDestinoId} options={tarjetaOpts} placeholder="Selecciona tarjeta" />
      ) : (
        <Select
          label={tipo === 'personal_a_negocio' ? 'Cuenta negocio destino' : 'Cuenta destino'}
          value={destinoId} onChange={setDestinoId} options={destinoOptsFmt}
          placeholder="Selecciona cuenta"
        />
      )}

      <Input
        label="Descripción (opcional)" value={descripcion}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Ej: Pago quincena"
      />

      <div className="mb-5">
        <label className="label">Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />Registrar transferencia</>}
      </button>
    </Modal>
  )
}

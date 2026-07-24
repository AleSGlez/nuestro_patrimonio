// src/modules/cards/components/FormPago.jsx
import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import Modal from '@ui/Modal'
import { AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { usePagarTarjeta } from '@modules/accounts/hooks/useTransferencias'
import { fmt, today, cn } from '@lib/utils'

export default function FormPago({ open, onClose, tarjeta }) {
  const toast = useToast()
  const { data: cuentas = [] }        = useCuentas()
  const { data: todosApartados = [] } = useTodosLosApartados()
  const pagar = usePagarTarjeta()

  const [monto, setMonto]     = useState('')
  const [cuentaId, setCuenta] = useState('')
  const [fecha, setFecha]     = useState(today())

  // Todas las cuentas (personales + negocio) + apartados de negocio como fuente de pago
  const cuentaOpts = [
    ...cuentas.map((c) => ({
      value: c.id,
      label: `${c.nombre} — ${fmt(c.saldo)}${c.persona === 'negocio' ? ' 🏪' : ''}`,
    })),
    ...todosApartados
      .filter((a) => a.es_negocio && a.monto > 0)
      .map((a) => {
        const cuenta = cuentas.find((c) => c.id === a.cuenta_id)
        return {
          value: `apartado:${a.id}:${a.cuenta_id}`,
          label: `${a.emoji} ${a.nombre} (Apartado) — ${fmt(a.monto)} 🏪`,
        }
      }),
  ]

  if (!tarjeta) return null

  const opciones = [
    { label: 'Mínimo',    valor: tarjeta.pago_minimo },
    { label: 'Sin int.',  valor: tarjeta.pago_sin_intereses },
    { label: 'Total',     valor: tarjeta.saldo_total },
  ].filter((o) => o.valor > 0)

  const handlePagar = async () => {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }
    if (!cuentaId) { toast.error('Selecciona la cuenta o apartado'); return }

    try {
      // Si es un apartado, el dinero sale SOLO del apartado (el saldo de la
      // cuenta ya excluye lo apartado) — el hook se encarga de no tocar la cuenta
      if (cuentaId.startsWith('apartado:')) {
        const [, apartadoId, cuentaOrigenId] = cuentaId.split(':')
        const apartado = todosApartados.find((a) => a.id === apartadoId)
        if (!apartado) { toast.error('Apartado no encontrado'); return }

        await pagar.mutateAsync({
          cuentaId: cuentaOrigenId,
          tarjetaId: tarjeta.id,
          tarjetaSaldoTotal: tarjeta.saldo_total,
          monto, fecha,
          apartadoId, apartadoMonto: apartado.monto,
        })
      } else {
        const cuenta = cuentas.find((c) => c.id === cuentaId)
        await pagar.mutateAsync({
          cuentaId, cuentaSaldo: cuenta.saldo,
          tarjetaId: tarjeta.id,
          tarjetaSaldoTotal: tarjeta.saldo_total,
          monto, fecha,
        })
      }
      toast.success(`Pago de ${fmt(monto)} registrado ✅`)
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pagar ${tarjeta.nombre}`}>
      <div className="card p-4 mb-5">
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">Deuda total</p>
            <p className="text-xl font-bold font-mono text-bad">{fmt(tarjeta.saldo_total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Sin intereses</p>
            <p className="text-sm font-semibold font-mono text-white">{fmt(tarjeta.pago_sin_intereses)}</p>
          </div>
        </div>
        {opciones.length > 0 && (
          <div className="flex gap-2">
            {opciones.map((o, i) => (
              <button
                key={i} onClick={() => setMonto(String(o.valor))}
                className={cn(
                  'flex-1 py-1.5 text-xs rounded-xl border transition-all',
                  Number(monto) === o.valor
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-white/10 text-gray-400'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AmountInput label="Monto a pagar" value={monto} onChange={setMonto} placeholder="0.00" />
      <Select label="Pagar desde" value={cuentaId} onChange={setCuenta} options={cuentaOpts} placeholder="Selecciona cuenta" />

      <div className="mb-5">
        <label className="label">Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
      </div>

      <button onClick={handlePagar} disabled={pagar.isPending} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {pagar.isPending ? <Spinner size="sm" /> : <><DollarSign size={16} />Registrar pago</>}
      </button>
    </Modal>
  )
}

// src/modules/personas/components/FormMovimientoPersona.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { AmountInput, Select, Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useRegistrarMovimiento } from '../hooks/usePersonas'
import { today, fmt, cn } from '@lib/utils'

const TIPOS = [
  { value: 'prestamo',      label: '💸 Le presté dinero',    desc: 'Me lo debe de regreso' },
  { value: 'cobro',         label: '📋 Me debe por algo',    desc: 'Una deuda que me quedó pendiente' },
  { value: 'pago_recibido', label: '✅ Me pagó',             desc: 'Saldó parte o todo lo que me debía' },
  { value: 'pago_enviado',  label: '💳 Le pagué',            desc: 'Saldé parte o todo lo que le debía' },
]

export default function FormMovimientoPersona({ open, onClose, persona }) {
  const toast = useToast()
  const { data: cuentas = [] } = useCuentas()
  const registrar = useRegistrarMovimiento()

  const [tipo, setTipo]         = useState('prestamo')
  const [monto, setMonto]       = useState('')
  const [descripcion, setDesc]  = useState('')
  const [fecha, setFecha]       = useState(today())
  const [cuentaId, setCuentaId] = useState('')
  const [usarCuenta, setUsarCuenta] = useState(false)

  useEffect(() => {
    if (!open) return
    setTipo('prestamo'); setMonto(''); setDesc('')
    setFecha(today()); setCuentaId(''); setUsarCuenta(false)
  }, [open])

  if (!persona) return null

  const cuentaOpts = cuentas.map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` }))

  // Mueve dinero de cuenta solo cuando tiene sentido:
  // prestamo/pago_enviado → sale dinero  | pago_recibido → entra dinero
  // cobro → no toca cuentas (es solo un registro de deuda)
  const afectaCuenta = tipo !== 'cobro'

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }
    if (usarCuenta && !cuentaId) { toast.error('Selecciona la cuenta'); return }

    try {
      await registrar.mutateAsync({
        persona,
        persona_id: persona.id,
        tipo, monto: Number(monto),
        descripcion: descripcion.trim() || null,
        fecha,
        cuenta_id: usarCuenta && afectaCuenta ? cuentaId : null,
        cuentas,
      })
      toast.success('Movimiento registrado ✅')
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const tipoInfo = TIPOS.find((t) => t.value === tipo)
  const saldoColor = Number(persona.saldo) >= 0 ? 'text-ok' : 'text-bad'
  const saldoLabel = Number(persona.saldo) >= 0
    ? `te debe ${fmt(Math.abs(persona.saldo))}`
    : `le debes ${fmt(Math.abs(persona.saldo))}`

  return (
    <Modal open={open} onClose={onClose} title={`Movimiento con ${persona.nombre}`}>
      <div className="card p-3 mb-4 flex items-center gap-3">
        <span className="text-2xl">{persona.emoji}</span>
        <div>
          <p className="text-sm font-semibold text-white">{persona.nombre}</p>
          <p className={`text-xs font-mono ${saldoColor}`}>
            {Number(persona.saldo) === 0 ? 'Sin deuda pendiente' : saldoLabel}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {TIPOS.map((t) => (
          <button key={t.value} onClick={() => setTipo(t.value)}
            className={cn(
              'w-full p-3 rounded-xl border text-left transition-all',
              tipo === t.value
                ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                : 'border-white/10 bg-surface-700'
            )}
          >
            <p className="text-sm font-medium text-white">{t.label}</p>
            <p className="text-xs text-gray-400">{t.desc}</p>
          </button>
        ))}
      </div>

      <AmountInput label="Monto" value={monto} onChange={setMonto} placeholder="0.00" />
      <Input label="Descripción (opcional)" value={descripcion} onChange={(e) => setDesc(e.target.value)} placeholder="¿Por qué?" />

      <div className="mb-4">
        <label className="label">Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
      </div>

      {afectaCuenta && (
        <button
          onClick={() => setUsarCuenta(!usarCuenta)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border transition-all mb-3 text-left',
            usarCuenta ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-white/10 bg-surface-700'
          )}
        >
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', usarCuenta ? 'bg-[var(--accent)]' : 'bg-surface-600')}>
            <span className="text-base">🏦</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {tipo === 'pago_recibido' ? 'Llegó a una cuenta mía' : 'Salió de una cuenta mía'}
            </p>
            <p className="text-xs text-gray-400">Actualiza también el saldo de la cuenta</p>
          </div>
          <div className={cn('w-10 h-6 rounded-full flex-shrink-0 transition-all relative', usarCuenta ? 'bg-[var(--accent)]' : 'bg-surface-600')}>
            <div className={cn('w-4 h-4 rounded-full bg-white absolute top-1 transition-all', usarCuenta ? 'left-5' : 'left-1')} />
          </div>
        </button>
      )}

      {usarCuenta && afectaCuenta && (
        <Select label="Cuenta" value={cuentaId} onChange={setCuentaId} options={cuentaOpts} placeholder="Selecciona cuenta" />
      )}

      <button onClick={handleSave} disabled={registrar.isPending} className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {registrar.isPending ? <Spinner size="sm" /> : <><Check size={16} />Registrar</>}
      </button>
    </Modal>
  )
}

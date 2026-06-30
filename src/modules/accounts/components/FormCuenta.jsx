// src/modules/accounts/components/FormCuenta.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select, ColorPicker } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearCuenta, useActualizarCuenta } from '../hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { PALETTE } from '@lib/utils'

const TIPOS = [
  { value: 'debito',     label: '💳 Débito' },
  { value: 'ahorro',     label: '🏦 Ahorro' },
  { value: 'efectivo',   label: '💵 Efectivo' },
  { value: 'inversion',  label: '📈 Inversión' },
  { value: 'transporte', label: '🚇 Transporte (Metro, prepago)' },
]

const BANCOS = ['BBVA','Banamex','Santander','HSBC','Banorte','Scotiabank','Inbursa','Nu','Hey Banco','Otro']
  .map((b) => ({ value: b, label: b }))

export default function FormCuenta({ open, onClose, cuenta = null }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const crear = useCrearCuenta()
  const actualizar = useActualizarCuenta()
  const isEdit = Boolean(cuenta)
  const loading = crear.isPending || actualizar.isPending

  const PERSONA_OPTS = [
    { value: 'p1',      label: nombres.p1 },
    { value: 'p2',      label: nombres.p2 },
    { value: 'ambos',   label: 'Compartida' },
    { value: 'negocio', label: '🏪 Negocio' },
  ]

  const [nombre,  setNombre]  = useState('')
  const [tipo,    setTipo]    = useState('debito')
  const [banco,   setBanco]   = useState('BBVA')
  const [saldo,   setSaldo]   = useState('')
  const [persona, setPersona] = useState('p1')
  const [color,   setColor]   = useState(PALETTE[0])

  useEffect(() => {
    if (!open) return
    if (cuenta) {
      setNombre(cuenta.nombre); setTipo(cuenta.tipo); setBanco(cuenta.banco || 'BBVA')
      setSaldo(String(cuenta.saldo)); setPersona(cuenta.persona); setColor(cuenta.color)
    } else {
      setNombre(''); setTipo('debito'); setBanco('BBVA')
      setSaldo(''); setPersona('p1'); setColor(PALETTE[0])
    }
  }, [open, cuenta])

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre de la cuenta'); return }

    const payload = {
      nombre: nombre.trim(),
      tipo,
      banco: tipo === 'efectivo' ? null : banco,
      saldo: Number(saldo) || 0,
      persona, color,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: cuenta.id, data: payload })
        toast.success('Cuenta actualizada')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Cuenta agregada')
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}>
      <Input
        label="Nombre" value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: BBVA nómina" autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Tipo" value={tipo} onChange={setTipo} options={TIPOS} className="mb-0" />
        {tipo !== 'efectivo' && tipo !== 'transporte' && (
          <Select label="Banco" value={banco} onChange={setBanco} options={BANCOS} className="mb-0" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <AmountInput label="Saldo actual" value={saldo} onChange={setSaldo} placeholder="0.00" className="mb-0" />
        <Select label="Pertenece a" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
      </div>

      <ColorPicker label="Color" value={color} onChange={setColor} colors={PALETTE} className="mt-4" />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-5">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Agregar cuenta'}</>}
      </button>
    </Modal>
  )
}

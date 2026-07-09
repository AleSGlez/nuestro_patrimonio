// src/modules/cards/components/FormTarjeta.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select, ColorPicker } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearTarjeta, useActualizarTarjeta } from '../hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import { PALETTE } from '@lib/utils'

const BANCOS = ['BBVA','Banamex','Santander','HSBC','Banorte','Scotiabank','American Express','Liverpool','Otro']
  .map((b) => ({ value: b, label: b }))

const DIAS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Día ${i + 1}` }))

const CARD_COLORS = ['#EF4444','#F97316','#7C6EFA','#3B82F6','#10B981','#EC4899','#F59E0B','#8B5CF6']

export default function FormTarjeta({ open, onClose, tarjeta = null }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const crear = useCrearTarjeta()
  const actualizar = useActualizarTarjeta()
  const isEdit = Boolean(tarjeta)
  const loading = crear.isPending || actualizar.isPending

  const PERSONA_OPTS = [
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
    { value: 'ambos', label: 'Compartida' },
  ]

  const [nombre, setNombre]           = useState('')
  const [banco, setBanco]             = useState('BBVA')
  const [limite, setLimite]           = useState('')
  const [saldoAnterior, setSaldoAnterior] = useState('')
  const [pagoSinIntereses, setPagoSinIntereses] = useState('')
  const [pagoMinimo, setPagoMinimo]   = useState('')
  const [diaCorte, setDiaCorte]       = useState('')
  const [diaLimite, setDiaLimite]     = useState('')
  const [persona, setPersona]         = useState('p1')
  const [color, setColor]             = useState(CARD_COLORS[0])

  useEffect(() => {
    if (!open) return
    if (tarjeta) {
      setNombre(tarjeta.nombre); setBanco(tarjeta.banco || 'BBVA')
      setLimite(String(tarjeta.limite))
      setSaldoAnterior(String(tarjeta.saldo_periodo_anterior))
      setPagoSinIntereses(String(tarjeta.pago_sin_intereses))
      setPagoMinimo(String(tarjeta.pago_minimo))
      setDiaCorte(tarjeta.dia_corte ? String(tarjeta.dia_corte) : '')
      setDiaLimite(tarjeta.dia_limite_pago ? String(tarjeta.dia_limite_pago) : '')
      setPersona(tarjeta.persona); setColor(tarjeta.color)
    } else {
      setNombre(''); setBanco('BBVA'); setLimite('')
      setSaldoAnterior(''); setPagoSinIntereses(''); setPagoMinimo('')
      setDiaCorte(''); setDiaLimite(''); setPersona('p1'); setColor(CARD_COLORS[0])
    }
  }, [open, tarjeta])

  const handleDiaCorte = (val) => {
    setDiaCorte(val)
    if (val && !diaLimite) {
      // Auto-calcular día límite = día corte + 20 días
      const limite = Number(val) + 20
      setDiaLimite(limite > 28 ? String(limite - 28) : String(limite))
    }
  }

  const handleSave = async () => {
    if (!nombre.trim())               { toast.error('Ingresa el nombre'); return }
    if (!limite || Number(limite) <= 0) { toast.error('Ingresa el límite de crédito'); return }

    const payload = {
      nombre: nombre.trim(), banco,
      limite: Number(limite),
      saldo_periodo_anterior: Number(saldoAnterior) || 0,
      pago_sin_intereses: Number(pagoSinIntereses) || 0,
      pago_minimo: Number(pagoMinimo) || 0,
      dia_corte: diaCorte ? Number(diaCorte) : null,
      dia_limite_pago: diaLimite ? Number(diaLimite) : null,
      persona, color,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: tarjeta.id, data: payload })
        toast.success('Tarjeta actualizada')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Tarjeta agregada')
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar tarjeta' : 'Nueva tarjeta'}>
      <Input
        label="Nombre de la tarjeta" value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Oro BBVA" autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Banco" value={banco} onChange={setBanco} options={BANCOS} className="mb-0" />
        <Select label="Pertenece a" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <AmountInput label="Límite de crédito" value={limite} onChange={setLimite} placeholder="0.00" className="mb-0" />
        <AmountInput label="Deuda actual" value={saldoAnterior} onChange={setSaldoAnterior} placeholder="0.00" className="mb-0" />
      </div>
      <p className="text-xs text-gray-500 -mt-2 mb-3">
        La deuda actual es el total que debes en la tarjeta ahora mismo
      </p>

      {/* Pago sin intereses: editable manualmente para corregir el valor inicial */}
      <AmountInput
        label="Pago sin intereses"
        value={pagoSinIntereses}
        onChange={setPagoSinIntereses}
        placeholder="0.00"
      />
      <p className="text-xs text-gray-500 -mt-3 mb-4">
        Lo que debes pagar antes del límite para no generar intereses. Ajústalo si el valor automático no es correcto.
      </p>

      <AmountInput label="Pago mínimo" value={pagoMinimo} onChange={setPagoMinimo} placeholder="0.00" />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Día de corte" value={diaCorte} onChange={handleDiaCorte} options={DIAS} placeholder="Día…" className="mb-0" />
        <Select label="Día límite de pago" value={diaLimite} onChange={setDiaLimite} options={DIAS} placeholder="Día…" className="mb-0" />
      </div>

      <ColorPicker label="Color" value={color} onChange={setColor} colors={CARD_COLORS} className="mt-4" />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-5">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Agregar tarjeta'}</>}
      </button>
    </Modal>
  )
}

// src/modules/presupuestos/components/FormPresupuesto.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearPresupuesto, useActualizarPresupuesto } from '../hooks/usePresupuestos'
import { useAppStore } from '@store/appStore'
import { today, fmt } from '@lib/utils'

const TIPOS = [
  { value: 'diario',   label: '📅 Diario' },
  { value: 'semanal',  label: '🗓️ Semanal' },
  { value: 'mensual',  label: '📆 Mensual' },
]

const EMOJIS = ['💰','🛒','🍔','🚗','🎮','👕','💊','✈️','🏠','📚']

export default function FormPresupuesto({ open, onClose, presupuesto = null }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const crear = useCrearPresupuesto()
  const actualizar = useActualizarPresupuesto()
  const isEdit = Boolean(presupuesto)
  const loading = crear.isPending || actualizar.isPending

  const PERSONA_OPTS = [
    { value: 'ambos', label: '👫 Pareja' },
    { value: 'p1',    label: nombres.p1 },
    { value: 'p2',    label: nombres.p2 },
  ]

  const [nombre, setNombre]         = useState('')
  const [emoji, setEmoji]           = useState('💰')
  const [tipo, setTipo]             = useState('diario')
  const [montoBase, setMontoBase]   = useState('')
  const [persona, setPersona]       = useState('ambos')
  const [fechaInicio, setFechaInicio] = useState(today())

  useEffect(() => {
    if (!open) return
    if (presupuesto) {
      setNombre(presupuesto.nombre); setEmoji(presupuesto.emoji)
      setTipo(presupuesto.tipo); setMontoBase(String(presupuesto.monto_base))
      setPersona(presupuesto.persona); setFechaInicio(presupuesto.fecha_inicio)
    } else {
      setNombre(''); setEmoji('💰'); setTipo('diario')
      setMontoBase(''); setPersona('ambos'); setFechaInicio(today())
    }
  }, [open, presupuesto])

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!montoBase || Number(montoBase) <= 0) { toast.error('Ingresa el monto'); return }

    const payload = {
      nombre: nombre.trim(), emoji, tipo,
      monto_base: Number(montoBase),
      persona, fecha_inicio: fechaInicio,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: presupuesto.id, data: payload })
        toast.success('Presupuesto actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Presupuesto creado')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const tipoLabel = { diario: 'al día', semanal: 'a la semana', mensual: 'al mes' }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              }`}
            >{e}</button>
          ))}
        </div>
      </div>

      <Input
        label="Nombre" value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Gastos diarios, Comida semanal"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Período" value={tipo} onChange={setTipo} options={TIPOS} className="mb-0" />
        <Select label="Persona" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
      </div>

      <div className="mt-3">
        <AmountInput
          label={`Presupuesto ${tipoLabel[tipo] || ''}`}
          value={montoBase} onChange={setMontoBase} placeholder="0.00"
        />
      </div>

      {montoBase > 0 && (
        <div className="p-3 bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-xl mb-4 -mt-1">
          <p className="text-xs text-gray-300">
            {tipo === 'diario'  && `${fmt(montoBase)} por día — si un día gastas menos, se acumula para el siguiente`}
            {tipo === 'semanal' && `${fmt(montoBase)} por semana — el sobrante o déficit se arrastra a la siguiente semana`}
            {tipo === 'mensual' && `${fmt(montoBase)} por mes — el sobrante o déficit se arrastra al siguiente mes`}
          </p>
        </div>
      )}

      <div className="mb-5">
        <label className="label">Fecha de inicio</label>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input" />
        <p className="text-[11px] text-gray-500 mt-1">Los gastos desde esta fecha cuentan contra el presupuesto</p>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Crear presupuesto'}</>}
      </button>
    </Modal>
  )
}

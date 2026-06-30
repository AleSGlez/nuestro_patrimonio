// src/modules/accounts/components/FormApartado.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearApartado, useActualizarApartado } from '../hooks/useApartados'
import { today, fmt } from '@lib/utils'

const TIPO_INTERES = [
  { value: 'simple',    label: 'Interés simple' },
  { value: 'compuesto', label: 'Interés compuesto' },
]

const EMOJIS = ['🏦','✈️','🏠','🚗','🎓','💍','👶','🏖️','🎯','💰']

export default function FormApartado({ open, onClose, cuenta, apartado = null }) {
  const toast = useToast()
  const crear = useCrearApartado()
  const actualizar = useActualizarApartado()
  const isEdit = Boolean(apartado)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]         = useState('')
  const [monto, setMonto]           = useState('')
  const [tasaAnual, setTasaAnual]   = useState('')
  const [tipoInteres, setTipoInteres] = useState('simple')
  const [fechaInicio, setFechaInicio] = useState(today())
  const [metaMonto, setMetaMonto]   = useState('')
  const [metaFecha, setMetaFecha]   = useState('')
  const [emoji, setEmoji]           = useState('🏦')

  useEffect(() => {
    if (!open) return
    if (apartado) {
      setNombre(apartado.nombre)
      setMonto(String(apartado.monto))
      setTasaAnual(String(apartado.tasa_anual || ''))
      setTipoInteres(apartado.tipo_interes)
      setFechaInicio(apartado.fecha_inicio)
      setMetaMonto(apartado.meta_monto ? String(apartado.meta_monto) : '')
      setMetaFecha(apartado.meta_fecha || '')
      setEmoji(apartado.emoji)
    } else {
      setNombre(''); setMonto(''); setTasaAnual('')
      setTipoInteres('simple'); setFechaInicio(today())
      setMetaMonto(''); setMetaFecha(''); setEmoji('🏦')
    }
  }, [open, apartado])

  // Disponible real: saldo de la cuenta (ya excluye apartados existentes)
  // + lo que este apartado específico ya tenía apartado (si es edición,
  // ese monto ya se restó del saldo, así que se puede usar de nuevo)
  const disponibleParaEsteApartado = isEdit
    ? Number(cuenta?.saldo || 0) + Number(apartado.monto)
    : Number(cuenta?.saldo || 0)

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre del apartado'); return }

    const montoNum = Number(monto) || 0
    if (montoNum > disponibleParaEsteApartado) {
      toast.error(`Solo tienes ${fmt(disponibleParaEsteApartado)} disponibles en esta cuenta`)
      return
    }

    const payload = {
      cuenta_id: cuenta.id,
      nombre: nombre.trim(),
      monto: montoNum,
      tasa_anual: Number(tasaAnual) || 0,
      tipo_interes: tipoInteres,
      fecha_inicio: fechaInicio,
      meta_monto: metaMonto ? Number(metaMonto) : null,
      meta_fecha: metaFecha || null,
      emoji,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({
          id: apartado.id,
          cuentaId: cuenta.id,
          montoAnterior: apartado.monto,
          cuentaSaldoActual: cuenta.saldo,
          data: payload,
        })
        toast.success('Apartado actualizado')
      } else {
        await crear.mutateAsync({
          ...payload,
          cuentaSaldoActual: cuenta.saldo,
        })
        toast.success('Apartado creado — se separó del disponible')
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar apartado' : 'Nuevo apartado'}>
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button
              key={e} type="button" onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Nombre del apartado" value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Vacaciones, Fondo emergencia"
      />

      <AmountInput
        label="Monto a apartar" value={monto} onChange={setMonto}
        placeholder="0.00"
      />
      <p className="text-xs text-gray-500 -mt-3 mb-4">
        Disponible para apartar: <span className="text-white font-medium">{fmt(disponibleParaEsteApartado)}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <AmountInput
          label="Tasa anual" value={tasaAnual} onChange={setTasaAnual}
          placeholder="0.00" prefix="%" className="mb-0"
        />
        <Select
          label="Tipo de interés" value={tipoInteres} onChange={setTipoInteres}
          options={TIPO_INTERES} className="mb-0"
        />
      </div>

      <div className="mb-4 mt-3">
        <label className="label">Fecha de inicio</label>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input" />
      </div>

      <p className="section-label mb-2">Meta (opcional)</p>
      <div className="grid grid-cols-2 gap-3">
        <AmountInput
          label="Monto objetivo" value={metaMonto} onChange={setMetaMonto}
          placeholder="0.00" className="mb-0"
        />
        <div>
          <label className="label">Fecha objetivo</label>
          <input type="date" value={metaFecha} onChange={(e) => setMetaFecha(e.target.value)} className="input" />
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-5">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Crear apartado'}</>}
      </button>
    </Modal>
  )
}

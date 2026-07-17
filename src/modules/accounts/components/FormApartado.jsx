// src/modules/accounts/components/FormApartado.jsx
import { useState, useEffect } from 'react'
import { Check, Store } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearApartado, useActualizarApartado } from '../hooks/useApartados'
import { today, fmt, cn } from '@lib/utils'

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
  const [esNegocio, setEsNegocio]   = useState(false)

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
      setEsNegocio(Boolean(apartado.es_negocio))
    } else {
      setNombre(''); setMonto(''); setTasaAnual('')
      setTipoInteres('simple'); setFechaInicio(today())
      setMetaMonto(''); setMetaFecha(''); setEmoji('🏦'); setEsNegocio(false)
    }
  }, [open, apartado])

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
      es_negocio: esNegocio,
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
      <p className="text-xs text-gray-400 -mt-3 mb-4">
        Disponible para apartar: <span className="text-white font-medium">{fmt(disponibleParaEsteApartado)}</span>
      </p>

      {/* Toggle: este dinero es del negocio aunque viva en cuenta personal */}
      <button
        type="button"
        onClick={() => setEsNegocio(!esNegocio)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all mb-4 text-left',
          esNegocio ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-white/10 bg-surface-700'
        )}
      >
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          esNegocio ? 'bg-[var(--accent)]' : 'bg-surface-600'
        )}>
          <Store size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Es dinero del negocio</p>
          <p className="text-xs text-gray-400">Aunque esté en tu cuenta personal, cuenta en los reportes de negocio</p>
        </div>
        <div className={cn(
          'w-10 h-6 rounded-full flex-shrink-0 transition-all relative',
          esNegocio ? 'bg-[var(--accent)]' : 'bg-surface-600'
        )}>
          <div className={cn(
            'w-4 h-4 rounded-full bg-white absolute top-1 transition-all',
            esNegocio ? 'left-5' : 'left-1'
          )} />
        </div>
      </button>

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

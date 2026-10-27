// src/modules/metas/components/FormMeta.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearMeta, useActualizarMeta } from '../hooks/useMetas'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { fmt, cn, TIPO_EMOJI_CUENTA } from '@lib/utils'

const EMOJIS = ['🎯','✈️','🏠','💍','👶','🚗','💻','🏖️','🎓','🐕','💰','🌎','🛟']

export default function FormMeta({ open, onClose, meta = null }) {
  const toast = useToast()
  const { nombres } = useAppStore()
  const { data: cuentas = [] } = useCuentas()
  const crear = useCrearMeta()
  const actualizar = useActualizarMeta()
  const isEdit = Boolean(meta)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]       = useState('')
  const [emoji, setEmoji]         = useState('🎯')
  const [descripcion, setDesc]    = useState('')
  const [objetivo, setObjetivo]   = useState('')
  const [fechaObj, setFechaObj]   = useState('')
  const [persona, setPersona]     = useState('ambos')
  const [cuentaId, setCuentaId]   = useState('')

  // Repoblar (o resetear) al abrir — el form vive montado todo el tiempo,
  // así que sin este efecto los useState de arriba solo se leen una vez y
  // el segundo "Editar" de una meta distinta dejaba los campos con los
  // datos de la anterior.
  useEffect(() => {
    if (!open) return
    if (meta) {
      setNombre(meta.nombre || '')
      setEmoji(meta.emoji || '🎯')
      setDesc(meta.descripcion || '')
      setObjetivo(meta.monto_objetivo ? String(meta.monto_objetivo) : '')
      setFechaObj(meta.fecha_objetivo || '')
      setPersona(meta.persona || 'ambos')
      setCuentaId(meta.cuenta_id || '')
    } else {
      setNombre(''); setEmoji('🎯'); setDesc(''); setObjetivo('')
      setFechaObj(''); setPersona('ambos'); setCuentaId('')
    }
  }, [open, meta])

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!objetivo || Number(objetivo) <= 0) { toast.error('Ingresa el monto objetivo'); return }
    const payload = {
      nombre: nombre.trim(), emoji,
      descripcion: descripcion.trim() || null,
      monto_objetivo: Number(objetivo),
      fecha_objetivo: fechaObj || null,
      persona, cuenta_id: cuentaId || null,
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: meta.id, data: payload })
        toast.success('Meta actualizada')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Meta creada ✅')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar meta' : 'Nueva meta de ahorro'}>
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} aria-pressed={emoji === e}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all',
                emoji === e ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-muted)]' : 'bg-surface-700'
              )}>{e}</button>
          ))}
        </div>
      </div>

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Viaje a Japón, Boda, Fondo emergencia" autoFocus />
      <Input label="Descripción (opcional)" value={descripcion} onChange={(e) => setDesc(e.target.value)}
        placeholder="Detalle de la meta" />

      <div className="grid grid-cols-2 gap-3">
        <AmountInput label="Monto objetivo" value={objetivo} onChange={setObjetivo}
          placeholder="0.00" className="mb-0" />
        <div>
          <label className="label">Fecha objetivo</label>
          <input type="date" value={fechaObj} onChange={(e) => setFechaObj(e.target.value)} className="input" />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5 mb-4">Con fecha, la app te dice si van a tiempo y cuánto apartar por quincena.</p>

      <div className="mb-4">
        <label className="label">De quién es</label>
        <div className="flex gap-2">
          {['ambos','p1','p2'].map((v) => (
            <button key={v} type="button" onClick={() => setPersona(v)} aria-pressed={persona === v}
              className={cn('flex-1 min-h-[42px] rounded-xl text-xs font-semibold border transition-all',
                persona === v ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent-light)]' : 'border-white/10 text-gray-300'
              )}>
              {v === 'ambos' ? '👫 Pareja' : v === 'p1' ? nombres.p1 : nombres.p2}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="label">Cuenta donde se guarda (opcional)</label>
        <p className="text-[11px] text-gray-400 mb-2">Al aportar, se propone como cuenta de origen.</p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {[{ id: '', nombre: 'Sin cuenta vinculada', saldo: null }, ...cuentas].map((c) => {
            const activa = cuentaId === c.id
            return (
              <button key={c.id || 'ninguna'} type="button" onClick={() => setCuentaId(c.id)} aria-pressed={activa}
                className={cn('w-full flex items-center gap-2.5 min-h-[46px] px-3 rounded-xl border text-left transition-all',
                  activa ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-white/10'
                )}>
                <span className="text-base">{c.id ? (TIPO_EMOJI_CUENTA[c.tipo] || '🏦') : '➖'}</span>
                <span className="flex-1 text-xs text-white">{c.nombre}</span>
                {c.saldo !== null && <span className="text-[11px] font-mono text-gray-400">{fmt(c.saldo)}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Crear meta'}</>}
      </button>
    </Modal>
  )
}

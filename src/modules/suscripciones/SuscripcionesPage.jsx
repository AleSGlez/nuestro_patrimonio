// src/modules/suscripciones/SuscripcionesPage.jsx
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Check, Bell, Play } from 'lucide-react'
import {
  useSuscripciones, useCrearSuscripcion, useActualizarSuscripcion,
  useEliminarSuscripcion, useRegistrarSuscripcion,
  diasHasta, gastoAnual, FRECUENCIA_LABEL, siguienteFecha
} from './hooks/useSuscripciones'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState, Input, AmountInput, Select } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { fmt, cn, today } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FRECUENCIAS = [
  { value: 'diaria',     label: 'Diaria' },
  { value: 'semanal',    label: 'Semanal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'bimestral',  label: 'Cada 2 meses' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
]

const EMOJIS = ['🔄','📺','🎵','🎮','☁️','📦','🏋️','📚','🍿','💊','🔐','📱','🌐','⚡']

function FormSuscripcion({ open, onClose, suscripcion = null }) {
  const toast = useToast()
  const { nombres } = useAppStore()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const crear = useCrearSuscripcion()
  const actualizar = useActualizarSuscripcion()
  const isEdit = Boolean(suscripcion)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]         = useState(suscripcion?.nombre || '')
  const [emoji, setEmoji]           = useState(suscripcion?.emoji || '🔄')
  const [monto, setMonto]           = useState(suscripcion?.monto ? String(suscripcion.monto) : '')
  const [frecuencia, setFrecuencia] = useState(suscripcion?.frecuencia || 'mensual')
  const [proximaFecha, setProxima]  = useState(suscripcion?.proxima_fecha || today())
  const [persona, setPersona]       = useState(suscripcion?.persona || 'ambos')
  const [contexto, setContexto]     = useState(suscripcion?.contexto || 'personal')
  const [cuentaId, setCuentaId]     = useState(suscripcion?.cuenta_id || '')
  const [nota, setNota]             = useState(suscripcion?.nota || '')

  const PERSONA_OPTS = [
    { value: 'ambos', label: '👫 Pareja' },
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
  ]

  const metodoPagoOpts = [
    { value: '', label: 'Sin método de pago' },
    ...cuentas.map((c) => ({ value: `cuenta:${c.id}`, label: `🏦 ${c.nombre}` })),
    ...tarjetas.map((t) => ({ value: `tarjeta:${t.id}`, label: `💳 ${t.nombre}` })),
  ]

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }

    let cuenta_id = null
    let tarjeta_id = null
    if (cuentaId.startsWith('cuenta:')) cuenta_id = cuentaId.replace('cuenta:', '')
    if (cuentaId.startsWith('tarjeta:')) tarjeta_id = cuentaId.replace('tarjeta:', '')

    const payload = {
      nombre: nombre.trim(), emoji, monto: Number(monto),
      frecuencia, proxima_fecha: proximaFecha,
      persona, contexto, nota: nota.trim() || null,
      cuenta_id, tarjeta_id,
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: suscripcion.id, data: payload })
        toast.success('Suscripción actualizada')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Suscripción agregada')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar suscripción' : 'Nueva suscripción'}>
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all',
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              )}>{e}</button>
          ))}
        </div>
      </div>

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Netflix, Spotify, iCloud" autoFocus />

      <div className="grid grid-cols-2 gap-3">
        <AmountInput label="Monto" value={monto} onChange={setMonto} placeholder="0.00" className="mb-0" />
        <Select label="Frecuencia" value={frecuencia} onChange={setFrecuencia} options={FRECUENCIAS} className="mb-0" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Select label="Quién paga" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
        <div>
          <label className="label">Próximo cobro</label>
          <input type="date" value={proximaFecha} onChange={(e) => setProxima(e.target.value)} className="input" />
        </div>
      </div>

      <Select label="Método de pago" value={cuentaId} onChange={setCuentaId}
        options={metodoPagoOpts} className="mt-3" />

      <div className="flex gap-2 mb-4">
        {['personal','negocio'].map((c) => (
          <button key={c} onClick={() => setContexto(c)}
            className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize',
              contexto === c ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-white/10 text-gray-400'
            )}>{c}</button>
        ))}
      </div>

      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)}
        placeholder="Contraseña, cuenta, etc." />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Agregar suscripción'}</>}
      </button>
    </Modal>
  )
}

function SuscripcionCard({ sus, cuentas, onEdit, onDelete, onRegistrar }) {
  const dias = diasHasta(sus.proxima_fecha)
  const vencida = dias < 0
  const hoy = dias === 0
  const pronto = dias > 0 && dias <= 3

  const alerta = vencida || hoy || pronto
  const badgeColor = vencida ? 'bg-bad/20 text-bad' : (hoy || pronto) ? 'bg-warn/20 text-warn' : 'bg-surface-700 text-gray-400'
  const badgeLabel = vencida ? `Venció hace ${Math.abs(dias)}d` : hoy ? 'Hoy' : pronto ? `${dias}d` : `${dias}d`

  const metodoPago = sus.cuenta_id
    ? cuentas.find((c) => c.id === sus.cuenta_id)?.nombre
    : null

  return (
    <div className={cn('card p-4', alerta && 'border border-warn/30')}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
            alerta ? 'bg-warn/10' : 'bg-surface-700'
          )}>
            {sus.emoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white">{sus.nombre}</p>
              {alerta && <Bell size={11} className="text-warn" />}
            </div>
            <p className="text-[11px] text-gray-400">
              {FRECUENCIA_LABEL[sus.frecuencia]} · {sus.persona === 'ambos' ? 'Pareja' : sus.persona}
              {metodoPago && ` · ${metodoPago}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badgeColor)}>
            {badgeLabel}
          </span>
          <button onClick={() => onEdit(sus)} aria-label="Editar suscripción" className="icon-btn text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(sus)} aria-label="Eliminar suscripción" className="icon-btn text-gray-500 hover:text-bad">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold font-mono text-white">{fmt(sus.monto)}</p>
          <p className="text-[10px] text-gray-400">~{fmt(gastoAnual(sus))} al año</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Próximo cobro</p>
            <p className="text-xs text-gray-300 capitalize">
              {format(new Date(sus.proxima_fecha + 'T12:00:00'), "d 'de' MMM", { locale: es })}
            </p>
          </div>
          {(vencida || hoy) && (
            <button onClick={() => onRegistrar(sus)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-[11px] font-medium">
              <Play size={11} /> Registrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function FormSuscripcionGlobal({ open, onClose }) {
  return <FormSuscripcion open={open} onClose={onClose} />
}

export default function SuscripcionesPage() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: suscripciones = [], isPending } = useSuscripciones()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const eliminar = useEliminarSuscripcion()
  const registrar = useRegistrarSuscripcion()
  const [formOpen, setFormOpen] = useState(false)
  const [editSus, setEditSus]   = useState(null)

  const totalMensual = useMemo(() => suscripciones.reduce((s, sus) => {
    const mult = { diaria: 30, semanal: 4.33, mensual: 1, bimestral: 0.5, trimestral: 0.33, semestral: 0.17, anual: 0.083 }
    return s + Number(sus.monto) * (mult[sus.frecuencia] || 1)
  }, 0), [suscripciones])

  const alertas = suscripciones.filter((s) => diasHasta(s.proxima_fecha) <= 3)

  const handleDelete = async (sus) => {
    if (!(await confirmar({ message: `¿Desactivar "${sus.nombre}"?` }))) return
    try { await eliminar.mutateAsync(sus.id); toast.success('Suscripción desactivada') }
    catch (e) { toast.error(e.message) }
  }

  const handleRegistrar = async (sus) => {
    if (!(await confirmar({ message: `¿Registrar el cargo de ${fmt(sus.monto)} de ${sus.nombre}?` }))) return
    try {
      await registrar.mutateAsync({ suscripcion: sus, cuentas, tarjetas })
      toast.success('Cargo registrado ✅')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-1">Gasto mensual</p>
            <p className="text-lg font-bold font-mono text-white">{fmt(totalMensual)}</p>
          </div>
          <div className={cn('rounded-xl p-3', alertas.length > 0 ? 'bg-warn/10 border border-warn/20' : 'bg-surface-700')}>
            <p className="text-[10px] text-gray-400 mb-1">Próximos 3 días</p>
            <p className={cn('text-lg font-bold', alertas.length > 0 ? 'text-warn' : 'text-white')}>
              {alertas.length} cobros
            </p>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : suscripciones.length === 0 ? (
          <EmptyState emoji="🔄" title="Sin suscripciones"
            description="Agrega tus servicios recurrentes como Netflix, Spotify, gimnasio, etc." />
        ) : (
          <div className="space-y-3">
            {/* Primero las que vencen pronto o ya vencieron */}
            {suscripciones
              .sort((a, b) => diasHasta(a.proxima_fecha) - diasHasta(b.proxima_fecha))
              .map((sus) => (
                <SuscripcionCard key={sus.id} sus={sus} cuentas={cuentas}
                  onEdit={(s) => { setEditSus(s); setFormOpen(true) }}
                  onDelete={handleDelete}
                  onRegistrar={handleRegistrar}
                />
              ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditSus(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormSuscripcion
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSus(null) }}
        suscripcion={editSus}
      />
    </>
  )
}

// src/modules/recurrentes/RecurrentesPage.jsx
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Check, Play, TrendingUp, TrendingDown } from 'lucide-react'
import { useRecurrentes, useCrearRecurrente, useActualizarRecurrente, useEliminarRecurrente, useRegistrarRecurrente } from './hooks/useRecurrentes'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState, Input, AmountInput, Select } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { fmt, cn, today, CAT_GASTO, CAT_INGRESO } from '@lib/utils'
import { diasHasta, FRECUENCIA_LABEL, siguienteFecha } from '@modules/suscripciones/hooks/useSuscripciones'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FRECUENCIAS = [
  { value: 'semanal',    label: 'Semanal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'bimestral',  label: 'Cada 2 meses' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
]

const EMOJIS = ['🔄','🏠','💰','🚗','👶','💊','📖','🏋️','✈️','💡','📱','🐕']

function FormRecurrente({ open, onClose, recurrente = null }) {
  const toast = useToast()
  const { nombres } = useAppStore()
  const { data: cuentas = [] } = useCuentas()
  const crear = useCrearRecurrente()
  const actualizar = useActualizarRecurrente()
  const isEdit = Boolean(recurrente)
  const loading = crear.isPending || actualizar.isPending

  const [tipo, setTipo]           = useState(recurrente?.tipo || 'gasto')
  const [nombre, setNombre]       = useState(recurrente?.nombre || '')
  const [emoji, setEmoji]         = useState(recurrente?.emoji || '🔄')
  const [monto, setMonto]         = useState(recurrente?.monto ? String(recurrente.monto) : '')
  const [frecuencia, setFrecuencia] = useState(recurrente?.frecuencia || 'mensual')
  const [proximaFecha, setProxima]  = useState(recurrente?.proxima_fecha || today())
  const [persona, setPersona]     = useState(recurrente?.persona || 'ambos')
  const [contexto, setContexto]   = useState(recurrente?.contexto || 'personal')
  const [cuentaId, setCuentaId]   = useState(recurrente?.cuenta_id || '')
  const [categoria, setCategoria] = useState(recurrente?.categoria || '')
  const [nota, setNota]           = useState(recurrente?.nota || '')

  const PERSONA_OPTS = [
    { value: 'ambos', label: '👫 Pareja' },
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
  ]

  const CATS = tipo === 'ingreso'
    ? CAT_INGRESO.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))
    : CAT_GASTO.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))

  const cuentaOpts = [
    { value: '', label: 'Sin cuenta específica' },
    ...cuentas.map((c) => ({ value: c.id, label: `${c.nombre}` })),
  ]

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }
    const payload = {
      tipo, nombre: nombre.trim(), emoji, monto: Number(monto),
      frecuencia, proxima_fecha: proximaFecha,
      persona, contexto, categoria: categoria || null,
      cuenta_id: cuentaId || null, nota: nota.trim() || null,
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: recurrente.id, data: payload })
        toast.success('Actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Transacción recurrente creada')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar recurrente' : 'Nueva recurrente'}>
      {/* Tipo */}
      <div className="flex gap-2 mb-4">
        {[['gasto','Gasto','bg-bad'],['ingreso','Ingreso','bg-ok']].map(([t, label, color]) => (
          <button key={t} onClick={() => setTipo(t)}
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
              tipo === t ? `${color} border-transparent text-white` : 'border-white/10 text-gray-400'
            )}>{label}</button>
        ))}
      </div>

      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg',
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              )}>{e}</button>
          ))}
        </div>
      </div>

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Renta, Nómina, Abono auto" autoFocus />

      <div className="grid grid-cols-2 gap-3">
        <AmountInput label="Monto" value={monto} onChange={setMonto} placeholder="0.00" className="mb-0" />
        <Select label="Frecuencia" value={frecuencia} onChange={setFrecuencia} options={FRECUENCIAS} className="mb-0" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Select label="Persona" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
        <div>
          <label className="label">Próxima fecha</label>
          <input type="date" value={proximaFecha} onChange={(e) => setProxima(e.target.value)} className="input" />
        </div>
      </div>

      <Select label="Categoría" value={categoria} onChange={setCategoria}
        options={[{ value: '', label: 'Sin categoría' }, ...CATS]} className="mt-3" />
      <Select label="Cuenta" value={cuentaId} onChange={setCuentaId} options={cuentaOpts} />

      <div className="flex gap-2 mb-4">
        {['personal','negocio'].map((c) => (
          <button key={c} onClick={() => setContexto(c)}
            className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize',
              contexto === c ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-white/10 text-gray-400'
            )}>{c}</button>
        ))}
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Crear'}</>}
      </button>
    </Modal>
  )
}

function RecurrenteCard({ rec, cuentas, onEdit, onDelete, onRegistrar }) {
  const dias = diasHasta(rec.proxima_fecha)
  const vencida = dias <= 0
  const isIngreso = rec.tipo === 'ingreso'
  const cuenta = cuentas.find((c) => c.id === rec.cuenta_id)

  return (
    <div className={cn('card p-4', vencida && 'border border-warn/30')}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
            isIngreso ? 'bg-ok/10' : 'bg-bad/10'
          )}>
            {rec.emoji}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{rec.nombre}</p>
            <p className="text-[11px] text-gray-400">
              {FRECUENCIA_LABEL[rec.frecuencia]} · {rec.persona === 'ambos' ? 'Pareja' : rec.persona}
              {cuenta && ` · ${cuenta.nombre}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(rec)} aria-label="Editar recurrente" className="icon-btn text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(rec)} aria-label="Eliminar recurrente" className="icon-btn text-gray-500 hover:text-bad">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isIngreso ? <TrendingUp size={14} className="text-ok" /> : <TrendingDown size={14} className="text-bad" />}
          <p className={cn('text-lg font-bold font-mono', isIngreso ? 'text-ok' : 'text-bad')}>
            {isIngreso ? '+' : '-'}{fmt(rec.monto)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Próxima</p>
            <p className={cn('text-xs', vencida ? 'text-warn font-medium' : 'text-gray-300')}>
              {vencida && dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' :
                format(new Date(rec.proxima_fecha + 'T12:00:00'), "d 'de' MMM", { locale: es })}
            </p>
          </div>
          {vencida && (
            <button onClick={() => onRegistrar(rec)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-[11px] font-medium">
              <Play size={11} /> Registrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecurrentesPage() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: recurrentes = [], isPending } = useRecurrentes()
  const { data: cuentas = [] } = useCuentas()
  const eliminar = useEliminarRecurrente()
  const registrar = useRegistrarRecurrente()
  const [formOpen, setFormOpen] = useState(false)
  const [editRec, setEditRec]   = useState(null)

  const vencidas = recurrentes.filter((r) => diasHasta(r.proxima_fecha) <= 0)

  const handleDelete = async (rec) => {
    if (!(await confirmar({ message: `¿Desactivar "${rec.nombre}"?` }))) return
    try { await eliminar.mutateAsync(rec.id); toast.success('Eliminado') }
    catch (e) { toast.error(e.message) }
  }

  const handleRegistrar = async (rec) => {
    if (!(await confirmar({ message: `¿Registrar ${rec.tipo === 'ingreso' ? 'ingreso' : 'gasto'} de ${fmt(rec.monto)} — ${rec.nombre}?` }))) return
    try {
      await registrar.mutateAsync({ recurrente: rec, cuentas })
      toast.success('Registrado ✅')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header">
        {vencidas.length > 0 && (
          <div className="w-full p-3 bg-warn/10 border border-warn/20 rounded-xl">
            <p className="text-xs text-warn font-medium">⚠️ {vencidas.length} transacción{vencidas.length > 1 ? 'es' : ''} pendiente{vencidas.length > 1 ? 's' : ''} de registrar</p>
          </div>
        )}
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        ) : recurrentes.length === 0 ? (
          <EmptyState emoji="🔁" title="Sin transacciones recurrentes"
            description="Agrega pagos o ingresos que se repiten: renta, nómina, abono al auto, etc." />
        ) : (
          <div className="space-y-3">
            {recurrentes
              .sort((a, b) => diasHasta(a.proxima_fecha) - diasHasta(b.proxima_fecha))
              .map((rec) => (
                <RecurrenteCard key={rec.id} rec={rec} cuentas={cuentas}
                  onEdit={(r) => { setEditRec(r); setFormOpen(true) }}
                  onDelete={handleDelete}
                  onRegistrar={handleRegistrar}
                />
              ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditRec(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormRecurrente
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRec(null) }}
        recurrente={editRec}
      />
    </>
  )
}

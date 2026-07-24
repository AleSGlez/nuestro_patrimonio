// src/modules/metas/MetasPage.jsx
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, Target, TrendingUp, ChevronRight } from 'lucide-react'
import { useMetas, useCrearMeta, useActualizarMeta, useEliminarMeta, useAportar, useAportaciones, useEliminarAportacion, calcularMeta } from './hooks/useMetas'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState, Input, AmountInput, Select } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { fmt, cn, today } from '@lib/utils'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const EMOJIS = ['🎯','✈️','🏠','💍','👶','🚗','💻','🏖️','🎓','🐕','💰','🌎']
const COLORES = ['#7C6EFA','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#F97316']

// ── Formulario de meta ────────────────────────────────────────
function FormMeta({ open, onClose, meta = null }) {
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
  const [cuentasIds, setCuentasIds] = useState([])
  const [color, setColor]         = useState('#7C6EFA')

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
      setCuentasIds(meta.cuenta_id ? [meta.cuenta_id] : [])
      setColor(meta.color || '#7C6EFA')
    } else {
      setNombre(''); setEmoji('🎯'); setDesc(''); setObjetivo('')
      setFechaObj(''); setPersona('ambos'); setCuentasIds([]); setColor('#7C6EFA')
    }
  }, [open, meta])

  const PERSONA_OPTS = [
    { value: 'ambos', label: '👫 Pareja' },
    { value: 'p1',    label: nombres.p1 },
    { value: 'p2',    label: nombres.p2 },
  ]

  const cuentaOpts = [
    { value: '', label: 'Sin cuenta vinculada (solo visual)' },
    ...cuentas.map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` })),
  ]

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!objetivo || Number(objetivo) <= 0) { toast.error('Ingresa el monto objetivo'); return }
    const payload = {
      nombre: nombre.trim(), emoji,
      descripcion: descripcion.trim() || null,
      monto_objetivo: Number(objetivo),
      fecha_objetivo: fechaObj || null,
      persona, cuenta_id: cuentasIds[0] || null,
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
      {/* Emoji */}
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
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

      <div className="mb-4">
        <label className="label">Cuentas de ahorro (hasta 5)</label>
        <p className="text-[11px] text-gray-400 mb-2">Al aportar podrás elegir entre estas cuentas.</p>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {cuentas.map((c) => {
            const selected = cuentasIds.includes(c.id)
            return (
              <button key={c.id} onClick={() => {
                if (selected) {
                  setCuentasIds((prev) => prev.filter((id) => id !== c.id))
                } else if (cuentasIds.length < 5) {
                  setCuentasIds((prev) => [...prev, c.id])
                }
              }}
                className={cn('w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all',
                  selected ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-white/10'
                )}>
                <div className={cn('w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0',
                  selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/20'
                )}>
                  {selected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white">{c.nombre}</p>
                  <p className="text-[10px] text-gray-400">{fmt(c.saldo)}</p>
                </div>
              </button>
            )
          })}
        </div>
        {cuentasIds.length === 5 && (
          <p className="text-[11px] text-warn mt-1">Máximo 5 cuentas</p>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {['ambos','p1','p2'].map((v) => (
          <button key={v} onClick={() => setPersona(v)}
            className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
              persona === v ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-white/10 text-gray-400'
            )}>
            {v === 'ambos' ? '👫 Pareja' : v === 'p1' ? nombres.p1 : nombres.p2}
          </button>
        ))}
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Crear meta'}</>}
      </button>
    </Modal>
  )
}

// ── Formulario de aportación ──────────────────────────────────
function FormAportacion({ open, onClose, meta }) {
  const toast = useToast()
  const { data: cuentas = [] } = useCuentas()
  const aportar = useAportar()

  const [monto, setMonto]     = useState('')
  const [fecha, setFecha]     = useState(today())
  const [nota, setNota]       = useState('')
  const [cuentaId, setCuenta] = useState('')

  // Resetear cada vez que se abre — evita que quede el monto/nota/cuenta
  // de la última aportación (de esta u otra meta) al volver a abrir.
  useEffect(() => {
    if (!open) return
    setMonto(''); setFecha(today()); setNota('')
    setCuenta(meta?.cuenta_id || '')
  }, [open, meta])

  const cuentaOpts = [
    { value: '', label: 'No descontar de ninguna cuenta' },
    ...(meta?.cuenta_id
      ? cuentas.filter((c) => c.id === meta.cuenta_id || !meta.cuenta_id)
      : cuentas
    ).map((c) => ({ value: c.id, label: `${c.nombre} — ${fmt(c.saldo)}` })),
  ]

  const { faltante, aportacionMensual, aportacionQuincenal } = calcularMeta(meta || { monto_objetivo: 0, monto_actual: 0 })

  const handleAportar = async () => {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }
    try {
      await aportar.mutateAsync({ meta, monto, fecha, nota, cuentaId, cuentas })
      toast.success('Aportación registrada ✅')
      setMonto(''); setNota(''); onClose()
    } catch (e) { toast.error(e.message) }
  }

  if (!meta) return null

  return (
    <Modal open={open} onClose={onClose} title={`Aportar a: ${meta.emoji} ${meta.nombre}`}>
      {/* Sugerencias */}
      {aportacionMensual && (
        <div className="bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-300 mb-2">💡 Para llegar a tiempo:</p>
          <div className="flex gap-3">
            <button onClick={() => setMonto(String(Math.ceil(aportacionQuincenal)))}
              className="flex-1 bg-surface-700 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-400">Por quincena</p>
              <p className="text-sm font-bold text-[var(--accent)]">{fmt(aportacionQuincenal)}</p>
            </button>
            <button onClick={() => setMonto(String(Math.ceil(aportacionMensual)))}
              className="flex-1 bg-surface-700 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-400">Por mes</p>
              <p className="text-sm font-bold text-[var(--accent)]">{fmt(aportacionMensual)}</p>
            </button>
            <button onClick={() => setMonto(String(Math.ceil(faltante)))}
              className="flex-1 bg-surface-700 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-400">Todo ya</p>
              <p className="text-sm font-bold text-white">{fmt(faltante)}</p>
            </button>
          </div>
        </div>
      )}

      <AmountInput label="Monto a aportar" value={monto} onChange={setMonto} placeholder="0.00" />

      <Select label="Descontar de cuenta" value={cuentaId} onChange={setCuenta} options={cuentaOpts} />

      <div className="mb-4">
        <label className="label">Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
      </div>

      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)}
        placeholder="Quincena de junio, bono, etc." />

      <button onClick={handleAportar} disabled={aportar.isPending}
        className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {aportar.isPending ? <Spinner size="sm" /> : <><TrendingUp size={16} /> Registrar aportación</>}
      </button>
    </Modal>
  )
}

// ── Card de meta ──────────────────────────────────────────────
function MetaCard({ meta, onEdit, onDelete, onAportar, onDetalle }) {
  const { objetivo, actual, faltante, pct, diasRestantes, aportacionMensual } = calcularMeta(meta)
  const completada = meta.completada || pct >= 100

  return (
    <div className={cn('card p-4', completada && 'border border-ok/30')}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <button onClick={() => onDetalle(meta)} className="flex items-center gap-2.5 flex-1 text-left">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${meta.color}20` }}>
            {meta.emoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white">{meta.nombre}</p>
              {completada && <span className="text-[10px] bg-ok/10 text-ok px-1.5 py-0.5 rounded-full">✅ Completada</span>}
            </div>
            <p className="text-[11px] text-gray-400">
              {meta.persona === 'ambos' ? 'Pareja' : meta.persona}
              {meta.fecha_objetivo && ` · ${format(parseISO(meta.fecha_objetivo), "d MMM yyyy", { locale: es })}`}
            </p>
          </div>
        </button>
        <div className="flex gap-1">
          <button onClick={() => onEdit(meta)} aria-label="Editar meta" className="icon-btn text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(meta)} aria-label="Eliminar meta" className="icon-btn text-gray-500 hover:text-bad">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progreso */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-2xl font-bold font-mono text-white">{fmt(actual)}</p>
          <p className="text-[11px] text-gray-400">de {fmt(objetivo)}</p>
        </div>
        <div className="text-right">
          <p className={cn('text-2xl font-bold', completada ? 'text-ok' : 'text-[var(--accent)]')}>{pct}%</p>
          {!completada && <p className="text-[11px] text-gray-400">Falta {fmt(faltante)}</p>}
        </div>
      </div>

      {/* Barra */}
      <div className="h-2.5 bg-surface-500 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: completada ? '#10B981' : meta.color }} />
      </div>

      {/* Info fecha y aportación sugerida */}
      {!completada && meta.fecha_objetivo && (
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-surface-700 rounded-xl p-2 text-center">
            <p className="text-[10px] text-gray-400">Días restantes</p>
            <p className={cn('text-sm font-bold', diasRestantes < 30 ? 'text-warn' : 'text-white')}>
              {diasRestantes > 0 ? diasRestantes : '¡Ya venció!'}
            </p>
          </div>
          {aportacionMensual && (
            <div className="flex-1 bg-surface-700 rounded-xl p-2 text-center">
              <p className="text-[10px] text-gray-400">Ahorrar/mes</p>
              <p className="text-sm font-bold text-[var(--accent)]">{fmt(aportacionMensual)}</p>
            </div>
          )}
        </div>
      )}

      {!completada && (
        <button onClick={() => onAportar(meta)}
          className="w-full py-2.5 rounded-xl border border-[var(--accent)]/30 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all">
          + Registrar aportación
        </button>
      )}
    </div>
  )
}

// ── Detalle con historial ─────────────────────────────────────
function DetalleMetaModal({ meta, onClose }) {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: aportaciones = [] } = useAportaciones(meta?.id)
  const { data: cuentas = [] } = useCuentas()
  const eliminarAportacion = useEliminarAportacion()
  if (!meta) return null

  const { pct } = calcularMeta(meta)

  const handleEliminarAportacion = async (a) => {
    if (!(await confirmar({
      message: `¿Eliminar la aportación de ${fmt(a.monto)}? La meta bajará ese monto${a.cuenta_id ? ' y el dinero regresará a la cuenta' : ''}.`,
    }))) return
    try {
      await eliminarAportacion.mutateAsync({ aportacion: a, meta, cuentas })
      toast.success('Aportación eliminada — meta y cuenta restauradas')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-surface-800 rounded-t-3xl p-5 border-t border-white/10 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <p className="text-base font-bold text-white">{meta.nombre}</p>
            <p className="text-xs text-gray-400">{pct}% completado · {fmt(Number(meta.monto_actual))} de {fmt(Number(meta.monto_objetivo))}</p>
          </div>
        </div>

        <p className="section-label mb-2">Historial de aportaciones</p>
        {aportaciones.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Sin aportaciones registradas</p>
        ) : (
          <div className="space-y-2">
            {aportaciones.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2.5 bg-surface-700 rounded-xl">
                <div>
                  <p className="text-xs text-white font-medium">{fmt(a.monto)}</p>
                  <p className="text-[10px] text-gray-400">{a.fecha}{a.nota && ` · ${a.nota}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-ok text-xs font-mono">+{fmt(a.monto)}</p>
                  <button
                    onClick={() => handleEliminarAportacion(a)}
                    aria-label="Eliminar aportación"
                    className="icon-btn text-gray-500 hover:text-bad"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="btn-ghost w-full py-2.5 text-sm mt-4">Cerrar</button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function MetasPage() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: metas = [], isPending } = useMetas()
  const { data: cuentas = [] }          = useCuentas()
  const eliminar = useEliminarMeta()

  const [formOpen, setFormOpen]         = useState(false)
  const [editMeta, setEditMeta]         = useState(null)
  const [aportarMeta, setAportarMeta]   = useState(null)
  const [detalleMeta, setDetalleMeta]   = useState(null)

  const activas    = metas.filter((m) => !m.completada)
  const completadas = metas.filter((m) => m.completada)

  const totalObjetivo = activas.reduce((s, m) => s + Number(m.monto_objetivo), 0)
  const totalActual   = activas.reduce((s, m) => s + Number(m.monto_actual), 0)
  const pctGeneral    = totalObjetivo > 0 ? Math.round((totalActual / totalObjetivo) * 100) : 0

  const handleDelete = async (m) => {
    if (!(await confirmar({ message: `¿Eliminar la meta "${m.nombre}"?` }))) return
    try { await eliminar.mutateAsync(m.id); toast.success('Meta eliminada') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        {metas.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-surface-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Metas activas</p>
                <p className="text-lg font-bold text-white">{activas.length}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Ahorrado</p>
                <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(totalActual)}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Objetivo</p>
                <p className="text-sm font-bold font-mono text-white">{fmt(totalObjetivo)}</p>
              </div>
            </div>
            <div className="h-2 bg-surface-500 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${pctGeneral}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-1">{pctGeneral}% del total</p>
          </>
        )}
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-48" />)}</div>
        ) : metas.length === 0 ? (
          <EmptyState emoji="🎯" title="Sin metas de ahorro"
            description="Crea tu primera meta: viaje, boda, fondo de emergencia..." />
        ) : (
          <div className="space-y-4">
            {/* Activas */}
            {activas.length > 0 && (
              <div className="space-y-3">
                {activas.map((m) => (
                  <MetaCard key={m.id} meta={m}
                    onEdit={(m) => { setEditMeta(m); setFormOpen(true) }}
                    onDelete={handleDelete}
                    onAportar={setAportarMeta}
                    onDetalle={setDetalleMeta}
                  />
                ))}
              </div>
            )}

            {/* Completadas */}
            {completadas.length > 0 && (
              <div>
                <p className="section-label mb-3">✅ Completadas</p>
                <div className="space-y-3">
                  {completadas.map((m) => (
                    <MetaCard key={m.id} meta={m}
                      onEdit={(m) => { setEditMeta(m); setFormOpen(true) }}
                      onDelete={handleDelete}
                      onAportar={setAportarMeta}
                      onDetalle={setDetalleMeta}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={() => { setEditMeta(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormMeta open={formOpen} onClose={() => { setFormOpen(false); setEditMeta(null) }} meta={editMeta} />
      <FormAportacion open={!!aportarMeta} onClose={() => setAportarMeta(null)} meta={aportarMeta} />
      {detalleMeta && <DetalleMetaModal meta={detalleMeta} onClose={() => setDetalleMeta(null)} />}
    </>
  )
}

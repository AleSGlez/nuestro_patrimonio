// src/modules/suscripciones/SuscripcionesPage.jsx
// Suscripciones: cuánto pagan al mes, qué se cobra pronto y detalle con
// cobrar / pausar / cancelar. En computadora el detalle va a un lado de la lista.
import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, Check, Pause, Play, X } from 'lucide-react'
import {
  useSuscripciones, useCrearSuscripcion, useActualizarSuscripcion,
  useEliminarSuscripcion, useRegistrarSuscripcion,
  diasHasta, gastoAnual, FRECUENCIA_LABEL,
} from './hooks/useSuscripciones'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState, Input } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { useEsEscritorio } from '@hooks/useEsEscritorio'
import { fmt, cn, today, TIPO_EMOJI_CUENTA } from '@lib/utils'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const FRECUENCIAS = [
  { value: 'semanal',    label: 'Semanal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'bimestral',  label: 'Cada 2 meses' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
]

const EMOJIS = ['🔄','📺','🎵','🎮','☁️','📦','🏋️','📚','🍿','💊','🔐','📱','🌐','⚡','🎨','🎧']

const alMes = (sus) => gastoAnual(sus) / 12
const esPausada = (sus) => sus.estado === 'pausada'
// Vencida y por cobrar a mano (las domiciliadas se registran solas)
const porCobrar = (sus) => !esPausada(sus) && !sus.domiciliada && diasHasta(sus.proxima_fecha) <= 0

function quienLabel(sus, nombres) {
  if (sus.contexto === 'negocio') return 'Negocio'
  return sus.persona === 'p1' ? nombres.p1 : sus.persona === 'p2' ? nombres.p2 : 'Ambos'
}

function metodoLabel(sus, cuentasMap, tarjetasMap) {
  if (sus.tarjeta_id) return `💳 ${tarjetasMap[sus.tarjeta_id]?.nombre || 'Tarjeta'}`
  if (sus.cuenta_id) {
    const c = cuentasMap[sus.cuenta_id]
    return `${TIPO_EMOJI_CUENTA[c?.tipo] || '🏦'} ${c?.nombre || 'Cuenta'}`
  }
  return 'Sin método de pago'
}

function cuandoInfo(sus) {
  if (esPausada(sus)) return { texto: 'Pausada', clase: 'bg-white/[0.08] text-gray-300' }
  const d = diasHasta(sus.proxima_fecha)
  if (d < 0) return { texto: `Venció hace ${Math.abs(d)} d`, clase: 'bg-bad/20 text-red-300' }
  if (d === 0) return { texto: 'Hoy', clase: 'bg-warn/15 text-warn' }
  if (d <= 7) return { texto: `En ${d} d`, clase: 'bg-warn/15 text-warn' }
  return { texto: `En ${d} d`, clase: 'bg-white/[0.07] text-gray-300' }
}

const fechaLarga = (f) => {
  const s = format(parseISO(f), "EEEE d 'de' MMMM", { locale: es })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Formulario ────────────────────────────────────────────────
function ChipOpcion({ activo, onClick, children, className }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={cn('min-h-[40px] px-3 rounded-xl text-xs font-medium border transition-all whitespace-nowrap',
        activo ? 'bg-[var(--accent-muted)] border-[var(--accent)]/60 text-[var(--accent-light)]' : 'bg-surface-700 border-white/10 text-gray-200',
        className)}>
      {children}
    </button>
  )
}

function FormSuscripcion({ open, onClose, suscripcion = null }) {
  const toast = useToast()
  const { nombres } = useAppStore()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const crear = useCrearSuscripcion()
  const actualizar = useActualizarSuscripcion()
  const isEdit = Boolean(suscripcion)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]         = useState('')
  const [emoji, setEmoji]           = useState('🔄')
  const [verEmojis, setVerEmojis]   = useState(false)
  const [monto, setMonto]           = useState('')
  const [frecuencia, setFrecuencia] = useState('mensual')
  const [proximaFecha, setProxima]  = useState(today())
  const [quien, setQuien]           = useState('ambos') // p1 | p2 | ambos | negocio
  const [metodo, setMetodo]         = useState('')
  const [nota, setNota]             = useState('')
  const [domiciliada, setDomiciliada] = useState(false)

  // El form vive montado todo el tiempo: repoblar (o resetear) al abrir
  useEffect(() => {
    if (!open) return
    setVerEmojis(false)
    if (suscripcion) {
      setNombre(suscripcion.nombre || '')
      setEmoji(suscripcion.emoji || '🔄')
      setMonto(suscripcion.monto ? String(suscripcion.monto) : '')
      setFrecuencia(suscripcion.frecuencia || 'mensual')
      setProxima(suscripcion.proxima_fecha || today())
      setQuien(suscripcion.contexto === 'negocio' ? 'negocio' : (suscripcion.persona || 'ambos'))
      setMetodo(
        suscripcion.tarjeta_id ? `tarjeta:${suscripcion.tarjeta_id}`
        : suscripcion.cuenta_id ? `cuenta:${suscripcion.cuenta_id}`
        : ''
      )
      setNota(suscripcion.nota || '')
      setDomiciliada(Boolean(suscripcion.domiciliada))
    } else {
      setNombre(''); setEmoji('🔄'); setMonto(''); setFrecuencia('mensual')
      setProxima(today()); setQuien('ambos'); setMetodo(''); setNota('')
      setDomiciliada(false)
    }
  }, [open, suscripcion])

  const QUIENES = [['p1', nombres.p1], ['p2', nombres.p2], ['ambos', 'Pareja'], ['negocio', 'Negocio']]
  const metodos = [
    ...cuentas
      .filter((c) => (quien === 'negocio') === (c.persona === 'negocio'))
      .map((c) => ({ value: `cuenta:${c.id}`, label: `${TIPO_EMOJI_CUENTA[c.tipo] || '🏦'} ${c.nombre}` })),
    ...tarjetas.map((t) => ({ value: `tarjeta:${t.id}`, label: `💳 ${t.nombre}` })),
    { value: '', label: 'Sin método' },
  ]

  const vistaPrevia = { monto: Number(monto) || 0, frecuencia }

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa el monto'); return }

    const [tipoMetodo, idMetodo] = metodo.split(':')
    const payload = {
      nombre: nombre.trim(), emoji, monto: Number(monto),
      frecuencia, proxima_fecha: proximaFecha,
      persona: quien === 'negocio' ? 'ambos' : quien,
      contexto: quien === 'negocio' ? 'negocio' : 'personal',
      nota: nota.trim() || null,
      cuenta_id: tipoMetodo === 'cuenta' ? idMetodo : null,
      tarjeta_id: tipoMetodo === 'tarjeta' ? idMetodo : null,
    }
    // Solo se manda si aplica, así guardar funciona antes de la migración v3_28
    const dom = domiciliada && Boolean(metodo)
    if (dom || suscripcion?.domiciliada) payload.domiciliada = dom
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar suscripción' : 'Nueva suscripción'} className="lg:max-w-lg">
      <div className="flex gap-2.5 mb-3">
        <button type="button" onClick={() => setVerEmojis((v) => !v)} aria-label="Cambiar emoji" aria-expanded={verEmojis}
          className="w-[52px] h-[52px] flex-shrink-0 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/50 text-2xl">
          {emoji}
        </button>
        <div className="flex-1">
          <label htmlFor="sus-nombre" className="label">Nombre</label>
          <input id="sus-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Netflix, Spotify, iCloud…" className="input" autoFocus={!isEdit} />
        </div>
      </div>
      {verEmojis && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => { setEmoji(e); setVerEmojis(false) }}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg',
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700')}>{e}</button>
          ))}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="sus-monto" className="label">Monto por cobro</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400 font-mono">$</span>
          <input id="sus-monto" type="text" inputMode="decimal" value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00" className="input pl-10 text-2xl font-bold font-mono h-14" />
        </div>
      </div>

      <p className="label">Cada cuánto</p>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {FRECUENCIAS.map((f) => (
          <ChipOpcion key={f.value} activo={frecuencia === f.value} onClick={() => setFrecuencia(f.value)} className="rounded-full">{f.label}</ChipOpcion>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-surface-700 rounded-xl px-3 py-2">
          <p className="text-[10px] text-gray-400">Equivale al mes</p>
          <p className="font-mono text-[15px] font-bold text-[var(--accent-light)]">{fmt(alMes(vistaPrevia))}</p>
        </div>
        <div className="bg-surface-700 rounded-xl px-3 py-2">
          <p className="text-[10px] text-gray-400">Al año</p>
          <p className="font-mono text-[15px] font-bold text-white">{fmt(gastoAnual(vistaPrevia))}</p>
        </div>
      </div>

      <p className="label">Quién paga</p>
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {QUIENES.map(([v, label]) => (
          <ChipOpcion key={v} activo={quien === v} onClick={() => { setQuien(v); setMetodo('') }} className="px-1 truncate">{label}</ChipOpcion>
        ))}
      </div>

      <p className="label">Se cobra a</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {metodos.map((m) => (
          <ChipOpcion key={m.value || 'ninguno'} activo={metodo === m.value} onClick={() => setMetodo(m.value)}>{m.label}</ChipOpcion>
        ))}
      </div>

      <button
        type="button" role="switch" aria-checked={domiciliada && Boolean(metodo)}
        onClick={() => setDomiciliada((v) => !v)} disabled={!metodo}
        className="w-full flex items-center gap-3 bg-surface-700 border border-white/[0.08] rounded-xl px-3.5 py-3 mb-4 text-left disabled:opacity-50"
      >
        <span className="flex-1">
          <span className="block text-sm font-medium text-white">Domiciliada: se cobra sola</span>
          <span className="block text-[11px] text-gray-400 mt-0.5">
            {metodo ? 'La app registra el gasto sola cuando llega la fecha' : 'Elige a qué cuenta o tarjeta se cobra'}
          </span>
        </span>
        <span className={cn('w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0',
          domiciliada && metodo ? 'bg-[var(--accent)]' : 'bg-surface-500')}>
          <span className={cn('block w-5 h-5 rounded-full bg-white transition-transform',
            domiciliada && metodo && 'translate-x-5')} />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label htmlFor="sus-fecha" className="label">Próximo cobro</label>
          <input id="sus-fecha" type="date" value={proximaFecha} onChange={(e) => setProxima(e.target.value)} className="input" />
        </div>
        <Input label="Nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Plan, cuenta…" className="mb-0" />
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-3">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Agregar suscripción'}</>}
      </button>
    </Modal>
  )
}

export function FormSuscripcionGlobal({ open, onClose }) {
  return <FormSuscripcion open={open} onClose={onClose} />
}

// ── Resumen: cuánto pagan al mes y al año ────────────────────
function ResumenSuscripciones({ activas }) {
  const totalMes = activas.reduce((s, x) => s + alMes(x), 0)

  return (
    <div className="card p-4 mb-3 lg:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="section-label mb-0.5">Pagan al mes</p>
          <p className="text-[28px] lg:text-[32px] leading-tight font-bold font-mono text-white">{fmt(totalMes)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Al año</p>
          <p className="text-sm font-bold font-mono text-gray-200">{fmt(totalMes * 12)}</p>
        </div>
      </div>
    </div>
  )
}

// ── Fila de la lista ─────────────────────────────────────────
function FilaSuscripcion({ sus, sub, activa, onOpen, onCobrar, onReanudar }) {
  const cuando = cuandoInfo(sus)
  const dias = diasHasta(sus.proxima_fecha)
  const pausada = esPausada(sus)
  return (
    <div className={cn('flex items-center gap-2.5 pr-3 border-t border-white/[0.05] first:border-0',
      pausada && 'opacity-75', activa && 'lg:bg-[var(--accent-muted)]')}>
      <button onClick={() => onOpen(sus)} className="flex-1 min-w-0 flex items-center gap-3 min-h-[62px] py-2 pl-3 text-left lg:hover:bg-white/[0.03]">
        <span className={cn('w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-[19px]',
          !pausada && dias < 0 ? 'bg-bad/[0.12]' : !pausada && dias === 0 ? 'bg-warn/[0.12]' : 'bg-surface-700')}>
          {sus.emoji || '🔄'}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white truncate">{sus.nombre}</span>
            {sus.contexto === 'negocio' && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-warn bg-warn/[0.14] px-1.5 py-0.5 rounded-md">Negocio</span>
            )}
            {sus.domiciliada && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-blue-300 bg-info/[0.15] px-1.5 py-0.5 rounded-md">Domiciliada</span>
            )}
          </span>
          <span className="block text-[11px] text-gray-400 truncate mt-0.5">{sub}</span>
        </span>
        <span className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-semibold font-mono text-white">
            {fmt(sus.monto)}{sus.frecuencia === 'anual' && <span className="text-[10px] text-gray-400">/año</span>}
          </span>
          <span className={cn('text-[10px] font-semibold px-1.5 py-px rounded-full whitespace-nowrap', cuando.clase)}>{cuando.texto}</span>
        </span>
      </button>
      {porCobrar(sus) && (
        <button onClick={() => onCobrar(sus)} className="flex-shrink-0 min-h-[36px] px-2.5 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold inline-flex items-center gap-1">
          <Check size={12} strokeWidth={3} /> Cobrar
        </button>
      )}
      {pausada && (
        <button onClick={() => onReanudar(sus)} className="flex-shrink-0 min-h-[36px] px-2.5 rounded-xl bg-surface-700 border border-white/10 text-gray-200 text-[11px] font-semibold">
          Reanudar
        </button>
      )}
    </div>
  )
}

// ── Detalle (Modal en celular, panel en computadora) ─────────
function Contenedor({ enPanel, onClose, children }) {
  if (!enPanel) return <Modal open onClose={onClose}>{children}</Modal>
  return (
    <div className="relative bg-surface-800 border border-white/[0.06] rounded-2xl p-5">
      <button onClick={onClose} aria-label="Cerrar detalle" className="icon-btn absolute top-2 right-2 text-gray-400 hover:text-white">
        <X size={16} />
      </button>
      {children}
    </div>
  )
}

function DetalleSuscripcion({ sus, enPanel = false, metodo, quien, onClose, onEditar, onCobrar, onPausar, onReanudar, onCancelar }) {
  const pausada = esPausada(sus)
  const dias = diasHasta(sus.proxima_fecha)
  const porPersona = sus.contexto !== 'negocio' && sus.persona === 'ambos'
  const cuandoTxt = dias < 0 ? `venció hace ${Math.abs(dias)} d` : dias === 0 ? 'hoy' : `en ${dias} días`

  return (
    <Contenedor enPanel={enPanel} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4 pr-8">
        <span className="w-14 h-14 flex-shrink-0 rounded-2xl bg-surface-700 flex items-center justify-center text-[27px]">{sus.emoji || '🔄'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-white truncate">{sus.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {FRECUENCIA_LABEL[sus.frecuencia]} · {quien} · {sus.contexto === 'negocio' ? 'Negocio' : 'Personal'}
          </p>
        </div>
        <button onClick={() => onEditar(sus)} aria-label="Editar suscripción" className="icon-btn text-gray-400 hover:text-white">
          <Pencil size={16} />
        </button>
      </div>

      {pausada ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-3.5 py-3 mb-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Pausada</p>
          <p className="text-sm text-gray-200">No cuenta en el total ni se cobra hasta que la reanudes.</p>
        </div>
      ) : (
        <div className={cn('rounded-2xl px-3.5 py-3 mb-2.5 flex items-center justify-between gap-3 border',
          dias < 0 ? 'bg-bad/[0.09] border-bad/30' : 'bg-warn/[0.09] border-warn/30')}>
          <div>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-0.5', dias < 0 ? 'text-red-300' : 'text-warn')}>
              {sus.domiciliada ? 'Se registra solo' : 'Próximo cobro'} · {cuandoTxt}
            </p>
            <p className="text-sm font-semibold text-white">{fechaLarga(sus.proxima_fecha)}</p>
          </div>
          <p className="font-mono text-xl font-bold text-white">{fmt(sus.monto)}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        {[
          ['Al mes', fmt(alMes(sus))],
          ['Al año', fmt(gastoAnual(sus))],
          [porPersona ? 'Por persona' : 'Por cobro', fmt(porPersona ? Number(sus.monto) / 2 : sus.monto)],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface-700 rounded-xl px-2.5 py-2">
            <p className="text-[10px] text-gray-400">{k}</p>
            <p className="font-mono text-[13px] font-bold text-white truncate">{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-700 rounded-2xl px-3.5 mb-3.5">
        <div className="flex justify-between items-center gap-3 min-h-[46px] border-b border-white/[0.06]">
          <span className="text-xs text-gray-400">Se cobra a</span>
          <span className="text-[13px] font-medium text-white text-right">{metodo}</span>
        </div>
        <div className="flex justify-between items-center gap-3 min-h-[46px] border-b border-white/[0.06]">
          <span className="text-xs text-gray-400">Cobro</span>
          <span className="text-[13px] font-medium text-white text-right">{sus.domiciliada ? 'Domiciliado (se registra solo)' : 'Manual'}</span>
        </div>
        <div className={cn('flex justify-between items-center gap-3 min-h-[46px]', sus.nota && 'border-b border-white/[0.06]')}>
          <span className="text-xs text-gray-400">Último cobro</span>
          <span className="text-[13px] font-medium text-white text-right">
            {sus.ultimo_pago_fecha ? format(parseISO(sus.ultimo_pago_fecha), "d MMM", { locale: es }) : 'Aún no se registra'}
          </span>
        </div>
        {sus.nota && (
          <div className="flex justify-between items-center gap-3 min-h-[46px]">
            <span className="text-xs text-gray-400">Nota</span>
            <span className="text-[13px] font-medium text-white text-right">{sus.nota}</span>
          </div>
        )}
      </div>

      {pausada ? (
        <button onClick={() => onReanudar(sus)} className="btn-primary w-full min-h-[50px] text-sm font-semibold mb-2">
          <Play size={15} /> Reanudar
        </button>
      ) : sus.domiciliada ? (
        <button onClick={() => onCobrar(sus)} className="btn-ghost w-full min-h-[46px] text-[13px] font-semibold mb-2">
          <Check size={14} strokeWidth={2.6} /> Registrar ahora
        </button>
      ) : (
        <button onClick={() => onCobrar(sus)} className="btn-primary w-full min-h-[50px] text-sm font-semibold mb-2">
          <Check size={15} strokeWidth={2.6} /> Registrar cobro ahora
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        {!pausada ? (
          <button onClick={() => onPausar(sus)} className="btn-ghost min-h-[46px] text-[13px] font-semibold">
            <Pause size={14} /> Pausar
          </button>
        ) : <span />}
        <button onClick={() => onCancelar(sus)} className="min-h-[46px] rounded-xl text-[13px] font-semibold text-bad inline-flex items-center justify-center gap-1.5">
          <X size={14} /> Cancelar
        </button>
      </div>
    </Contenedor>
  )
}

// ── Página ────────────────────────────────────────────────────
const FILTROS = [['todas', 'Todas'], ['personal', 'Personal'], ['negocio', 'Negocio'], ['pausadas', 'Pausadas']]

function pasaFiltro(sus, filtro) {
  if (filtro === 'pausadas') return esPausada(sus)
  if (esPausada(sus)) return false
  return filtro === 'todas' || (filtro === 'negocio') === (sus.contexto === 'negocio')
}

export default function SuscripcionesPage() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { nombres } = useAppStore()
  const { data: suscripciones = [], isPending } = useSuscripciones()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const actualizar = useActualizarSuscripcion()
  const eliminar = useEliminarSuscripcion()
  const registrar = useRegistrarSuscripcion()
  const esEscritorio = useEsEscritorio()

  const [filtro, setFiltro]     = useState('todas')
  const [detalleId, setDetalleId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editSus, setEditSus]   = useState(null)

  const cuentasMap  = useMemo(() => Object.fromEntries(cuentas.map((c) => [c.id, c])), [cuentas])
  const tarjetasMap = useMemo(() => Object.fromEntries(tarjetas.map((t) => [t.id, t])), [tarjetas])

  const visibles = suscripciones.filter((s) => pasaFiltro(s, filtro))
  // El resumen sigue al filtro (Todas / Personal / Negocio); en Pausadas muestra todas las activas
  const activasResumen = suscripciones.filter((s) => pasaFiltro(s, filtro === 'pausadas' ? 'todas' : filtro))
  const detalle = suscripciones.find((s) => s.id === detalleId) || null

  const grupos = useMemo(() => {
    const ordenadas = [...visibles].sort((a, b) => diasHasta(a.proxima_fecha) - diasHasta(b.proxima_fecha))
    const defs = filtro === 'pausadas'
      ? [{ titulo: 'Pausadas', test: () => true }]
      : [
          { titulo: 'Por cobrar', test: porCobrar, alerta: true },
          // Domiciliadas vencidas (aún no registradas) se quedan aquí, no en "Por cobrar"
          { titulo: 'Próximos 7 días', test: (s) => { const d = diasHasta(s.proxima_fecha); return !porCobrar(s) && d <= 7 } },
          { titulo: 'Más adelante', test: (s) => diasHasta(s.proxima_fecha) > 7 },
        ]
    return defs.map((g) => {
      const items = ordenadas.filter(g.test)
      return { ...g, items, total: items.reduce((s, x) => s + Number(x.monto), 0) }
    }).filter((g) => g.items.length > 0)
  }, [visibles, filtro])

  const abrirForm = (sus = null) => { setEditSus(sus); setFormOpen(true) }

  const handleCobrar = async (sus) => {
    if (!(await confirmar({ message: `¿Registrar el cargo de ${fmt(sus.monto)} de ${sus.nombre}?`, confirmLabel: 'Registrar', danger: false }))) return
    try {
      await registrar.mutateAsync({ suscripcion: sus, cuentas, tarjetas })
      toast.success('Cargo registrado ✅')
    } catch (e) { toast.error(e.message) }
  }

  const cambiarEstado = async (sus, estado, mensaje) => {
    try {
      await actualizar.mutateAsync({ id: sus.id, data: { estado } })
      toast.success(mensaje)
    } catch (e) { toast.error(e.message) }
  }

  const handleCancelar = async (sus) => {
    if (!(await confirmar({ message: `¿Cancelar "${sus.nombre}"? Ya no aparecerá en la lista.` }))) return
    try {
      await eliminar.mutateAsync(sus.id)
      setDetalleId(null)
      toast.success('Suscripción cancelada')
    } catch (e) { toast.error(e.message) }
  }

  const propsDetalle = detalle && {
    sus: detalle,
    metodo: metodoLabel(detalle, cuentasMap, tarjetasMap),
    quien: quienLabel(detalle, nombres),
    onClose: () => setDetalleId(null),
    onEditar: (s) => abrirForm(s),
    onCobrar: handleCobrar,
    onPausar: (s) => cambiarEstado(s, 'pausada', 'Suscripción pausada'),
    onReanudar: (s) => cambiarEstado(s, 'activa', 'Suscripción reanudada'),
    onCancelar: handleCancelar,
  }

  return (
    <>
      <div className="page px-4 pt-3 lg:px-10 lg:pt-8">
        <div className="lg:max-w-6xl">
          <div className="hidden lg:flex items-end justify-between mb-5">
            <div>
              <h1 className="text-[26px] font-extrabold text-white">Suscripciones</h1>
              <p className="text-sm text-gray-400">
                {suscripciones.filter((s) => !esPausada(s)).length} activas · {suscripciones.filter(esPausada).length} pausadas
              </p>
            </div>
            <button onClick={() => abrirForm()} className="btn-primary px-5 py-2.5 text-sm font-semibold">
              <Plus size={16} /> Nueva suscripción
            </button>
          </div>

          <div className="lg:flex lg:gap-6 lg:items-start">
            <div className="lg:flex-1 lg:min-w-0">
              {isPending ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>
              ) : suscripciones.length === 0 ? (
                <EmptyState emoji="🔄" title="Sin suscripciones"
                  description="Agrega tus servicios recurrentes como Netflix, Spotify, gimnasio, etc."
                  action={<button onClick={() => abrirForm()} className="btn-primary px-6 py-2.5 text-sm"><Plus size={15} /> Agregar</button>} />
              ) : (
                <>
                  <ResumenSuscripciones activas={activasResumen} />

                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-1">
                    {FILTROS.map(([id, label]) => (
                      <button key={id} onClick={() => setFiltro(id)} aria-pressed={filtro === id}
                        className={cn('flex-shrink-0 min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                          filtro === id ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent-light)]'
                            : 'bg-surface-700 border-white/[0.06] text-gray-300')}>
                        {label} {suscripciones.filter((s) => pasaFiltro(s, id)).length}
                      </button>
                    ))}
                  </div>

                  {grupos.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">Nada por aquí</p>
                  ) : grupos.map((g) => (
                    <div key={g.titulo} className="mt-3.5">
                      <div className="flex items-baseline justify-between mb-1.5 px-0.5">
                        <span className={cn('section-label', g.alerta && 'text-warn')}>{g.titulo}</span>
                        <span className="text-[11px] font-mono font-semibold text-gray-400">{fmt(g.total)}</span>
                      </div>
                      <div className={cn('card overflow-hidden', g.alerta && '!border-warn/35')}>
                        {g.items.map((s) => (
                          <FilaSuscripcion key={s.id} sus={s}
                            sub={`${FRECUENCIA_LABEL[s.frecuencia]} · ${metodoLabel(s, cuentasMap, tarjetasMap)} · ${quienLabel(s, nombres)}`}
                            activa={s.id === detalleId}
                            onOpen={(x) => setDetalleId(x.id)}
                            onCobrar={handleCobrar}
                            onReanudar={(x) => cambiarEstado(x, 'activa', 'Suscripción reanudada')}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Computadora: detalle a un lado */}
            <aside className="hidden lg:block w-96 flex-shrink-0 sticky top-0">
              {esEscritorio && propsDetalle ? (
                <DetalleSuscripcion enPanel {...propsDetalle} />
              ) : (
                <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-sm text-gray-400">
                  Elige una suscripción para ver su detalle
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <button onClick={() => abrirForm()} aria-label="Nueva suscripción" className="fab lg:hidden">
        <Plus size={24} />
      </button>

      {!esEscritorio && propsDetalle && <DetalleSuscripcion {...propsDetalle} />}

      <FormSuscripcion
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSus(null) }}
        suscripcion={editSus}
      />
    </>
  )
}

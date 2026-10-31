// src/modules/metas/MetasPage.jsx
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useMetas, useEliminarMeta, useTodasAportaciones, calcularMeta, calcularRitmo, ESTADO_META, fmtMesAño } from './hooks/useMetas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import AnilloMeta from './components/AnilloMeta'
import FormMeta from './components/FormMeta'
import FormAportacion from './components/FormAportacion'
import DetalleMeta from './components/DetalleMeta'
import { fmt, fmtDate, cn, currentMonth, PALETTE } from '@lib/utils'

// Color de la meta: el guardado, o uno de la paleta según su posición
const colorDeMeta = (meta, i) => meta.color || PALETTE[(i + 4) % PALETTE.length]

// ── Card de meta ──────────────────────────────────────────────
function MetaCard({ meta, color, aportaciones, nombres, onDetalle, onAportar }) {
  const { objetivo, actual, faltante, pct } = calcularMeta(meta)
  const { estado, fechaEstimada, necesarioQuincenal } = calcularRitmo(meta, aportaciones)
  const est = ESTADO_META[estado]
  const completada = estado === 'completada'
  const personaLabel = meta.persona === 'ambos' ? 'Pareja' : meta.persona === 'p1' ? nombres.p1 : nombres.p2

  const linea = [
    personaLabel,
    meta.fecha_objetivo ? `para el ${fmtDate(meta.fecha_objetivo, 'medium')}` : 'sin fecha',
    !completada && `faltan ${fmt(faltante)}`,
  ].filter(Boolean).join(' · ')

  const sugerencia =
    estado === 'sin_fecha'
      ? (fechaEstimada ? `A este ritmo llegan en ${fmtMesAño(fechaEstimada)}` : 'Agrega una fecha para saber el ritmo')
      : estado === 'atrasada'
        ? `${fmt(necesarioQuincenal)} por quincena · van atrasados`
        : `${fmt(necesarioQuincenal)} por quincena para llegar`

  return (
    <div className={cn('card overflow-hidden flex flex-col', estado === 'atrasada' && 'border border-warn/35')}>
      <button onClick={() => onDetalle(meta)} className="w-full flex items-center gap-3 px-3.5 pt-3 pb-2.5 text-left active:bg-white/[0.02]">
        <AnilloMeta pct={pct} color={completada ? '#22C55E' : color}>
          <span className="text-xl">{meta.emoji}</span>
        </AnilloMeta>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <p className="text-[15px] font-semibold text-white truncate">{meta.nombre}</p>
            <span className={cn('flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full', est.className)}>{est.label}</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[15px] font-bold font-mono text-white">{fmt(actual)}</span>
            <span className="text-[11px] text-gray-400">de {fmt(objetivo)} · {pct}%</span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{linea}</p>
        </div>
      </button>

      {!completada && (
        <div className="mt-auto flex items-center gap-2.5 pb-3 pr-3.5 pl-[86px]">
          <p className="flex-1 text-[11px] text-gray-300">{sugerencia}</p>
          <button
            onClick={() => onAportar(meta)}
            className="flex-shrink-0 inline-flex items-center gap-1 min-h-[36px] px-3 rounded-xl text-xs font-semibold bg-[var(--accent-muted)] border border-[var(--accent)]/40 text-[var(--accent-light)]"
          >
            <Plus size={13} strokeWidth={2.6} /> Aportar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Resumen: total ahorrado, reparto por meta y aportes del mes ──
function ResumenMetas({ activas, colores, aportaciones, metas, nombres }) {
  const totalObjetivo = activas.reduce((s, m) => s + Number(m.monto_objetivo), 0)
  const totalActual   = activas.reduce((s, m) => s + Number(m.monto_actual), 0)
  const pctGeneral    = totalObjetivo > 0 ? Math.round((totalActual / totalObjetivo) * 100) : 0

  // Aportes de este mes, por quién aportó (las viejas sin persona: la de su meta)
  const mes = currentMonth()
  const personaDeMeta = Object.fromEntries(metas.map((m) => [m.id, m.persona]))
  const delMes = aportaciones.filter((a) => a.fecha.startsWith(mes))
  const porPersona = { p1: 0, p2: 0, ambos: 0 }
  delMes.forEach((a) => {
    const p = a.persona || personaDeMeta[a.meta_id] || 'ambos'
    porPersona[p] = (porPersona[p] || 0) + Number(a.monto)
  })
  const totalMes = delMes.reduce((s, a) => s + Number(a.monto), 0)
  const desglose = [['p1', nombres.p1], ['p2', nombres.p2], ['ambos', 'Ambos']]
    .filter(([p]) => porPersona[p] > 0)
    .map(([p, label]) => `${label} ${fmt(porPersona[p])}`)

  return (
    <div className="card p-4 mb-3.5 lg:p-6 lg:mb-5 lg:flex lg:gap-8">
      <div className="lg:flex-1 lg:min-w-0">
      <p className="section-label mb-1">Ahorrado en metas</p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[28px] lg:text-[34px] font-bold font-mono text-white leading-tight">{fmt(totalActual)}</span>
        <span className="text-xs text-gray-400">de {fmt(totalObjetivo)}</span>
      </div>

      {/* Barra segmentada: el tramo de cada meta sobre el objetivo total */}
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-surface-500 mb-2.5">
        {activas.map((m) => (
          <div key={m.id} style={{
            width: `${totalObjetivo > 0 ? (Number(m.monto_actual) / totalObjetivo) * 100 : 0}%`,
            backgroundColor: colores[m.id],
          }} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 lg:mb-0">
        {activas.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1.5 text-[11px] lg:text-xs text-gray-300">
            <span className="w-2 h-2 rounded-[3px]" style={{ backgroundColor: colores[m.id] }} />
            {m.nombre}
          </span>
        ))}
        <span className="ml-auto text-[11px] lg:text-xs font-semibold text-white">{pctGeneral}%</span>
      </div>
      </div>

      {/* Escritorio: aportes del mes en su propia columna */}
      <div className="hidden lg:flex flex-col justify-center w-[260px] flex-shrink-0 pl-8 border-l border-white/[0.06]">
        <p className="section-label mb-1">Este mes aportaron</p>
        <p className={cn('text-2xl font-mono font-bold mb-2', totalMes > 0 ? 'text-ok' : 'text-gray-400')}>
          {totalMes > 0 ? '+' : ''}{fmt(totalMes)}
        </p>
        {[['p1', nombres.p1], ['p2', nombres.p2], ['ambos', 'Ambos']]
          .filter(([p]) => porPersona[p] > 0)
          .map(([p, label]) => (
            <div key={p} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-400">{label}</span>
              <span className="font-mono text-gray-200">{fmt(porPersona[p])}</span>
            </div>
          ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06] lg:hidden">
        <span className="text-xs text-gray-300 flex-shrink-0">Este mes aportaron</span>
        <span className="text-xs text-gray-400 text-right">
          <span className={cn('font-mono font-bold', totalMes > 0 ? 'text-ok' : 'text-gray-400')}>
            {totalMes > 0 ? '+' : ''}{fmt(totalMes)}
          </span>
          {desglose.length > 0 && ` · ${desglose.join(' · ')}`}
        </span>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function MetasPage() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { nombres } = useAppStore()
  const { data: metas = [], isPending } = useMetas()
  const { data: aportaciones = [] } = useTodasAportaciones()
  const eliminar = useEliminarMeta()

  const [formOpen, setFormOpen]       = useState(false)
  const [editMeta, setEditMeta]       = useState(null)
  const [aportarId, setAportarId]     = useState(null)
  const [detalleId, setDetalleId]     = useState(null)
  const [tab, setTab]                 = useState('activas')

  const colores = useMemo(
    () => Object.fromEntries(metas.map((m, i) => [m.id, colorDeMeta(m, i)])),
    [metas]
  )
  const esCompletada = (m) => m.completada || Number(m.monto_actual) >= Number(m.monto_objetivo)
  const activas     = metas.filter((m) => !esCompletada(m))
  const completadas = metas.filter(esCompletada)
  const lista       = tab === 'activas' ? activas : completadas

  // Se guardan ids para que el detalle/aportar lean siempre la meta recién refrescada
  const aportarMeta = metas.find((m) => m.id === aportarId) || null
  const detalle     = metas.find((m) => m.id === detalleId) || null

  const abrirEditar = (m) => { setEditMeta(m); setFormOpen(true) }
  const handleDelete = async (m) => {
    if (!(await confirmar({ message: `¿Eliminar la meta "${m.nombre}"?` }))) return
    try {
      await eliminar.mutateAsync(m.id)
      setDetalleId(null)
      toast.success('Meta eliminada')
    } catch (e) { toast.error(e.message) }
  }

  const modales = (
    <>
      <FormMeta open={formOpen} onClose={() => { setFormOpen(false); setEditMeta(null) }} meta={editMeta} />
      <FormAportacion open={!!aportarMeta} onClose={() => setAportarId(null)} meta={aportarMeta} />
    </>
  )

  if (detalle) {
    return (
      <>
        <DetalleMeta
          meta={detalle} color={colores[detalle.id]}
          onBack={() => setDetalleId(null)}
          onEdit={abrirEditar}
          onDelete={handleDelete}
          onAportar={(m) => setAportarId(m.id)}
        />
        {modales}
      </>
    )
  }

  return (
    <>
      <div className="page px-4 pt-4 lg:px-10 lg:pt-8">
        <div className="lg:max-w-6xl">
        {/* Encabezado de escritorio (en móvil el título lo da la SubNav y "+" es el FAB) */}
        <div className="hidden lg:flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-[26px] font-extrabold text-white leading-tight">Metas</p>
            {!isPending && metas.length > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                {activas.length} {activas.length === 1 ? 'activa' : 'activas'} · {completadas.length} {completadas.length === 1 ? 'completada' : 'completadas'}
              </p>
            )}
          </div>
          <button onClick={() => { setEditMeta(null); setFormOpen(true) }} className="btn-primary px-4 py-2.5 text-sm font-semibold">
            <Plus size={16} /> Nueva meta
          </button>
        </div>

        {isPending ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-32" />)}</div>
        ) : metas.length === 0 ? (
          <EmptyState emoji="🎯" title="Sin metas de ahorro"
            description="Crea tu primera meta: viaje, boda, fondo de emergencia..." />
        ) : (
          <>
            {activas.length > 0 && (
              <ResumenMetas activas={activas} colores={colores} aportaciones={aportaciones} metas={metas} nombres={nombres} />
            )}

            {/* Activas / Completadas */}
            <div className="flex lg:inline-flex gap-1 bg-surface-700 rounded-xl p-1 mb-3 lg:mb-4">
              {[['activas', `Activas ${activas.length}`], ['completadas', `Completadas ${completadas.length}`]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
                  className={cn('flex-1 lg:flex-none lg:px-5 min-h-[38px] rounded-lg text-xs lg:text-sm font-semibold transition-all',
                    tab === id ? 'bg-surface-500 text-white' : 'text-gray-400'
                  )}>
                  {label}
                </button>
              ))}
            </div>

            {lista.length === 0 ? (
              <EmptyState
                emoji={tab === 'activas' ? '🎯' : '🏁'}
                title={tab === 'activas' ? 'Sin metas activas' : 'Aún no completan ninguna'}
                description={tab === 'activas' ? 'Crea una meta nueva con el botón +' : 'Aquí aparecerán las metas que alcancen'}
              />
            ) : (
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3.5">
                {lista.map((m) => (
                  <MetaCard key={m.id} meta={m} color={colores[m.id]}
                    aportaciones={aportaciones} nombres={nombres}
                    onDetalle={(m) => setDetalleId(m.id)}
                    onAportar={(m) => setAportarId(m.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      <button onClick={() => { setEditMeta(null); setFormOpen(true) }} aria-label="Nueva meta" className="fab lg:hidden">
        <Plus size={24} />
      </button>

      {modales}
    </>
  )
}

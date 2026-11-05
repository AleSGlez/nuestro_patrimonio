// src/modules/reportes/components/ReporteTendencias.jsx
import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useAppStore } from '@store/appStore'
import { EmptyState } from '@ui/Field'
import { fmt, fmtDate, cn } from '@lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { calcularTendencias, frasesDelMes } from '../tendencias'

// Ámbar = subió, azul = bajó (no rojo/verde: subir no siempre es malo)
const COLOR_DIR = { sube: 'text-warn', baja: 'text-sky-400', igual: 'text-gray-400' }
const PUNTO_DIR = { sube: 'bg-warn', baja: 'bg-sky-400', igual: 'bg-gray-500' }
const TRAZO_DIR = { sube: '#F59E0B', baja: '#38BDF8', igual: '#9CA3AF' }
const COLOR_PERSONA = { p1: '#7C6EFA', p2: '#F59E0B', ambos: '#38BDF8' }
const TOOLTIP = { background: '#1a1a2e', border: 'none', borderRadius: 12, fontSize: 12 }

function Segmento({ opciones, valor, onChange }) {
  return (
    <div className="flex bg-surface-700 rounded-xl p-[3px]">
      {opciones.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn('px-3 py-1.5 rounded-[9px] text-[13px] transition-all',
            valor === o.value ? 'bg-[var(--accent)] text-white font-semibold' : 'text-gray-400 font-medium hover:text-white')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Tarjeta({ titulo, subtitulo, extra, className, children }) {
  return (
    <div className={cn('card p-4 lg:p-5 min-w-0', className)}>
      {titulo && (
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[15px] font-semibold text-white">{titulo}</p>
          {extra}
        </div>
      )}
      {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
      {children}
    </div>
  )
}

function Cambio({ direccion, cambio, corto }) {
  if (direccion === 'igual' || cambio == null) {
    return <span className="text-[11px] font-semibold text-gray-400">{corto ? 'igual' : 'igual que siempre'}</span>
  }
  return (
    <span className={cn('text-[11px] font-semibold', COLOR_DIR[direccion])}>
      {direccion === 'sube' ? '▲' : '▼'} {Math.abs(cambio)}%
    </span>
  )
}

function Sparkline({ serie, color, ancho = 64, alto = 26 }) {
  if (serie.length < 2) return <span style={{ width: ancho }} />
  const max = Math.max(...serie), min = Math.min(...serie), r = (max - min) || 1
  const puntos = serie.map((v, i) =>
    `${((i * ancho) / (serie.length - 1)).toFixed(1)},${(alto - 2 - ((v - min) / r) * (alto - 4)).toFixed(1)}`).join(' ')
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true" className="flex-shrink-0">
      <polyline points={puntos} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function FilaCategoria({ c, abierta, onToggle }) {
  return (
    <div className="border-t border-white/[0.05]">
      <button onClick={onToggle} aria-expanded={abierta}
        className="w-full flex items-center gap-3 py-2.5 text-left active:bg-white/[0.03] lg:hover:bg-white/[0.02]">
        <span className="text-lg flex-shrink-0">{c.info.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{c.info.label}</p>
          <p className="text-[11px] text-gray-400">suelen llevar {fmt(c.base)}</p>
        </div>
        <Sparkline serie={c.serie} color={TRAZO_DIR[c.direccion]} />
        <span className="hidden lg:block w-28 text-right text-[13px] font-mono text-gray-400">{fmt(c.promedioMensual)}</span>
        <div className="w-24 text-right flex-shrink-0">
          <p className="text-[13px] font-bold font-mono text-white">{fmt(c.actual)}</p>
          <Cambio direccion={c.direccion} cambio={c.cambio} corto />
        </div>
        <ChevronDown size={14} className={cn('text-gray-500 flex-shrink-0 transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <div className="pb-3 pl-9 space-y-1.5">
          {c.movimientos.length === 0
            ? <p className="text-xs text-gray-500">Sin gastos de esta categoría este mes</p>
            : c.movimientos.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-300 truncate">{m.descripcion || c.info.label}{m.subcategoria && <span className="text-gray-500"> · {m.subcategoria}</span>}</span>
                <span className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-gray-500">{fmtDate(m.fecha, 'short')}</span>
                  <span className="font-mono text-white">{fmt(m.m)}</span>
                </span>
              </div>
            ))}
          {c.movimientos.length > 8 && <p className="text-[11px] text-gray-500">y {c.movimientos.length - 8} más</p>}
        </div>
      )}
    </div>
  )
}

export default function ReporteTendencias({ transacciones, cargando }) {
  const nombres = useAppStore((s) => s.nombres)
  const [persona, setPersona] = useState('ambos')
  const [meses, setMeses]     = useState(6)
  const [abierta, setAbierta] = useState(null)

  const t = useMemo(() => calcularTendencias(transacciones, { persona, meses }), [transacciones, persona, meses])
  const frases = useMemo(() => frasesDelMes(t, fmt), [t])

  const nombreMes = format(new Date(), 'MMMM', { locale: es })
  const maxBarra = Math.max(...t.barras.map((b) => b.total), 1)
  const maxDia = Math.max(...t.semana.map((d) => d.promedio), 1)
  const diaTop = t.semana.find((d) => d.promedio === maxDia)
  const diaBajo = [...t.semana].filter((d) => d.promedio > 0).sort((a, b) => a.promedio - b.promedio)[0]

  const personas = [
    { value: 'ambos', label: 'Pareja' },
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
  ]

  if (cargando) {
    return (
      <div className="page px-4 pt-4 space-y-3 lg:px-10">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40" />)}
      </div>
    )
  }

  return (
    <div className="page px-4 pt-4 space-y-3.5 lg:px-10 lg:pt-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:content-start">
      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap lg:col-span-3">
        <Segmento opciones={personas} valor={persona} onChange={setPersona} />
        <Segmento valor={meses} onChange={setMeses}
          opciones={[{ value: 3, label: '3m' }, { value: 6, label: '6m' }, { value: 12, label: '12m' }]} />
      </div>

      {!t.hayHistoria && t.llevan === 0 ? (
        <div className="lg:col-span-3">
          <EmptyState emoji="📈" title="Aún no hay tendencias"
            description="Cuando registren gastos de al menos un mes completo, aquí verán cómo van contra su promedio" />
        </div>
      ) : (
        <>
          {/* Lo importante */}
          <div className="card p-4 lg:p-5 border border-[var(--accent-muted)]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--accent)] mb-3">Lo importante del mes</p>
            {frases.length === 0 ? (
              <p className="text-sm text-gray-400">Cuando tengan un mes completo de gastos, aquí verán cómo van contra su promedio.</p>
            ) : (
              <div className="space-y-3">
                {frases.map((f) => (
                  <div key={f.texto} className="flex gap-2.5 items-start">
                    <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', PUNTO_DIR[f.dir])} />
                    <p className="text-sm text-gray-200 leading-relaxed">{f.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ritmo del mes */}
          <Tarjeta titulo={<span className="capitalize">Ritmo de {nombreMes}</span>}
            extra={<span className="text-xs text-gray-400">día {t.diaHoy} de {t.diasMes}</span>}
            className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
              <div>
                <p className="text-[11px] text-gray-400">Llevan</p>
                <p className="text-base lg:text-xl font-bold font-mono text-bad">{fmt(t.llevan)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Van a cerrar en</p>
                <p className="text-base lg:text-xl font-bold font-mono text-warn">{t.proyeccion != null ? fmt(t.proyeccion) : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Promedio al mes</p>
                <p className="text-base lg:text-xl font-bold font-mono text-gray-300">{t.hayHistoria ? fmt(t.promTotal) : '—'}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={t.ritmo} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <XAxis dataKey="dia" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis hide domain={[0, 'dataMax']} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(d) => `Día ${d}`} contentStyle={TOOLTIP} />
                {t.hayHistoria && <ReferenceLine y={t.promTotal} stroke="#6B7280" strokeDasharray="4 4" />}
                <Line dataKey="anterior" name="Mes pasado" stroke="#6B7280" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                <Line dataKey="proyeccion" name="Proyección" stroke="#7C6EFA" strokeWidth={2} strokeDasharray="3 4" dot={false} connectNulls isAnimationActive={false} />
                <Line dataKey="actual" name="Este mes" stroke="#7C6EFA" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-[3px] rounded bg-[#7C6EFA]" />Este mes</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-[#7C6EFA]" />Proyección</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-[3px] rounded bg-gray-500" />Mes pasado</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-gray-500" />Promedio</span>
            </div>
          </Tarjeta>

          {/* Gasto por mes */}
          <Tarjeta titulo="Gasto por mes" subtitulo="La línea punteada es su promedio"
            extra={t.hayHistoria && <Cambio direccion={t.direccionTotal} cambio={t.cambioTotal} />}>
            <div className="relative h-36 flex items-end gap-2 mt-4">
              {t.hayHistoria && (
                <div className="absolute left-0 right-0 border-t border-dashed border-gray-500 pointer-events-none"
                  style={{ bottom: `${(t.promTotal / maxBarra) * 112 + 20}px` }} />
              )}
              {t.barras.map((b) => (
                <div key={b.mes} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-gray-400">{b.total >= 1000 ? `${Math.round(b.total / 1000)}k` : Math.round(b.total)}</span>
                  <div className={cn('w-full max-w-[34px] rounded-t-md rounded-b-sm', b.esActual ? 'bg-[var(--accent)]' : 'bg-surface-500')}
                    style={{ height: `${Math.max(2, (b.total / maxBarra) * 112)}px` }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              {t.barras.map((b) => (
                <span key={b.mes} className={cn('flex-1 text-center text-[11px]', b.esActual ? 'text-white font-medium' : 'text-gray-400')}>{b.label}</span>
              ))}
            </div>
          </Tarjeta>

          {/* Categorías */}
          <Tarjeta titulo="Cómo va cada categoría"
            subtitulo={`Este mes contra lo que suelen llevar al día ${t.diaHoy} · toca una para ver sus gastos`}
            className="lg:col-span-2">
            <div className="hidden lg:flex items-center gap-3 mt-3 pb-1.5 text-[10px] uppercase tracking-wider text-gray-500">
              <span className="w-6" /><span className="flex-1">Categoría</span><span className="w-16">Meses</span>
              <span className="w-28 text-right">Promedio mes</span><span className="w-24 text-right">Este mes</span><span className="w-3.5" />
            </div>
            <div className="mt-2 lg:mt-0">
              {t.categorias.map((c) => (
                <FilaCategoria key={c.categoria} c={c} abierta={abierta === c.categoria}
                  onToggle={() => setAbierta(abierta === c.categoria ? null : c.categoria)} />
              ))}
            </div>
          </Tarjeta>

          {/* Gastos que se repiten */}
          <Tarjeta titulo="Gastos que se repiten" subtitulo="Lo chiquito que, sumado, pesa · últimos 30 días">
            {t.repetidos.length === 0 ? (
              <p className="text-xs text-gray-500 mt-3">No hay gastos chicos que se repitan 3 veces o más</p>
            ) : (
              <div className="mt-2">
                {t.repetidos.map((r) => (
                  <div key={r.nombre} className="flex items-center gap-3 py-2.5 border-t border-white/[0.05]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.nombre}</p>
                      <p className="text-[11px] text-gray-400">{r.veces} veces · {fmt(r.ticket)} c/u</p>
                    </div>
                    <p className="text-[13px] font-bold font-mono text-bad">{fmt(r.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>

          {/* Día de la semana */}
          <Tarjeta titulo="Qué día gastan más" subtitulo={`Promedio por día, últimos ${t.mesesConDatos || 1} ${t.mesesConDatos === 1 ? 'mes' : 'meses'}`}>
            <div className="h-24 flex items-end gap-2 mt-4">
              {t.semana.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={cn('w-full rounded-t-md rounded-b-sm', d === diaTop ? 'bg-[var(--accent)]' : 'bg-surface-500')}
                    style={{ height: `${Math.max(2, (d.promedio / maxDia) * 76)}px` }} />
                  <span className="text-[11px] text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
            {diaTop && diaTop.promedio > 0 && (
              <p className="text-[13px] text-gray-200 mt-3">
                Los <b>{diaTop.plural}</b> gastan en promedio <span className="font-mono font-bold">{fmt(diaTop.promedio)}</span>
                {diaBajo && diaBajo !== diaTop && <>; los {diaBajo.plural}, <span className="font-mono">{fmt(diaBajo.promedio)}</span></>}.
              </p>
            )}
          </Tarjeta>

          {/* Quién gasta */}
          {t.reparto.length > 0 && (
            <Tarjeta titulo="Quién gasta" subtitulo={`${nombres.p1}, ${nombres.p2} y lo de los dos, por mes`}>
              <div className="space-y-2 mt-4">
                {t.reparto.map((r) => (
                  <div key={r.mes} className="flex items-center gap-2.5" title={`${nombres.p1} ${fmt(r.p1)} · ${nombres.p2} ${fmt(r.p2)} · Los dos ${fmt(r.ambos)}`}>
                    <span className="w-8 text-[11px] text-gray-400">{r.label}</span>
                    <div className="flex-1 h-3 flex rounded-md overflow-hidden bg-surface-700">
                      {['p1', 'p2', 'ambos'].map((p) => (
                        <div key={p} style={{ width: `${(r[p] / r.total) * 100}%`, background: COLOR_PERSONA[p] }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3.5 mt-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PERSONA.p1 }} />{nombres.p1}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PERSONA.p2 }} />{nombres.p2}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PERSONA.ambos }} />Los dos</span>
              </div>
            </Tarjeta>
          )}
        </>
      )}
    </div>
  )
}

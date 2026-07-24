// src/modules/calendario/CalendarioPage.jsx
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useSuscripciones } from '@modules/suscripciones/hooks/useSuscripciones'
import { quincenasDelMes, periodoTarjeta, fmt, cn } from '@lib/utils'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'

// Colores fijos por tipo de evento — consistentes en leyenda y grid
const COLOR_EVENTO = {
  quincena:      '#10B981',  // verde
  corte_tarjeta: '#F59E0B',  // amarillo/ámbar
  pago_tarjeta:  '#EF4444',  // rojo
  suscripcion:   '#7C6EFA',  // violeta
  manual:        '#6B7280',  // gris
}

function generarEventos(año, mes, tarjetas, suscripciones = []) {
  const eventos = []
  const mesStr = `${año}-${String(mes + 1).padStart(2, '0')}`

  const quincenas = quincenasDelMes(año, mes)
  quincenas.forEach((fecha, i) => {
    eventos.push({
      fecha, tipo: 'quincena',
      titulo: i === 0 ? '💰 1ra Quincena' : '💰 2da Quincena',
      color: COLOR_EVENTO.quincena,
    })
  })

  tarjetas.forEach((t) => {
    if (t.dia_corte) {
      const diaCorte = Number(t.dia_corte)
      const fechaCorte = `${año}-${String(mes + 1).padStart(2, '0')}-${String(diaCorte).padStart(2, '0')}`
      eventos.push({
        fecha: fechaCorte, tipo: 'corte_tarjeta',
        titulo: `✂️ Corte ${t.nombre}`,
        color: COLOR_EVENTO.corte_tarjeta,
        referencia: t,
      })
    }
    if (t.dia_limite_pago) {
      const diaLimite = Number(t.dia_limite_pago)
      const fechaLimite = `${año}-${String(mes + 1).padStart(2, '0')}-${String(diaLimite).padStart(2, '0')}`
      eventos.push({
        fecha: fechaLimite, tipo: 'pago_tarjeta',
        titulo: `📅 Pago ${t.nombre}`,
        subtitulo: `Sin intereses: ${fmt(t.pago_sin_intereses)}`,
        color: COLOR_EVENTO.pago_tarjeta,
        referencia: t,
      })
    }
  })

  // Suscripciones que caen en este mes
  suscripciones.forEach((s) => {
    if (s.proxima_fecha?.startsWith(mesStr)) {
      eventos.push({
        fecha: s.proxima_fecha,
        tipo: 'suscripcion',
        titulo: `${s.emoji} ${s.nombre}`,
        subtitulo: `${fmt(s.monto)} · ${s.frecuencia}`,
        color: COLOR_EVENTO.suscripcion,
        referencia: s,
      })
    }
  })

  return eventos
}

// ── Vista mensual ─────────────────────────────────────────────
function VistaMensual({ fecha, eventos, onDiaClick }) {
  const inicio = startOfMonth(fecha)
  const fin    = endOfMonth(fecha)
  const inicioGrid = startOfWeek(inicio, { weekStartsOn: 1 })
  const finGrid    = endOfWeek(fin,    { weekStartsOn: 1 })

  const dias = []
  let d = inicioGrid
  while (d <= finGrid) {
    dias.push(new Date(d))
    d = addDays(d, 1)
  }

  const eventosPorFecha = useMemo(() => {
    const map = {}
    eventos.forEach((e) => {
      if (!map[e.fecha]) map[e.fecha] = []
      map[e.fecha].push(e)
    })
    return map
  }, [eventos])

  const DIAS_SEMANA = ['L','M','M','J','V','S','D']

  return (
    <div>
      {/* Header días semana */}
      <div className="grid grid-cols-7 mb-1 lg:mb-0 lg:rounded-t-2xl lg:overflow-hidden">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400 py-1 lg:py-3 font-medium lg:bg-surface-800 lg:border-b lg:border-white/[0.06] lg:font-bold lg:uppercase lg:tracking-wider">{d}</div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5 lg:gap-px lg:bg-white/[0.06] lg:rounded-b-2xl lg:overflow-hidden">
        {dias.map((dia, i) => {
          const key = dia.toISOString().slice(0, 10)
          const eventosDelDia = eventosPorFecha[key] || []
          const esHoy = isToday(dia)
          const esMesActual = isSameMonth(dia, fecha)

          return (
            <button
              key={i}
              onClick={() => eventosDelDia.length > 0 && onDiaClick(dia, eventosDelDia)}
              className={cn(
                'relative rounded-xl lg:rounded-none p-1 lg:p-2 min-h-[48px] lg:min-h-[110px] text-left lg:align-top transition-all',
                esMesActual ? 'bg-surface-700/50 lg:bg-surface-900' : 'opacity-30 lg:opacity-100 lg:bg-surface-950',
                eventosDelDia.length > 0 && 'cursor-pointer active:scale-95',
                esHoy && 'ring-2 ring-[var(--accent)] lg:ring-inset lg:z-10'
              )}
            >
              <p className={cn(
                'text-[11px] lg:text-xs font-medium lg:font-mono mb-1 text-center lg:text-left',
                esHoy ? 'text-[var(--accent)] font-bold' : esMesActual ? 'text-white' : 'text-gray-600'
              )}>
                {format(dia, 'd')}
              </p>

              {/* Mobile: puntos de color */}
              <div className="space-y-0.5 lg:hidden">
                {eventosDelDia.slice(0, 2).map((e, j) => (
                  <div
                    key={j}
                    className="w-full h-1.5 rounded-full"
                    style={{ backgroundColor: e.color }}
                  />
                ))}
                {eventosDelDia.length > 2 && (
                  <p className="text-[9px] text-gray-400 text-center">+{eventosDelDia.length - 2}</p>
                )}
              </div>

              {/* Desktop: chips con etiqueta, hay espacio de sobra */}
              <div className="hidden lg:block space-y-1 mt-1">
                {eventosDelDia.slice(0, 3).map((e, j) => (
                  <div
                    key={j}
                    className="px-1.5 py-0.5 rounded truncate"
                    style={{ backgroundColor: `${e.color}1A`, borderLeft: `2px solid ${e.color}` }}
                  >
                    <p className="text-[9px] font-bold uppercase truncate" style={{ color: e.color }}>{e.titulo}</p>
                  </div>
                ))}
                {eventosDelDia.length > 3 && (
                  <p className="text-[9px] text-gray-500 font-medium">+{eventosDelDia.length - 3} más</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Vista semanal ─────────────────────────────────────────────
function VistaSemanal({ fecha, eventos }) {
  const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 })
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i))

  const eventosPorFecha = useMemo(() => {
    const map = {}
    eventos.forEach((e) => {
      if (!map[e.fecha]) map[e.fecha] = []
      map[e.fecha].push(e)
    })
    return map
  }, [eventos])

  return (
    <div className="space-y-1">
      {dias.map((dia, i) => {
        const key = dia.toISOString().slice(0, 10)
        const eventosDelDia = eventosPorFecha[key] || []
        const esHoy = isToday(dia)

        return (
          <div key={i} className={cn('card p-3', esHoy && 'border border-[var(--accent)]/40')}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0',
                esHoy ? 'bg-[var(--accent)]' : 'bg-surface-700'
              )}>
                <p className="text-[9px] text-gray-400 capitalize">{format(dia, 'EEE', { locale: es })}</p>
                <p className={cn('text-base font-bold leading-none', esHoy ? 'text-white' : 'text-white')}>
                  {format(dia, 'd')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                {eventosDelDia.length === 0 ? (
                  <p className="text-xs text-gray-600">Sin eventos</p>
                ) : (
                  <div className="space-y-1.5">
                    {eventosDelDia.map((e, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: e.color }} />
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium">{e.titulo}</p>
                          {e.subtitulo && <p className="text-[10px] text-gray-400">{e.subtitulo}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Modal detalle del día ─────────────────────────────────────
function DetalleDia({ dia, eventos, onClose }) {
  if (!dia) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-surface-800 rounded-t-3xl p-5 border-t border-white/10"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <p className="text-sm font-semibold text-white mb-3 capitalize">
          {format(dia, "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <div className="space-y-3">
          {eventos.map((e, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-surface-700 rounded-xl">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: e.color }} />
              <div>
                <p className="text-sm font-medium text-white">{e.titulo}</p>
                {e.subtitulo && <p className="text-xs text-gray-400 mt-0.5">{e.subtitulo}</p>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-ghost w-full py-2.5 text-sm mt-4">Cerrar</button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function CalendarioPage() {
  const [vista, setVista]     = useState('mes')
  const [fecha, setFecha]     = useState(new Date())
  const [diaDetalle, setDiaDetalle] = useState(null)
  const [eventosDetalle, setEventosDetalle] = useState([])

  const { data: tarjetas = [] }      = useTarjetas()
  const { data: suscripciones = [] } = useSuscripciones()

  const año = fecha.getFullYear()
  const mes  = fecha.getMonth()

  const eventos = useMemo(() => generarEventos(año, mes, tarjetas, suscripciones), [año, mes, tarjetas, suscripciones])

  // Para vista semanal, también incluir eventos del mes adyacente
  const eventosSemana = useMemo(() => {
    const semInicio = startOfWeek(fecha, { weekStartsOn: 1 })
    const semFin    = endOfWeek(fecha,   { weekStartsOn: 1 })
    const mesesNecesarios = new Set([semInicio.getMonth(), semFin.getMonth()])
    let todos = []
    mesesNecesarios.forEach((m) => {
      todos = [...todos, ...generarEventos(semInicio.getFullYear(), m, tarjetas, suscripciones)]
    })
    return todos
  }, [fecha, tarjetas, suscripciones])

  const navAnterior = () => vista === 'mes' ? setFecha(subMonths(fecha, 1)) : setFecha(subWeeks(fecha, 1))
  const navSiguiente = () => vista === 'mes' ? setFecha(addMonths(fecha, 1)) : setFecha(addWeeks(fecha, 1))

  const tituloNav = vista === 'mes'
    ? format(fecha, 'MMMM yyyy', { locale: es })
    : `${format(startOfWeek(fecha, { weekStartsOn: 1 }), 'd MMM', { locale: es })} – ${format(endOfWeek(fecha, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}`

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3 lg:!h-auto lg:px-10 lg:pt-8 lg:pb-0 lg:border-b-0 lg:bg-surface-950">
        <div className="lg:max-w-6xl lg:w-full">
          <div className="lg:flex lg:items-center lg:justify-between lg:mb-8">
            <div className="lg:flex lg:items-center lg:gap-8">
              {/* Navegación */}
              <div className="flex items-center justify-between lg:justify-start lg:gap-3">
                <button onClick={navAnterior} aria-label="Mes anterior" className="icon-btn lg:w-9 lg:h-9 lg:bg-surface-800 lg:rounded-lg text-gray-400 hover:text-white">
                  <ChevronLeft size={20} />
                </button>
                <p className="text-sm lg:text-2xl font-semibold lg:font-bold text-white capitalize lg:tracking-tight">{tituloNav}</p>
                <button onClick={navSiguiente} aria-label="Mes siguiente" className="icon-btn lg:w-9 lg:h-9 lg:bg-surface-800 lg:rounded-lg text-gray-400 hover:text-white">
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Toggle mes/semana */}
              <div className="flex bg-surface-700 rounded-xl p-1 mb-3 lg:mb-0 lg:bg-surface-900 lg:border lg:border-white/[0.06] mt-3 lg:mt-0">
                {[['mes','📅 Mes'],['semana','🗓️ Semana']].map(([id, label]) => (
                  <button key={id} onClick={() => setVista(id)}
                    className={cn('flex-1 py-2 lg:py-1.5 lg:px-4 text-xs font-medium lg:font-semibold rounded-lg transition-all',
                      vista === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
                    )}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Leyenda (desktop: junto al header) */}
            <div className="hidden lg:flex lg:items-center lg:gap-4">
              {[
                { color: COLOR_EVENTO.quincena,      label: 'Quincena' },
                { color: COLOR_EVENTO.corte_tarjeta, label: 'Corte tarjeta' },
                { color: COLOR_EVENTO.pago_tarjeta,  label: 'Pago tarjeta' },
                { color: COLOR_EVENTO.suscripcion,   label: 'Suscripción' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="page px-4 lg:px-10 pt-3 lg:pt-8">
        <div className="lg:max-w-6xl">
          {/* Leyenda (mobile) */}
          <div className="flex gap-3 mb-3 flex-wrap lg:hidden">
            {[
              { color: COLOR_EVENTO.quincena,      label: 'Quincena' },
              { color: COLOR_EVENTO.corte_tarjeta, label: 'Corte tarjeta' },
              { color: COLOR_EVENTO.pago_tarjeta,  label: 'Pago tarjeta' },
              { color: COLOR_EVENTO.suscripcion,   label: 'Suscripción' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                <p className="text-[10px] text-gray-400">{l.label}</p>
              </div>
            ))}
          </div>

          {vista === 'mes' ? (
            <VistaMensual
              fecha={fecha} eventos={eventos}
              onDiaClick={(dia, evs) => { setDiaDetalle(dia); setEventosDetalle(evs) }}
            />
          ) : (
            <VistaSemanal fecha={fecha} eventos={eventosSemana} />
          )}

          {/* Período tarjeta info */}
          {tarjetas.filter((t) => t.dia_corte).length > 0 && (
            <div className="mt-4 lg:mt-12 space-y-2 lg:space-y-3">
              <p className="section-label">Períodos de tarjeta</p>
              {tarjetas.filter((t) => t.dia_corte).map((t) => {
                const periodo = periodoTarjeta(t.dia_corte, fecha)
                return (
                  <div key={t.id} className="card p-3 lg:p-4 flex items-center gap-3 lg:gap-6">
                    <div className="w-2 lg:w-1 h-8 lg:self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <div className="flex-1">
                      <p className="text-xs lg:text-sm font-semibold lg:font-bold text-white">{t.nombre}</p>
                      <p className="text-[10px] lg:text-xs text-gray-400">
                        Período: {periodo.inicio} → {periodo.fin}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Sin intereses</p>
                      <p className="text-xs lg:text-lg font-mono lg:font-bold text-[var(--accent)] lg:text-white">{fmt(t.pago_sin_intereses)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {diaDetalle && (
        <DetalleDia dia={diaDetalle} eventos={eventosDetalle} onClose={() => setDiaDetalle(null)} />
      )}
    </>
  )
}

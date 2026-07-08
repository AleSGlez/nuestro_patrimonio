// src/modules/calendario/CalendarioPage.jsx
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
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
  manual:        '#7C6EFA',  // violeta
}

function generarEventos(año, mes, tarjetas) {
  const eventos = []

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
        color: COLOR_EVENTO.corte_tarjeta,  // siempre amarillo, no el color de la tarjeta
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
        color: COLOR_EVENTO.pago_tarjeta,   // siempre rojo
        referencia: t,
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
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-500 py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5">
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
                'relative rounded-xl p-1 min-h-[48px] text-left transition-all',
                esMesActual ? 'bg-surface-700/50' : 'opacity-30',
                eventosDelDia.length > 0 && 'cursor-pointer active:scale-95',
                esHoy && 'ring-2 ring-[var(--accent)]'
              )}
            >
              <p className={cn(
                'text-[11px] font-medium mb-1 text-center',
                esHoy ? 'text-[var(--accent)] font-bold' : esMesActual ? 'text-white' : 'text-gray-600'
              )}>
                {format(dia, 'd')}
              </p>
              <div className="space-y-0.5">
                {eventosDelDia.slice(0, 2).map((e, j) => (
                  <div
                    key={j}
                    className="w-full h-1.5 rounded-full"
                    style={{ backgroundColor: e.color }}
                  />
                ))}
                {eventosDelDia.length > 2 && (
                  <p className="text-[9px] text-gray-500 text-center">+{eventosDelDia.length - 2}</p>
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
                          {e.subtitulo && <p className="text-[10px] text-gray-500">{e.subtitulo}</p>}
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

  const { data: tarjetas = [] } = useTarjetas()

  const año = fecha.getFullYear()
  const mes  = fecha.getMonth()

  const eventos = useMemo(() => generarEventos(año, mes, tarjetas), [año, mes, tarjetas])

  // Para vista semanal, también incluir eventos del mes adyacente
  const eventosSemana = useMemo(() => {
    const semInicio = startOfWeek(fecha, { weekStartsOn: 1 })
    const semFin    = endOfWeek(fecha,   { weekStartsOn: 1 })
    const mesesNecesarios = new Set([semInicio.getMonth(), semFin.getMonth()])
    let todos = []
    mesesNecesarios.forEach((m) => {
      todos = [...todos, ...generarEventos(semInicio.getFullYear(), m, tarjetas)]
    })
    return todos
  }, [fecha, tarjetas])

  const navAnterior = () => vista === 'mes' ? setFecha(subMonths(fecha, 1)) : setFecha(subWeeks(fecha, 1))
  const navSiguiente = () => vista === 'mes' ? setFecha(addMonths(fecha, 1)) : setFecha(addWeeks(fecha, 1))

  const tituloNav = vista === 'mes'
    ? format(fecha, 'MMMM yyyy', { locale: es })
    : `${format(startOfWeek(fecha, { weekStartsOn: 1 }), 'd MMM', { locale: es })} – ${format(endOfWeek(fecha, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}`

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        {/* Toggle mes/semana */}
        <div className="flex bg-surface-700 rounded-xl p-1 mb-3">
          {[['mes','📅 Mes'],['semana','🗓️ Semana']].map(([id, label]) => (
            <button key={id} onClick={() => setVista(id)}
              className={cn('flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                vista === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
              )}
            >{label}</button>
          ))}
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between">
          <button onClick={navAnterior} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <p className="text-sm font-semibold text-white capitalize">{tituloNav}</p>
          <button onClick={navSiguiente} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="page px-4 pt-3">
        {/* Leyenda */}
        <div className="flex gap-3 mb-3 flex-wrap">
          {[
            { color: COLOR_EVENTO.quincena,      label: 'Quincena' },
            { color: COLOR_EVENTO.corte_tarjeta, label: 'Corte tarjeta' },
            { color: COLOR_EVENTO.pago_tarjeta,  label: 'Pago tarjeta' },
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
          <div className="mt-4 space-y-2">
            <p className="section-label">Períodos de tarjeta</p>
            {tarjetas.filter((t) => t.dia_corte).map((t) => {
              const periodo = periodoTarjeta(t.dia_corte, fecha)
              return (
                <div key={t.id} className="card p-3 flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">{t.nombre}</p>
                    <p className="text-[10px] text-gray-500">
                      Período: {periodo.inicio} → {periodo.fin}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500">Sin intereses</p>
                    <p className="text-xs font-mono text-[var(--accent)]">{fmt(t.pago_sin_intereses)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {diaDetalle && (
        <DetalleDia dia={diaDetalle} eventos={eventosDetalle} onClose={() => setDiaDetalle(null)} />
      )}
    </>
  )
}

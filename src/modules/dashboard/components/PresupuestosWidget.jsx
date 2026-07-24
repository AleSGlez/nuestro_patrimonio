// src/modules/dashboard/components/PresupuestosWidget.jsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '@store/appStore'
import { usePresupuestos, calcularDisponible, calcularDesglose } from '@modules/presupuestos/hooks/usePresupuestos'
import { fmt, cn, today } from '@lib/utils'
import { getDaysInMonth, startOfWeek } from 'date-fns'
import { montoParaPersona } from '@lib/utils'

const VISTAS = [
  { id: 'diario',   label: 'Hoy' },
  { id: 'semanal',  label: 'Semana' },
  { id: 'mensual',  label: 'Mes' },
]

// Calcula el disponible según la vista seleccionada.
// Si la vista coincide con el tipo del presupuesto: usa el cálculo normal de roll-over.
// Si la vista es más corta (ej: ver "diario" de un presupuesto mensual):
//   disponible_vista = desglose.porDia (o porSemana) - gastos_de_hoy (o esta semana)
function calcularParaVista(presupuesto, transacciones, vista) {
  const desglose = calcularDesglose(presupuesto)
  const hoy = new Date()
  const hoyStr = today() // fecha local — toISOString daba mañana después de las 6pm

  // Filtro base: solo gastos personales de la persona del presupuesto
  const personaCalculo = presupuesto.persona === 'ambos' ? null : presupuesto.persona
  const txFiltradas = transacciones.filter((t) => {
    if (t.tipo !== 'gasto' || t.contexto === 'negocio') return false
    if (presupuesto.persona === 'ambos') return true
    return t.persona === presupuesto.persona || t.persona === 'ambos'
  })

  if (vista === presupuesto.tipo) {
    return calcularDisponible(presupuesto, txFiltradas)
  }

  if (vista === 'diario' && desglose?.porDia) {
    const gastadoHoy = txFiltradas
      .filter((t) => t.fecha === hoyStr)
      .reduce((s, t) => s + montoParaPersona(t, personaCalculo), 0)
    const disponible = desglose.porDia - gastadoHoy
    const pctUsado = desglose.porDia > 0 ? Math.round((gastadoHoy / desglose.porDia) * 100) : 0
    return { disponible, presupuestoAcumulado: desglose.porDia, gastado: gastadoHoy, pctUsado }
  }

  if (vista === 'semanal' && desglose?.porSemana) {
    const inicioSemana = startOfWeek(hoy, { weekStartsOn: 1 }).toISOString().slice(0, 10)
    const gastadoSemana = txFiltradas
      .filter((t) => t.fecha >= inicioSemana)
      .reduce((s, t) => s + montoParaPersona(t, personaCalculo), 0)
    const disponible = desglose.porSemana - gastadoSemana
    const pctUsado = desglose.porSemana > 0 ? Math.round((gastadoSemana / desglose.porSemana) * 100) : 0
    return { disponible, presupuestoAcumulado: desglose.porSemana, gastado: gastadoSemana, pctUsado }
  }

  if (vista === 'mensual') {
    const diasMes = getDaysInMonth(hoy)
    const proyeccion = Number(presupuesto.monto_base) * (presupuesto.tipo === 'diario' ? diasMes : diasMes / 7)
    const { gastado } = calcularDisponible(presupuesto, txFiltradas)
    const disponible = proyeccion - gastado
    const pctUsado = proyeccion > 0 ? Math.round((gastado / proyeccion) * 100) : 0
    return { disponible, presupuestoAcumulado: proyeccion, gastado, pctUsado }
  }

  return calcularDisponible(presupuesto, txFiltradas)
}

export default function PresupuestosWidget({ transacciones, persona = null }) {
  const { setTab }  = useAppStore()
  const { data: presupuestos = [] } = usePresupuestos()
  const [vista, setVista] = useState('diario')

  if (presupuestos.length === 0) return null

  // Filtrar presupuestos por persona si se especifica
  const presupuestosFiltrados = persona
    ? presupuestos.filter((p) => p.persona === persona || p.persona === 'ambos')
    : presupuestos

  if (presupuestosFiltrados.length === 0) return null

  const items = presupuestosFiltrados.map((p) => ({
    ...p,
    ...calcularParaVista(p, transacciones, vista),
  }))

  const hayExcedidos = items.some((i) => i.disponible < 0)

  return (
    <div className="card p-4 mb-3">
      {/* Header con selector de vista */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">Presupuestos</p>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-700 rounded-lg p-0.5">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVista(v.id)}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] font-medium transition-all',
                  vista === v.id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTab('presupuestos')}
            className="text-[var(--accent)]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Lista de presupuestos */}
      <div className="space-y-3">
        {items.map((item) => {
          const excedido = item.disponible < 0
          const pct      = Math.min(item.pctUsado, 100)
          const barColor = item.pctUsado >= 100 ? 'bg-bad'
            : item.pctUsado >= 80 ? 'bg-warn' : 'bg-ok'

          return (
            <div key={item.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm flex-shrink-0">{item.emoji}</span>
                  <p className="text-xs text-gray-300 truncate">{item.nombre}</p>
                  {excedido && (
                    <span className="text-[9px] bg-bad/20 text-bad px-1 py-0.5 rounded-full flex-shrink-0">
                      ↑
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <p className={cn('text-xs font-mono font-semibold', excedido ? 'text-bad' : 'text-ok')}>
                    {excedido ? '-' : '+'}{fmt(Math.abs(item.disponible))}
                  </p>
                </div>
              </div>

              <div className="h-1.5 bg-surface-500 rounded-full overflow-hidden mb-0.5">
                <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
              </div>

              <div className="flex justify-between">
                <p className={cn('text-[10px]', excedido ? 'text-bad' : 'text-gray-600')}>
                  {item.pctUsado}%
                </p>
                <p className="text-[10px] text-gray-600">
                  {fmt(item.gastado)} / {fmt(item.presupuestoAcumulado)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {hayExcedidos && (
        <div className="mt-3 p-2 bg-bad/10 border border-bad/20 rounded-xl">
          <p className="text-[11px] text-bad text-center">⚠️ Hay presupuestos excedidos</p>
        </div>
      )}
    </div>
  )
}

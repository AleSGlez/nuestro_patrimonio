// src/modules/metas/components/DetalleMeta.jsx
// Detalle de una meta: ritmo vs lo necesario, aportes por mes e historial
import { ChevronLeft, Pencil, Trash2, Plus, Check, AlertCircle } from 'lucide-react'
import { format, subMonths, differenceInCalendarMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import AnilloMeta from './AnilloMeta'
import { useAportaciones, useEliminarAportacion, calcularMeta, calcularRitmo, ESTADO_META, fmtMesAño } from '../hooks/useMetas'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { fmt, fmtDate, cn } from '@lib/utils'

const PERSONA_ESTILO = {
  p1:    'text-[var(--accent-light)] bg-[var(--accent-muted)]',
  p2:    'text-sky-300 bg-sky-400/15',
  ambos: 'text-gray-300 bg-white/[0.08]',
}

export default function DetalleMeta({ meta, color, onBack, onEdit, onDelete, onAportar }) {
  const toast = useToast()
  const confirmar = useConfirm()
  const { nombres } = useAppStore()
  const { data: aportaciones = [] } = useAportaciones(meta.id)
  const { data: cuentas = [] } = useCuentas()
  const eliminarAportacion = useEliminarAportacion()

  const { objetivo, actual, faltante, pct, diasRestantes, aportacionMensual } = calcularMeta(meta)
  const { ritmoQuincenal, fechaEstimada, estado, necesarioQuincenal } = calcularRitmo(meta, aportaciones)
  const est = ESTADO_META[estado]
  const completada = estado === 'completada'
  const nombrePersona = (p) => (p === 'p1' ? nombres.p1 : p === 'p2' ? nombres.p2 : 'Ambos')
  const cuentaMeta = cuentas.find((c) => c.id === meta.cuenta_id)

  // Aportado por mes, últimos 6 meses
  const hoy = new Date()
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(hoy, 5 - i)
    const clave = format(d, 'yyyy-MM')
    const total = aportaciones
      .filter((a) => a.fecha.startsWith(clave))
      .reduce((s, a) => s + Number(a.monto), 0)
    return { clave, label: format(d, 'MMM', { locale: es }), total }
  })
  const necesarioMes = !completada && aportacionMensual ? aportacionMensual : null
  const tope = Math.max(...meses.map((m) => m.total), necesarioMes || 0) * 1.15 || 1
  const hayAportesRecientes = meses.some((m) => m.total > 0)

  // Diferencia entre la llegada estimada y la fecha objetivo, en meses
  const mesesDiferencia = fechaEstimada && meta.fecha_objetivo
    ? differenceInCalendarMonths(parseISO(meta.fecha_objetivo), fechaEstimada)
    : null

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
    <>
      <div className="top-header !h-auto pb-1 justify-between">
        <button onClick={onBack} aria-label="Volver a metas" className="icon-btn -ml-2 text-gray-200">
          <ChevronLeft size={20} />
        </button>
        <p className="text-[15px] font-bold text-white truncate px-2">{meta.nombre}</p>
        <button onClick={() => onEdit(meta)} aria-label="Editar meta" className="icon-btn -mr-2 text-gray-400 hover:text-white">
          <Pencil size={16} />
        </button>
      </div>

      <div className="page px-4 pt-2">
        {/* Anillo grande */}
        <div className="flex flex-col items-center text-center mb-4">
          <AnilloMeta pct={pct} color={completada ? '#22C55E' : color} size={156} grosor={12} label={`${pct}% de la meta`}>
            <span className="text-[26px] leading-none">{meta.emoji}</span>
            <span className="text-[26px] font-bold text-white mt-1">{pct}%</span>
          </AnilloMeta>
          <p className="text-[26px] font-bold font-mono text-white leading-tight mt-2.5">{fmt(actual)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            de {fmt(objetivo)}{faltante > 0 && <> · faltan <span className="text-white font-semibold">{fmt(faltante)}</span></>}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', est.className)}>{est.label}</span>
            <span className="text-[11px] text-gray-300 bg-white/[0.07] px-2.5 py-1 rounded-full">
              {meta.persona === 'ambos' ? 'Pareja' : nombrePersona(meta.persona)}
              {cuentaMeta && ` · ${cuentaMeta.nombre}`}
            </span>
          </div>
          {meta.descripcion && <p className="text-xs text-gray-400 mt-2">{meta.descripcion}</p>}
        </div>

        {!completada && (
          <button onClick={() => onAportar(meta)} className="btn-primary w-full py-3.5 text-sm font-semibold mb-3">
            <Plus size={16} /> Aportar a esta meta
          </button>
        )}

        {/* Ritmo */}
        {!completada && (
          <div className="card p-3.5 mb-3">
            {meta.fecha_objetivo ? (
              <>
                <p className="section-label mb-2.5">
                  Para llegar el {fmtDate(meta.fecha_objetivo, 'long')} · {Math.max(0, diasRestantes)} días
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-surface-700 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">Necesitan por quincena</p>
                    <p className="text-base font-bold font-mono text-[var(--accent-light)]">{fmt(necesarioQuincenal)}</p>
                  </div>
                  <div className="bg-surface-700 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">Llevan por quincena</p>
                    <p className={cn('text-base font-bold font-mono', estado === 'a_tiempo' ? 'text-ok' : 'text-warn')}>{fmt(ritmoQuincenal)}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="section-label mb-2.5">Sin fecha objetivo</p>
                <div className="bg-surface-700 rounded-xl px-3 py-2 mb-3">
                  <p className="text-[10px] text-gray-400 mb-0.5">Llevan por quincena (últimos 3 meses)</p>
                  <p className="text-base font-bold font-mono text-white">{fmt(ritmoQuincenal)}</p>
                </div>
              </>
            )}
            <div className="flex items-start gap-2 text-xs leading-relaxed text-gray-300">
              {estado === 'a_tiempo'
                ? <Check size={16} className="text-ok flex-shrink-0 mt-px" strokeWidth={2.6} />
                : <AlertCircle size={16} className="text-warn flex-shrink-0 mt-px" />}
              <span>
                {!fechaEstimada
                  ? 'Todavía no hay aportaciones recientes para calcular cuándo llegarían.'
                  : <>A este ritmo llegan en <span className="text-white font-semibold">{fmtMesAño(fechaEstimada)}</span>
                    {mesesDiferencia > 0 && `, unos ${mesesDiferencia} ${mesesDiferencia === 1 ? 'mes' : 'meses'} antes de la fecha.`}
                    {mesesDiferencia < 0 && `, ${Math.abs(mesesDiferencia)} ${mesesDiferencia === -1 ? 'mes' : 'meses'} tarde. Suban ${fmt(necesarioQuincenal - ritmoQuincenal)} por quincena para llegar a tiempo.`}
                    {mesesDiferencia === 0 && ', justo a tiempo.'}
                    {mesesDiferencia === null && '.'}
                  </>}
              </span>
            </div>
          </div>
        )}

        {/* Aportado por mes */}
        {hayAportesRecientes && (
          <div className="card p-3.5 mb-4">
            <div className="flex justify-between items-baseline mb-3">
              <p className="section-label">Aportado por mes</p>
              {necesarioMes && (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="w-3 border-t-2 border-dashed border-[var(--accent-light)]" />
                  {fmt(necesarioMes)} necesario al mes
                </span>
              )}
            </div>
            <div className="relative h-28 flex items-end gap-2.5 pb-[18px]">
              {necesarioMes && (
                <div
                  className="absolute inset-x-0 border-t-2 border-dashed border-[var(--accent-light)] opacity-70"
                  style={{ bottom: 18 + (necesarioMes / tope) * 94 }}
                />
              )}
              {meses.map((m) => (
                <div key={m.clave} className="relative flex-1 h-full flex flex-col justify-end items-center">
                  {m.total > 0 && (
                    <span className="text-[9px] font-mono text-gray-300 mb-0.5">
                      ${(m.total / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}k
                    </span>
                  )}
                  <div
                    className="w-full max-w-[34px] rounded-t-md rounded-b-sm"
                    style={{
                      height: Math.max(m.total > 0 ? 3 : 0, (m.total / tope) * 94),
                      backgroundColor: color,
                      opacity: necesarioMes && m.total < necesarioMes ? 0.45 : 1,
                    }}
                  />
                  <span className="absolute -bottom-0.5 text-[10px] text-gray-400 capitalize">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="flex justify-between items-baseline mb-2">
          <p className="section-label">Historial</p>
          <p className="text-[11px] text-gray-400">
            {aportaciones.length} {aportaciones.length === 1 ? 'aportación' : 'aportaciones'}
          </p>
        </div>
        {aportaciones.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Sin aportaciones registradas</p>
        ) : (
          <div className="card overflow-hidden mb-4">
            {aportaciones.map((a) => {
              const quien = a.persona || meta.persona
              const cuenta = cuentas.find((c) => c.id === a.cuenta_id)
              return (
                <div key={a.id} className="flex items-center gap-3 min-h-[58px] px-3 py-2 border-t border-white/[0.05] first:border-0">
                  <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0', PERSONA_ESTILO[quien] || PERSONA_ESTILO.ambos)}>
                    {nombrePersona(quien).slice(0, 4)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{a.nota || 'Aportación'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {fmtDate(a.fecha)}{cuenta ? ` · desde ${cuenta.nombre}` : ' · sin mover dinero'}
                    </p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-ok flex-shrink-0">+{fmt(a.monto)}</span>
                  <button
                    onClick={() => handleEliminarAportacion(a)}
                    aria-label="Eliminar aportación"
                    className="icon-btn -mr-1 text-gray-500 hover:text-bad flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button onClick={() => onDelete(meta)} className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-bad mb-2">
          <Trash2 size={13} /> Eliminar meta
        </button>
      </div>
    </>
  )
}

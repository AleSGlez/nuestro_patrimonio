// src/modules/cards/components/DetalleTarjeta.jsx
// Detalle de la tarjeta seleccionada: próximo pago (protagonista), números
// clave, acciones y — solo en escritorio — movimientos del período.
import { Check, BarChart3, Layers, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { fmt, fmtDate, cn } from '@lib/utils'
import { diasHasta, calcularFechasCorte, useMovimientosPeriodoTarjeta } from '../hooks/useTarjetas'

const plural = (n) => (n === 1 ? 'día' : 'días')

function LineaTiempo({ diasCorte, diasLimite, urgente }) {
  // Posiciones proporcionales a los días que faltan, con margen para que
  // las etiquetas no se corten en los extremos
  const horizonte = Math.max(diasLimite ?? 0, diasCorte ?? 0) + 3
  const pos = (d) => `${Math.max(8, Math.min(92, (d / horizonte) * 100))}%`
  const colorLimite = urgente ? 'text-bad' : 'text-white'
  const bgLimite = urgente ? 'bg-bad' : 'bg-white'

  return (
    <div className="relative h-10 mx-1 mt-5 mb-1">
      <div className="absolute inset-x-0 top-1.5 h-0.5 rounded-full bg-white/10" />
      {diasLimite != null && (
        <div className={cn('absolute left-0 top-1.5 h-0.5 rounded-full opacity-60', bgLimite)} style={{ width: pos(diasLimite) }} />
      )}
      <div className="absolute left-0 top-0">
        <div className="w-3.5 h-3.5 rounded-full bg-white" />
        <p className="mt-1.5 text-[11px] font-semibold text-gray-200 whitespace-nowrap">Hoy</p>
      </div>
      {diasCorte != null && (
        <div className="absolute top-px -translate-x-1/2 flex flex-col items-center" style={{ left: pos(diasCorte) }}>
          <div className="w-3 h-3 rounded-full bg-surface-900 border-2 border-gray-400" />
          <p className="mt-1.5 text-[11px] text-gray-400 whitespace-nowrap">Corte · {diasCorte} {plural(diasCorte)}</p>
        </div>
      )}
      {diasLimite != null && (
        <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: pos(diasLimite) }}>
          <div className={cn('w-3.5 h-3.5 rounded-full', bgLimite)} />
          <p className={cn('mt-1.5 text-[11px] font-semibold whitespace-nowrap', colorLimite)}>Límite</p>
        </div>
      )}
    </div>
  )
}

function Dato({ label, valor, className }) {
  return (
    <div className="card p-3 lg:px-3.5">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className={cn('font-mono text-[15px] lg:text-base font-bold mt-0.5', className)}>{valor}</p>
    </div>
  )
}

function MovimientosPeriodo({ tarjeta }) {
  const { data: movs = [], isPending } = useMovimientosPeriodoTarjeta(tarjeta)
  if (!tarjeta.dia_corte) return null

  return (
    <div className="card hidden lg:block px-5 py-4">
      <p className="section-label mb-2">Movimientos del periodo</p>
      {isPending ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-10" />)}</div>
      ) : movs.length === 0 ? (
        <p className="text-sm text-gray-500 py-3">Sin movimientos en este periodo</p>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {movs.map((m) => {
            const esIngreso = m.tipo === 'ingreso'
            return (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{m.descripcion || m.categoria}</p>
                  <p className="text-[11px] text-gray-400">{fmtDate(m.fecha)} · {m.categoria}</p>
                </div>
                <span className={cn('font-mono text-sm font-semibold', esIngreso ? 'text-ok' : 'text-bad')}>
                  {esIngreso ? '+' : '−'}{fmt(Math.abs(Number(m.monto)))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DetalleTarjeta({
  tarjeta, uso, disponible, comprometidoMSI, nombres,
  onPagar, onVerDesglose, onVerMSI, onEdit, onDelete,
}) {
  const { corte, limite } = calcularFechasCorte(tarjeta.dia_corte, tarjeta.dia_limite_pago)
  const diasCorte = diasHasta(corte)
  const diasLimite = diasHasta(limite)
  const urgente = diasLimite != null && diasLimite <= 3
  const tieneDeuda = Number(tarjeta.saldo_total) > 0
  const psi = Number(tarjeta.pago_sin_intereses) || 0

  const acciones = [
    tarjeta.dia_corte && { key: 'desglose', label: 'Desglose del corte', icon: BarChart3, onClick: () => onVerDesglose(tarjeta) },
    { key: 'msi', label: 'Compras a MSI', icon: Layers, extra: comprometidoMSI > 0 ? fmt(comprometidoMSI) : '', onClick: () => onVerMSI(tarjeta) },
    { key: 'editar', label: 'Editar tarjeta', icon: Pencil, onClick: () => onEdit(tarjeta) },
    { key: 'eliminar', label: 'Eliminar', icon: Trash2, peligro: true, onClick: () => onDelete(tarjeta) },
  ].filter(Boolean)

  const titularLabel = tarjeta.persona === 'ambos' && tarjeta.titular_principal
    ? `Titular: ${tarjeta.titular_principal === 'p1' ? nombres.p1 : nombres.p2} · Adicional: ${tarjeta.titular_principal === 'p1' ? nombres.p2 : nombres.p1}`
    : null

  return (
    <div className="flex flex-col gap-3 lg:gap-3.5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-3.5">

        {/* Próximo pago */}
        <div className={cn(
          'rounded-[18px] p-4 lg:p-5 flex flex-col border',
          urgente ? 'bg-bad/[0.08] border-bad/30' : 'bg-surface-800 border-white/[0.06]',
        )}>
          {limite ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className={cn('text-[11px] font-semibold tracking-wider uppercase', urgente ? 'text-bad' : 'text-gray-400')}>
                    {urgente ? 'Paga ya' : 'Próximo pago'}
                  </p>
                  <p className={cn('mt-1 text-[34px] lg:text-[42px] font-extrabold leading-none', urgente ? 'text-bad' : 'text-white')}>
                    {diasLimite}<span className="text-[15px] lg:text-base font-semibold ml-1">{plural(diasLimite)}</span>
                  </p>
                  <p className="mt-1.5 text-[11px] lg:text-xs text-gray-400">para pagar sin intereses</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400">Pago sin intereses</p>
                  <p className={cn('font-mono text-lg lg:text-xl font-bold mt-0.5', psi > 0 ? 'text-[var(--accent)]' : 'text-gray-500')}>
                    {psi > 0 ? fmt(psi) : 'Sin definir'}
                  </p>
                </div>
              </div>
              <LineaTiempo diasCorte={diasCorte} diasLimite={diasLimite} urgente={urgente} />
            </>
          ) : (
            <div>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-400">Próximo pago</p>
              <p className="mt-2 text-sm text-gray-400">
                {corte ? `Corte en ${diasCorte} ${plural(diasCorte)}. ` : ''}
                Configura el día de corte y límite de pago en “Editar tarjeta” para ver tus fechas.
              </p>
            </div>
          )}

          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onPagar(tarjeta)}
            disabled={!tieneDeuda}
            className="btn-primary mt-4 w-full min-h-[46px] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check size={16} strokeWidth={2.4} />
            {tieneDeuda ? 'Registrar pago' : 'Sin deuda'}
          </button>
        </div>

        {/* Números clave + acciones */}
        <div className="flex flex-col gap-3 lg:gap-3.5">
          <div className="grid grid-cols-2 gap-2 lg:gap-2.5">
            <Dato label="Disponible" valor={fmt(disponible)} className="text-ok" />
            <Dato label="Uso del crédito" valor={`${Math.round(uso)}%`}
              className={uso > 70 ? 'text-bad' : uso > 40 ? 'text-warn' : 'text-ok'} />
            <Dato label="En MSI" valor={fmt(comprometidoMSI)} className="text-gray-200" />
            <Dato label="Límite" valor={fmt(tarjeta.limite)} className="text-gray-200" />
          </div>

          {(titularLabel || (tarjeta.persona === 'ambos' && tarjeta.limite_adicional > 0)) && (
            <p className="text-[11px] text-gray-400 px-1 -mt-1">
              {titularLabel}
              {tarjeta.persona === 'ambos' && tarjeta.limite_adicional > 0 &&
                `${titularLabel ? ' · ' : ''}Límite adicional: ${fmt(tarjeta.limite_adicional)}`}
            </p>
          )}

          <div className="card overflow-hidden divide-y divide-white/[0.06] !p-0">
            {acciones.map(({ key, label, icon: Icon, extra, peligro, onClick }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="w-full min-h-[48px] lg:min-h-[44px] flex items-center gap-3 px-3.5 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
              >
                <span className={cn('w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0',
                  peligro ? 'bg-bad/[0.12] text-bad' : 'bg-surface-600 text-gray-300')}>
                  <Icon size={15} />
                </span>
                <span className={cn('flex-1 text-sm font-medium', peligro ? 'text-bad' : 'text-gray-200')}>{label}</span>
                {extra && <span className="text-xs text-gray-400 font-mono">{extra}</span>}
                <ChevronRight size={14} className="text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <MovimientosPeriodo tarjeta={tarjeta} />
    </div>
  )
}

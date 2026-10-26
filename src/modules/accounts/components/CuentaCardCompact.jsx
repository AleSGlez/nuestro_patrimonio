// src/modules/accounts/components/CuentaCardCompact.jsx
import { useState } from 'react'
import { Store, ChevronDown } from 'lucide-react'
import { useApartados } from '../hooks/useApartados'
import { fmt, cn } from '@lib/utils'

const TIPO_EMOJI = { debito: '💳', ahorro: '🏦', efectivo: '💵', inversion: '📈', transporte: '🚇' }
const TIPO_LABEL = { debito: 'Débito', ahorro: 'Ahorro', efectivo: 'Efectivo', inversion: 'Inversión', transporte: 'Transporte' }

// Dos botones HERMANOS, no uno anidado en otro (un <button> dentro de otro
// <button> es HTML inválido y rompe el foco/teclado) — el de arriba abre el
// detalle de la cuenta, el de abajo solo expande/colapsa sus apartados.
export default function CuentaCardCompact({ cuenta, onTap }) {
  const { data: apartados = [] } = useApartados(cuenta.id)
  const [abierto, setAbierto] = useState(false)

  const propios = apartados.filter((a) => !a.es_negocio)
  const totalApartado = propios.reduce((s, a) => s + Number(a.monto), 0)
  const tieneNegocio = apartados.some((a) => a.es_negocio)
  const hayApartados = propios.length > 0

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full z-10" style={{ backgroundColor: cuenta.color }} />

      <button
        onClick={() => onTap(cuenta)}
        className="block w-full text-left p-3.5 lg:p-5 active:scale-[0.99] transition-all"
      >
        <div className="flex items-center justify-between gap-1.5 mb-2 lg:mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base lg:text-lg flex-shrink-0">{TIPO_EMOJI[cuenta.tipo]}</span>
            <p className="text-xs lg:text-sm font-medium text-white truncate">{cuenta.nombre}</p>
            {tieneNegocio && <Store size={10} className="text-[var(--accent)] flex-shrink-0" />}
          </div>
          <span className="hidden lg:inline-block text-[9px] font-bold uppercase tracking-wide text-gray-500 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
            {TIPO_LABEL[cuenta.tipo]}
          </span>
        </div>
        <p className="text-base lg:text-2xl font-bold font-mono text-white leading-tight truncate">{fmt(cuenta.saldo)}</p>
        <p className="lg:hidden text-[9px] font-semibold uppercase tracking-wide text-gray-500 mt-0.5">{TIPO_LABEL[cuenta.tipo]}</p>
      </button>

      {hayApartados && (
        <>
          <button
            onClick={() => setAbierto((v) => !v)}
            className="flex items-center gap-1 w-full min-h-[40px] lg:min-h-[44px] px-3.5 lg:px-5 pb-2.5 lg:pb-3 border-t border-white/[0.06]"
          >
            <span className="text-[10px] lg:text-xs font-semibold text-gray-400 flex-1 text-left">
              {propios.length} apartado{propios.length === 1 ? '' : 's'} · {fmt(totalApartado)}
            </span>
            <ChevronDown size={11} className={cn('text-gray-400 transition-transform flex-shrink-0', abierto && 'rotate-180')} />
          </button>
          {abierto && (
            <div className="px-3.5 lg:px-5 pb-3 lg:pb-4 flex flex-col gap-2 lg:gap-2.5">
              {propios.map((a) => {
                const pct = a.meta_monto ? Math.min(100, (Number(a.monto) / Number(a.meta_monto)) * 100) : null
                return (
                  <div key={a.id}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[11px] lg:text-xs flex-shrink-0">{a.emoji}</span>
                      <span className="text-[10px] lg:text-xs text-gray-300 truncate flex-1">{a.nombre}</span>
                      <span className="text-[10px] lg:text-xs font-mono font-semibold text-[var(--accent)] flex-shrink-0">{fmt(a.monto)}</span>
                    </div>
                    {pct !== null && (
                      <div className="h-[3px] lg:h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

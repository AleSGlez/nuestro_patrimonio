// src/modules/accounts/components/CuentaCard.jsx
import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, TrendingUp, Store } from 'lucide-react'
import { useApartados, calcularRendimiento, useEliminarApartado } from '../hooks/useApartados'
import { fmt, cn } from '@lib/utils'
import { useToast } from '@ui/Toast'

const TIPO_EMOJI  = { debito: '💳', ahorro: '🏦', efectivo: '💵', inversion: '📈', transporte: '🚇' }
const TIPO_LABEL  = { debito: 'Débito', ahorro: 'Ahorro', efectivo: 'Efectivo', inversion: 'Inversión', transporte: 'Transporte' }

function ApartadoRow({ apartado, onEdit, cuenta }) {
  const toast = useToast()
  const eliminar = useEliminarApartado()
  const rendimiento = calcularRendimiento(apartado)

  const pctMeta = apartado.meta_monto
    ? Math.min(100, (Number(apartado.monto) / Number(apartado.meta_monto)) * 100)
    : null

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar el apartado "${apartado.nombre}"? El dinero regresará a tu saldo disponible.`)) return
    try {
      await eliminar.mutateAsync({
        id: apartado.id,
        cuentaId: cuenta.id,
        monto: apartado.monto,
        cuentaSaldoActual: cuenta.saldo,
      })
      toast.success('Apartado eliminado — dinero regresó al disponible')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div
      onClick={() => onEdit(apartado)}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-surface-700/50 active:scale-[0.98] transition-all cursor-pointer"
    >
      <span className="text-lg flex-shrink-0">{apartado.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white font-medium truncate">{apartado.nombre}</p>
          {apartado.es_negocio && (
            <span className="flex items-center gap-0.5 text-[10px] text-[var(--accent)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded-full flex-shrink-0">
              <Store size={9} /> Negocio
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">{fmt(apartado.monto)}</p>
          {apartado.tasa_anual > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-ok">
              <TrendingUp size={10} />+{fmt(rendimiento)}
            </span>
          )}
        </div>
        {pctMeta !== null && (
          <div className="h-1 bg-surface-500 rounded-full overflow-hidden mt-1.5 max-w-[120px]">
            <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${pctMeta}%` }} />
          </div>
        )}
      </div>
      {apartado.tasa_anual > 0 && (
        <span className="badge-ok text-[10px] flex-shrink-0">{apartado.tasa_anual}%</span>
      )}
      <button onClick={handleDelete} className="text-gray-500 hover:text-bad flex-shrink-0 p-1">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function CuentaCard({ cuenta, onEdit, onDelete, onAddApartado, onEditApartado, nombres }) {
  const [expanded, setExpanded] = useState(false)
  const { data: apartados = [] } = useApartados(cuenta.id)

  const personaLabel = {
    p1: nombres.p1, p2: nombres.p2, ambos: 'Compartida', negocio: '🏪 Negocio',
  }[cuenta.persona]

  const totalApartado = apartados.reduce((s, a) => s + Number(a.monto), 0)
  const totalApartadoNegocio = apartados.filter((a) => a.es_negocio).reduce((s, a) => s + Number(a.monto), 0)
  const tieneApartados = cuenta.tipo !== 'efectivo' && cuenta.tipo !== 'transporte'

  return (
    <div className="card overflow-hidden">
      <div className="p-4 relative">
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cuenta.color }} />
        <div className="pl-2">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{TIPO_EMOJI[cuenta.tipo]}</span>
              <div>
                <p className="text-sm font-semibold text-white">{cuenta.nombre}</p>
                <p className="text-xs text-gray-500">{cuenta.banco || TIPO_LABEL[cuenta.tipo]} · {personaLabel}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(cuenta)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
                <Pencil size={13} />
              </button>
              <button onClick={() => onDelete(cuenta)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-bad">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {totalApartado > 0 ? (
            <div className="flex items-end gap-3 mb-2">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Disponible</p>
                <p className="text-2xl font-bold font-mono text-white">{fmt(cuenta.saldo)}</p>
              </div>
              <div className="pb-0.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Apartado</p>
                <p className="text-sm font-semibold font-mono text-[var(--accent)]">{fmt(totalApartado)}</p>
              </div>
            </div>
          ) : (
            <p className="text-2xl font-bold font-mono text-white mb-2">{fmt(cuenta.saldo)}</p>
          )}

          {totalApartadoNegocio > 0 && (
            <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
              <Store size={10} className="text-[var(--accent)]" />
              {fmt(totalApartadoNegocio)} es dinero del negocio
            </p>
          )}

          {tieneApartados && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Apartados {apartados.length > 0 && `(${apartados.length})`}
            </button>
          )}
        </div>
      </div>

      {expanded && tieneApartados && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/[0.06] mt-1">
          {apartados.map((a) => (
            <ApartadoRow key={a.id} apartado={a} cuenta={cuenta} onEdit={onEditApartado} />
          ))}
          <button
            onClick={() => onAddApartado(cuenta)}
            className="w-full py-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all"
          >
            <Plus size={13} /> Agregar apartado
          </button>
        </div>
      )}
    </div>
  )
}

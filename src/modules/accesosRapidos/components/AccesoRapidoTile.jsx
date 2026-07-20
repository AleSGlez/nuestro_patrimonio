// src/modules/accesosRapidos/components/AccesoRapidoTile.jsx
import { Pencil, Star } from 'lucide-react'
import { useLongPress } from '@shared/hooks/useLongPress'
import { fmt, cn } from '@lib/utils'

export default function AccesoRapidoTile({ acceso, stats, disabled, onFire, onEdit }) {
  const press = useLongPress(onEdit, () => { if (!disabled) onFire() })

  return (
    <div className="relative group">
      <button
        type="button"
        {...press}
        disabled={disabled}
        className={cn(
          'card-interactive w-full flex flex-col items-center gap-1 py-3 px-2 text-center',
          disabled && 'opacity-50'
        )}
      >
        {acceso.favorito && (
          <Star size={10} className="absolute top-2 right-2 text-warn fill-warn" />
        )}
        <span className="text-2xl leading-none">{acceso.emoji}</span>
        <span className="text-[11px] font-medium text-white truncate w-full">{acceso.nombre}</span>
        <span className={cn('text-xs font-mono font-semibold', acceso.tipo === 'gasto' ? 'text-bad' : 'text-ok')}>
          {fmt(acceso.monto_default)}
        </span>
        {stats?.usadoEsteMes > 0 && (
          <span className="text-[10px] text-gray-500">{stats.usadoEsteMes}x este mes</span>
        )}
      </button>
      {/* Ícono de edición visible en hover para desktop (sin gesto de long-press con mouse) */}
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar acceso rápido"
        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-surface-600 items-center justify-center text-gray-300 hover:text-white"
      >
        <Pencil size={11} />
      </button>
    </div>
  )
}

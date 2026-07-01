// src/modules/accounts/components/ApartadoNegocioRef.jsx
import { Store, ArrowUpRight } from 'lucide-react'
import { fmt } from '@lib/utils'

// Tarjeta de solo referencia — muestra un apartado marcado como negocio
// que vive físicamente en una cuenta personal. No es una cuenta real,
// solo un recordatorio visual de que ese dinero existe y de dónde sacarlo.
export default function ApartadoNegocioRef({ apartado, cuenta, onTap }) {
  return (
    <button
      onClick={() => onTap(cuenta)}
      className="card p-3.5 text-left relative overflow-hidden active:scale-[0.97] transition-all border-dashed border-[var(--accent)]/30"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
      <div className="pl-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-base flex-shrink-0">{apartado.emoji}</span>
          <p className="text-xs font-medium text-white truncate flex-1">{apartado.nombre}</p>
          <Store size={10} className="text-[var(--accent)] flex-shrink-0" />
        </div>
        <p className="text-base font-bold font-mono text-[var(--accent)] leading-tight truncate">
          {fmt(apartado.monto)}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <ArrowUpRight size={9} className="text-gray-500 flex-shrink-0" />
          <p className="text-[10px] text-gray-500 truncate">en {cuenta?.nombre || 'cuenta personal'}</p>
        </div>
      </div>
    </button>
  )
}

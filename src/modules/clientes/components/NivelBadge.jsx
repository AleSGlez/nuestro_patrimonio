// src/modules/clientes/components/NivelBadge.jsx
import { getNivelCliente } from '@lib/utils'

export default function NivelBadge({ nivel, className = '' }) {
  const n = getNivelCliente(nivel)
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0 ${className}`}
      style={{ backgroundColor: `${n.color}22`, color: n.color }}
    >
      <span>{n.emoji}</span>{n.label}
    </span>
  )
}

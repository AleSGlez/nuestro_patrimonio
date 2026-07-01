// src/shared/components/layout/BottomNav.jsx
import { Home, Building2, CreditCard, ArrowLeftRight, Users } from 'lucide-react'
import { cn } from '@lib/utils'

const TABS = [
  { id: 'dashboard',     label: 'Inicio',      icon: Home },
  { id: 'cuentas',       label: 'Cuentas',     icon: Building2 },
  { id: 'tarjetas',      label: 'Tarjetas',    icon: CreditCard },
  { id: 'transacciones', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'personas',      label: 'Personas',    icon: Users },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav flex items-center justify-around px-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full tap-target"
          >
            <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
            <span className={cn('text-[10px] font-medium', isActive ? 'text-[var(--accent)]' : 'text-gray-500')}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

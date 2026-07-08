// src/shared/components/layout/BottomNav.jsx
import { Home, Wallet, Users, Store, MoreHorizontal } from 'lucide-react'
import { cn } from '@lib/utils'

const TABS = [
  { id: 'inicio',    label: 'Inicio',    icon: Home },
  { id: 'finanzas',  label: 'Finanzas',  icon: Wallet },
  { id: 'personas',  label: 'Personas',  icon: Users },
  { id: 'negocio',   label: 'Negocio',   icon: Store },
  { id: 'mas',       label: 'Más',       icon: MoreHorizontal },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav flex items-start justify-around px-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full pt-2"
          >
            <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}
              className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
            <span className={cn('text-[10px] font-medium',
              isActive ? 'text-[var(--accent)]' : 'text-gray-500')}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

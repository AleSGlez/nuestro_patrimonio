// src/shared/components/layout/BottomNav.jsx
import { useState } from 'react'
import { Home, Building2, CreditCard, ArrowLeftRight, Target, Users, MoreHorizontal, X, Package, CalendarDays } from 'lucide-react'
import { cn } from '@lib/utils'

const MAIN_TABS = [
  { id: 'dashboard',     label: 'Inicio',      icon: Home },
  { id: 'cuentas',       label: 'Cuentas',     icon: Building2 },
  { id: 'tarjetas',      label: 'Tarjetas',    icon: CreditCard },
  { id: 'transacciones', label: 'Movimientos', icon: ArrowLeftRight },
]

const MORE_TABS = [
  { id: 'presupuestos',  label: 'Presupuestos', icon: Target },
  { id: 'personas',      label: 'Personas',     icon: Users },
  { id: 'inventario',    label: 'Inventario',   icon: Package },
  { id: 'calendario',    label: 'Calendario',   icon: CalendarDays },
]

export default function BottomNav({ active, onChange }) {
  const [showMore, setShowMore] = useState(false)
  const isMoreActive = MORE_TABS.some((t) => t.id === active)

  const handleSelect = (id) => {
    onChange(id)
    setShowMore(false)
  }

  return (
    <>
      {/* Menú "Más" */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed z-50 bg-surface-800 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
            style={{
              bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 8px)',
              right: '16px',
              minWidth: '180px',
            }}
          >
            {MORE_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium transition-all',
                  active === id
                    ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'text-gray-300 hover:bg-surface-700'
                )}
              >
                <Icon size={18} strokeWidth={active === id ? 2.4 : 1.8} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <nav className="bottom-nav flex items-start justify-around px-1">
        {MAIN_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
              <span className={cn('text-[9px] font-medium', isActive ? 'text-[var(--accent)]' : 'text-gray-500')}>
                {label}
              </span>
            </button>
          )
        })}

        {/* Botón "Más" */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
        >
          {showMore
            ? <X size={20} strokeWidth={2} className="text-[var(--accent)]" />
            : <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.4 : 1.8} className={isMoreActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
          }
          <span className={cn('text-[9px] font-medium', isMoreActive || showMore ? 'text-[var(--accent)]' : 'text-gray-500')}>
            {isMoreActive ? MORE_TABS.find((t) => t.id === active)?.label : 'Más'}
          </span>
        </button>
      </nav>
    </>
  )
}


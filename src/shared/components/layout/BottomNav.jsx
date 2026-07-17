// src/shared/components/layout/BottomNav.jsx
import { useState } from 'react'
import { Home, Wallet, Users, Store, MoreHorizontal, Plus, X,
         TrendingDown, TrendingUp, ArrowLeftRight, ShoppingCart, CreditCard, CalendarDays } from 'lucide-react'
import { cn } from '@lib/utils'
import { useAppStore } from '@store/appStore'

const LEFT_TABS  = [
  { id: 'inicio',    label: 'Inicio',    icon: Home },
  { id: 'finanzas',  label: 'Finanzas',  icon: Wallet },
]
const RIGHT_TABS = [
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'negocio',    label: 'Negocio',    icon: Store },
]

const ACCIONES = [
  { id: 'gasto',        label: 'Gasto',        icon: TrendingDown,    color: 'bg-bad/20 text-bad border-bad/30' },
  { id: 'ingreso',      label: 'Ingreso',       icon: TrendingUp,      color: 'bg-ok/20 text-ok border-ok/30' },
  { id: 'transferencia',label: 'Transferencia', icon: ArrowLeftRight,  color: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30' },
  { id: 'suscripcion',  label: 'Suscripción',   icon: CreditCard,      color: 'bg-warn/20 text-warn border-warn/30' },
]

export default function BottomNav({ active, onChange, onAccion }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleAccion = (id) => {
    setMenuOpen(false)
    onAccion?.(id)
  }

  return (
    <>
      {/* Overlay del menú */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMenuOpen(false)} />
      )}

      {/* Menú de acciones */}
      {menuOpen && (
        <div className="fixed z-50 bottom-nav-menu"
          style={{
            bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 34px) + 12px)',
            left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: '398px',
          }}
        >
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-3 grid grid-cols-2 gap-2 animate-scale-in origin-bottom">
            {ACCIONES.map(({ id, label, icon: Icon, color }) => (
              <button key={id} onClick={() => handleAccion(id)}
                className={cn('flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all active:scale-95', color)}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">¿Qué quieres registrar?</p>
        </div>
      )}

      <nav className="bottom-nav flex items-start justify-around px-1">
        {LEFT_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onChange(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full pt-2">
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-[var(--accent)]' : 'text-gray-400')}>
                {label}
              </span>
            </button>
          )
        })}

        {/* Botón + central */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú de acciones' : 'Nuevo movimiento'}
          className="flex flex-col items-center justify-center flex-1 h-full pt-1">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
            menuOpen ? 'bg-surface-600 rotate-45' : 'bg-[var(--accent)]'
          )}>
            {menuOpen ? <X size={22} className="text-white" /> : <Plus size={24} className="text-white" />}
          </div>
        </button>

        {RIGHT_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onChange(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full pt-2">
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-[var(--accent)]' : 'text-gray-400')}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

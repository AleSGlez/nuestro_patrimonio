// src/shared/components/layout/Sidebar.jsx
import { useState } from 'react'
import {
  Home, Wallet, Users, Store, CalendarDays, Settings,
  Plus, X, TrendingDown, TrendingUp, ArrowLeftRight, CreditCard,
} from 'lucide-react'
import { cn } from '@lib/utils'

const NAV_ITEMS = [
  { id: 'inicio',     label: 'Inicio',     icon: Home },
  { id: 'finanzas',   label: 'Finanzas',   icon: Wallet },
  { id: 'personas',   label: 'Personas',   icon: Users },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'negocio',    label: 'Negocio',    icon: Store },
  { id: 'mas',        label: 'Más',        icon: Settings },
]

const ACCIONES = [
  { id: 'gasto',         label: 'Gasto',         icon: TrendingDown,   color: 'bg-bad/10 text-bad border-bad/20 hover:bg-bad/20' },
  { id: 'ingreso',       label: 'Ingreso',       icon: TrendingUp,     color: 'bg-ok/10 text-ok border-ok/20 hover:bg-ok/20' },
  { id: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight, color: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/20 hover:brightness-110' },
  { id: 'suscripcion',   label: 'Suscripción',   icon: CreditCard,     color: 'bg-warn/10 text-warn border-warn/20 hover:bg-warn/20' },
]

// Navegación lateral — SOLO visible en desktop (≥1024px, breakpoint `lg`).
// Convive en el DOM con BottomNav (que sigue intacto para móvil); cuál se
// ve depende únicamente de CSS, así que móvil no cambia en absoluto.
export default function Sidebar({ active, onChange, onAccion }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleAccion = (id) => {
    setMenuOpen(false)
    onAccion?.(id)
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:h-full lg:bg-surface-900 lg:border-r lg:border-white/[0.06]">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center text-lg flex-shrink-0">
          💑
        </div>
        <p className="text-sm font-bold text-white leading-tight">Nuestro<br />Patrimonio</p>
      </div>

      <div className="px-3 relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="btn-primary w-full py-2.5 text-sm font-semibold mb-4"
        >
          {menuOpen ? <X size={16} /> : <Plus size={16} />}
          <span>Nuevo</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-3 right-3 top-[52px] z-50 bg-surface-800 border border-white/10 rounded-2xl p-2 space-y-1 shadow-xl">
              {ACCIONES.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => handleAccion(id)}
                  className={cn('w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all', color)}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

// src/shared/components/layout/Sidebar.jsx
import { useState } from 'react'
import {
  Home, Wallet, Users, Store, CalendarDays, Settings, BarChart3,
  Plus, X, TrendingDown, TrendingUp, ArrowLeftRight, CreditCard,
  ChevronLeft,
} from 'lucide-react'
import { useAppStore } from '@store/appStore'
import { cn } from '@lib/utils'
import ResumenRapido from '@modules/presupuestos/components/ResumenRapido'

const NAV_ITEMS = [
  { id: 'inicio',     label: 'Inicio',     icon: Home },
  { id: 'finanzas',   label: 'Finanzas',   icon: Wallet },
  { id: 'reportes',   label: 'Reportes',   icon: BarChart3 },
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
// "Reportes" vive AQUÍ como acceso directo de escritorio, pero sigue
// existiendo también como pestaña de Finanzas (así móvil no pierde nada —
// no tiene Sidebar donde ponerlo).
export default function Sidebar({ active, onChange, onAccion }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const colapsado = useAppStore((s) => s.sidebarColapsado)
  const setColapsado = useAppStore((s) => s.setSidebarColapsado)

  const handleAccion = (id, extra) => {
    setMenuOpen(false)
    onAccion?.(id, extra)
  }

  return (
    <aside className={cn(
      'hidden lg:flex lg:flex-col lg:flex-shrink-0 lg:h-full lg:bg-surface-900 lg:border-r lg:border-white/[0.06] transition-[width] duration-150',
      colapsado ? 'lg:w-[72px]' : 'lg:w-64'
    )}>
      <div className={cn('flex items-center gap-2.5 pt-6 pb-5 flex-shrink-0', colapsado ? 'px-3 justify-center' : 'px-5')}>
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center text-lg flex-shrink-0">
          💑
        </div>
        {!colapsado && (
          <p className="text-sm font-bold text-white leading-tight flex-1">Nuestro<br />Patrimonio</p>
        )}
        <button
          onClick={() => setColapsado(!colapsado)}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          className="w-7 h-7 rounded-lg bg-surface-700 flex items-center justify-center text-gray-400 hover:text-white flex-shrink-0"
        >
          <ChevronLeft size={13} className={cn('transition-transform', colapsado && 'rotate-180')} />
        </button>
      </div>

      <div className={cn('relative flex-shrink-0', colapsado ? 'px-3' : 'px-3')}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Nuevo movimiento"
          className={cn('btn-primary w-full py-2.5 text-sm font-semibold mb-4', colapsado && '!px-0 justify-center')}
        >
          {menuOpen ? <X size={16} /> : <Plus size={16} />}
          {!colapsado && <span>Nuevo</span>}
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40 animate-fade-in" onClick={() => setMenuOpen(false)} />
            <div className={cn(
              'absolute top-[52px] z-50 bg-surface-800 border border-white/10 rounded-2xl p-2 space-y-1 shadow-xl animate-scale-in origin-top',
              'left-3 w-[340px]'
            )}>
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
              <ResumenRapido className="pt-1"
                onVerPresupuestos={() => handleAccion('ver-presupuestos')}
                onRepetir={(tx) => handleAccion('repetir', tx)} />
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
              aria-label={label}
              title={colapsado ? label : undefined}
              className={cn(
                'w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                colapsado ? 'px-0 justify-center' : 'px-3',
                isActive ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} className="flex-shrink-0" />
              {!colapsado && label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

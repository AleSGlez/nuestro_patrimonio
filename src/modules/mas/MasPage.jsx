// src/modules/mas/MasPage.jsx
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { LogOut, ChevronRight, Info } from 'lucide-react'
import { cn } from '@lib/utils'

const TEMAS = [
  { id: 'violet',  label: 'Violeta',   color: '#7C6EFA' },
  { id: 'emerald', label: 'Esmeralda', color: '#10B981' },
  { id: 'rose',    label: 'Rosa',      color: '#F43F5E' },
  { id: 'amber',   label: 'Ámbar',     color: '#F59E0B' },
]

export default function MasPage() {
  const { user, logout } = useAuthStore()
  const { nombres, tema, setTema } = useAppStore()

  // Determinar el nombre del usuario logueado
  // El setup wizard guarda en pareja.user1_id al creador (p1) y user2_id al que se une (p2)
  const pareja = useAuthStore((s) => s.pareja)
  const miNombre = pareja?.user2_id === user?.id ? nombres.p2 : nombres.p1

  const cambiarTema = (id) => {
    setTema(id)
    document.documentElement.setAttribute('data-theme', id)
  }

  return (
    <>
      <div className="top-header">
        <p className="text-lg font-bold text-white">Configuración</p>
      </div>

      <div className="page px-4 pt-4 space-y-4">
        {/* Perfil */}
        <div className="card p-4">
          <p className="section-label mb-3">Cuenta</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center text-2xl flex-shrink-0">
              👤
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{miNombre}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-3 p-3 bg-bad/10 border border-bad/20 rounded-xl">
            <LogOut size={16} className="text-bad" />
            <p className="text-sm text-bad font-medium">Cerrar sesión</p>
          </button>
        </div>

        {/* Tema */}
        <div className="card p-4">
          <p className="section-label mb-3">Tema de color</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMAS.map((t) => (
              <button key={t.id} onClick={() => cambiarTema(t.id)}
                className={cn('p-3 rounded-xl border flex items-center gap-2.5 transition-all',
                  tema === t.id ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-white/10 bg-surface-700'
                )}>
                <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                <p className={cn('text-sm font-medium', tema === t.id ? 'text-white' : 'text-gray-400')}>{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="card p-4">
          <p className="section-label mb-3">Acerca de</p>
          <div className="flex items-center gap-2 text-gray-500">
            <Info size={14} />
            <p className="text-xs">Nuestro Patrimonio v3.0</p>
          </div>
          <p className="text-xs text-gray-600 mt-1">Hecho con ❤️ para Ale & Ruli</p>
        </div>
      </div>
    </>
  )
}

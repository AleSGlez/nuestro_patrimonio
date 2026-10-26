// src/modules/mas/MasPage.jsx
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useActualizarTema } from '@modules/couple/hooks/usePareja'
import { LogOut, Info } from 'lucide-react'
import { cn } from '@lib/utils'

const TEMAS = [
  { id: 'violet',  label: 'Violeta',   color: '#7C6EFA' },
  { id: 'emerald', label: 'Esmeralda', color: '#10B981' },
  { id: 'rose',    label: 'Rosa',      color: '#F43F5E' },
  { id: 'amber',   label: 'Ámbar',     color: '#F59E0B' },
]

export default function MasPage() {
  const { user, logout } = useAuthStore()
  const { nombres, tema, accentHex, setTema, setAccentCustom } = useAppStore()
  const actualizarTema = useActualizarTema()

  // Determinar el nombre del usuario logueado
  // El setup wizard guarda en pareja.user1_id al creador (p1) y user2_id al que se une (p2)
  const pareja = useAuthStore((s) => s.pareja)
  const miNombre = pareja?.user2_id === user?.id ? nombres.p2 : nombres.p1

  const cambiarTema = (id) => {
    setTema(id)
    actualizarTema.mutate({ tema: id })
  }

  const cambiarAccentCustom = (hex) => {
    setAccentCustom(hex)
    actualizarTema.mutate({ tema: 'custom', accent_hex: hex })
  }

  const colorActivo = tema === 'custom' ? (accentHex || '#7C6EFA') : TEMAS.find((t) => t.id === tema)?.color

  return (
    <>
      <div className="top-header !h-auto lg:px-10 lg:pt-8 lg:pb-2 lg:border-b-0">
        <p className="text-lg font-bold text-white lg:text-3xl lg:tracking-tight">Configuración</p>
      </div>

      <div className="page px-4 pt-4 lg:px-10 lg:pt-6 space-y-4">
        <div className="lg:max-w-xl space-y-4">
          {/* Perfil */}
          <div className="card p-4 lg:p-6">
            <p className="section-label mb-3 lg:text-[10px] lg:text-gray-500 lg:tracking-[0.1em]">Cuenta</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center text-2xl lg:text-3xl flex-shrink-0">
                👤
              </div>
              <div className="min-w-0">
                <p className="text-sm lg:text-base font-semibold text-white">{miNombre}</p>
                <p className="text-xs lg:text-sm text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout}
              className="w-full flex items-center gap-3 p-3 bg-bad/10 border border-bad/20 rounded-xl">
              <LogOut size={16} className="text-bad" />
              <p className="text-sm text-bad font-medium">Cerrar sesión</p>
            </button>
          </div>

          {/* Apariencia */}
          <div className="card p-4 lg:p-6">
            <p className="section-label mb-3 lg:text-[10px] lg:text-gray-500 lg:tracking-[0.1em]">Apariencia</p>

            <p className="text-xs lg:text-sm font-medium text-gray-300 mb-2">Color de acento</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {TEMAS.map((t) => (
                <button key={t.id} onClick={() => cambiarTema(t.id)}
                  className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all',
                    tema === t.id ? 'border-current bg-white/[0.04]' : 'border-white/10'
                  )}
                  style={tema === t.id ? { color: t.color } : undefined}
                >
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <p className={cn('text-[10px] font-medium', tema === t.id ? '' : 'text-gray-400')}>{t.label}</p>
                </button>
              ))}
              <label
                className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer',
                  tema === 'custom' ? 'border-current bg-white/[0.04]' : 'border-white/10'
                )}
                style={tema === 'custom' ? { color: colorActivo } : undefined}
              >
                <input
                  type="color"
                  value={accentHex || '#7C6EFA'}
                  onChange={(e) => cambiarAccentCustom(e.target.value)}
                  className="np-color-input w-5 h-5 cursor-pointer"
                />
                <p className={cn('text-[10px] font-medium text-center', tema === 'custom' ? '' : 'text-gray-400')}>Personal.</p>
              </label>
            </div>

            <div className="flex items-center gap-3 bg-surface-700 rounded-xl p-3">
              <button className="btn-primary px-3 py-2 text-xs font-semibold flex-shrink-0">Ejemplo</button>
              <div className="flex-1 h-1.5 bg-[var(--accent-muted)] rounded-full overflow-hidden">
                <div className="h-full w-[62%] rounded-full bg-[var(--accent)]" />
              </div>
              <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">{colorActivo?.toUpperCase()}</span>
            </div>
          </div>

          {/* Info */}
          <div className="card p-4 lg:p-6">
            <p className="section-label mb-3 lg:text-[10px] lg:text-gray-500 lg:tracking-[0.1em]">Acerca de</p>
            <div className="flex items-center gap-2 text-gray-400">
              <Info size={14} />
              <p className="text-xs lg:text-sm">Nuestro Patrimonio v3.0</p>
            </div>
            <p className="text-xs text-gray-600 mt-1">Hecho con ❤️ para Ale & Ruli</p>
          </div>
        </div>
      </div>
    </>
  )
}

// src/shared/components/layout/RightRail.jsx
import { AlertCircle } from 'lucide-react'
import { useAlertasTarjetas } from '@modules/cards/hooks/useTarjetas'
import AccesosRapidosSection from '@modules/accesosRapidos/components/AccesosRapidosSection'
import { cn } from '@lib/utils'

// Rail derecho persistente — SOLO desktop (≥1024px, igual que Sidebar).
// Vive fuera del tab activo: se ve en Inicio, Finanzas, Calendario, etc.
// para que Accesos rápidos y las alertas de tarjeta estén siempre a mano
// sin competir por scroll con el contenido de cada página.
export default function RightRail() {
  const alertas = useAlertasTarjetas()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:flex-shrink-0 lg:h-full lg:bg-surface-900 lg:border-l lg:border-white/[0.06] lg:overflow-y-auto no-scrollbar">
      <div className="p-6 space-y-8">
        {alertas.length > 0 && (
          <div className="space-y-3">
            <p className="section-label">Alertas</p>
            <div className="space-y-2">
              {alertas.map((a, i) => (
                <div key={i} className={cn('flex items-center gap-3 p-3 rounded-xl',
                  a.tipo === 'warn' ? 'bg-warn/10 border border-warn/20' : 'bg-[var(--accent-muted)] border border-[var(--accent)]/20'
                )}>
                  <AlertCircle size={16} className={a.tipo === 'warn' ? 'text-warn flex-shrink-0' : 'text-[var(--accent)] flex-shrink-0'} />
                  <p className="text-xs text-gray-200 font-medium">{a.msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <AccesosRapidosSection />
      </div>
    </aside>
  )
}

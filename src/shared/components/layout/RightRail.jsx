// src/shared/components/layout/RightRail.jsx
import { useAlertas } from '@modules/notificaciones/hooks/useAlertas'
import AccesosRapidosSection from '@modules/accesosRapidos/components/AccesosRapidosSection'
import { cn } from '@lib/utils'

const COLOR_TIPO = {
  bad:  'bg-bad/10 border-bad/20 text-bad',
  warn: 'bg-warn/10 border-warn/20 text-warn',
  info: 'bg-[var(--accent-muted)] border-[var(--accent)]/20 text-[var(--accent)]',
}

// Rail derecho persistente — SOLO desktop (≥1024px, igual que Sidebar).
// Vive fuera del tab activo: se ve en Inicio, Finanzas, Calendario, etc.
// para que Accesos rápidos y las alertas (tarjetas, suscripciones,
// presupuestos excedidos — misma fuente que la campana de notificaciones
// en Inicio, ver @modules/notificaciones) estén siempre a mano sin competir
// por scroll con el contenido de cada página.
export default function RightRail() {
  const alertas = useAlertas()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:flex-shrink-0 lg:h-full lg:bg-surface-900 lg:border-l lg:border-white/[0.06] lg:overflow-y-auto no-scrollbar">
      <div className="p-6 space-y-8">
        {alertas.length > 0 && (
          <div className="space-y-3">
            <p className="section-label">Alertas</p>
            <div className="space-y-2">
              {alertas.map((a) => {
                const c = COLOR_TIPO[a.tipo] || COLOR_TIPO.info
                return (
                  <div key={a.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', c)}>
                    <span className="text-base flex-shrink-0">{a.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 font-medium leading-snug">{a.titulo}</p>
                    </div>
                    <p className="text-xs font-mono font-semibold flex-shrink-0">{a.detalle}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <AccesosRapidosSection />
      </div>
    </aside>
  )
}

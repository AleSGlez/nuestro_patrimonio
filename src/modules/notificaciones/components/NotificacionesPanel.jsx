// src/modules/notificaciones/components/NotificacionesPanel.jsx
import { useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { EmptyState } from '@ui/Field'
import { useAlertas } from '../hooks/useAlertas'
import { usePushState, useActivarPush, useDesactivarPush, soportaPush, esStandalone } from '../hooks/useWebPush'
import { cn } from '@lib/utils'

const COLOR_TIPO = {
  bad:  { dot: 'bg-bad',  bg: 'bg-bad/10',  border: 'border-bad/20',  text: 'text-bad' },
  warn: { dot: 'bg-warn', bg: 'bg-warn/10', border: 'border-warn/20', text: 'text-warn' },
  info: { dot: 'bg-[var(--accent)]', bg: 'bg-[var(--accent-muted)]', border: 'border-[var(--accent)]/20', text: 'text-[var(--accent)]' },
}

function FilaAlerta({ a }) {
  const c = COLOR_TIPO[a.tipo] || COLOR_TIPO.info
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl border', c.bg, c.border)}>
      <span className="text-lg flex-shrink-0">{a.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">{a.titulo}</p>
      </div>
      <p className={cn('text-sm font-mono font-semibold flex-shrink-0', c.text)}>{a.detalle}</p>
    </div>
  )
}

// Switch de notificaciones push nativas — vive dentro del mismo panel para
// no agregar una pantalla más; su estado es del DISPOSITIVO, no de la pareja
// (el iPhone de uno puede estar activado y la compu del otro no).
function TogglePush() {
  const toast = useToast()
  const { cargando, permiso, activo, soportado, revisar } = usePushState()
  const { activar, loading: activando } = useActivarPush()
  const { desactivar, loading: desactivando } = useDesactivarPush()
  const standalone = esStandalone()

  const handleToggle = async () => {
    try {
      if (activo) {
        await desactivar()
        toast.success('Notificaciones push desactivadas')
      } else {
        await activar()
        toast.success('Notificaciones push activadas ✅')
      }
      await revisar()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (!soportado) {
    return (
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Este navegador no soporta notificaciones push nativas.
      </p>
    )
  }

  // iOS exige que la app esté agregada a la pantalla de inicio antes de poder
  // pedir permiso de notificaciones — Safari normal nunca las ofrece.
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (iOS && !standalone) {
    return (
      <p className="text-[11px] text-warn leading-relaxed">
        En iPhone primero agrega la app a tu pantalla de inicio (Compartir → "Agregar a inicio") para poder activar notificaciones.
      </p>
    )
  }

  const loading = cargando || activando || desactivando

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
        activo ? 'bg-ok/10 border-ok/20' : 'bg-surface-700 border-white/10'
      )}
    >
      {loading ? <Spinner size="sm" /> : activo ? <BellRing size={16} className="text-ok" /> : <BellOff size={16} className="text-gray-400" />}
      <div className="flex-1 text-left">
        <p className={cn('text-sm font-medium', activo ? 'text-ok' : 'text-white')}>
          {activo ? 'Notificaciones push activadas' : 'Activar notificaciones push'}
        </p>
        <p className="text-[11px] text-gray-400">
          {activo ? 'Avisos aunque la app esté cerrada' : 'Avísame de cortes, pagos y presupuestos excedidos'}
        </p>
      </div>
    </button>
  )
}

export default function NotificacionesPanel() {
  const [open, setOpen] = useState(false)
  const alertas = useAlertas()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Notificaciones"
        className="icon-btn lg:w-11 lg:h-11 lg:bg-surface-800 text-gray-500 hover:text-white relative"
      >
        <Bell size={18} />
        {alertas.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-bad" />
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notificaciones">
        <div className="space-y-2 mb-5">
          {alertas.length === 0 ? (
            <EmptyState emoji="🔔" title="Todo en orden" description="No hay avisos pendientes por ahora" />
          ) : (
            alertas.map((a) => <FilaAlerta key={a.id} a={a} />)
          )}
        </div>

        <p className="section-label mb-2">Avisos en tu celular</p>
        <TogglePush />
      </Modal>
    </>
  )
}

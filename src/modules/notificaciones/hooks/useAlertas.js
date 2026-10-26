// src/modules/notificaciones/hooks/useAlertas.js
import { useMemo } from 'react'
import { useTarjetas, calcularFechasCorte, diasHasta } from '@modules/cards/hooks/useTarjetas'
import { useSuscripciones, diasHasta as diasHastaFecha } from '@modules/suscripciones/hooks/useSuscripciones'
import { usePresupuestos, calcularDisponible } from '@modules/presupuestos/hooks/usePresupuestos'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { fmt } from '@lib/utils'

// Alertas accionables para el dashboard (panel de notificaciones) y para los
// avisos push nativos. Esta es la MISMA lógica (ventanas de días, criterios)
// que replica en el servidor supabase/functions/enviar-notificaciones —
// cualquier cambio de criterio aquí debe reflejarse también ahí.
export function useAlertas() {
  const { data: tarjetas = [] }     = useTarjetas()
  const { data: suscripciones = [] } = useSuscripciones()
  const { data: presupuestos = [] } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()

  return useMemo(() => {
    const alertas = []

    // ── Tarjetas: límite de pago y corte próximos ──────────────
    tarjetas.forEach((t) => {
      if (!t.dia_corte || !t.dia_limite_pago) return
      const { corte, limite } = calcularFechasCorte(t.dia_corte, t.dia_limite_pago)

      const diasLimite = diasHasta(limite)
      if (diasLimite != null && diasLimite >= 0 && diasLimite <= 5) {
        alertas.push({
          id: `tarjeta-limite-${t.id}`,
          tipo: diasLimite <= 2 ? 'bad' : 'warn',
          emoji: '📅',
          titulo: `Pago de ${t.nombre} vence ${diasLimite === 0 ? 'hoy' : `en ${diasLimite} día${diasLimite === 1 ? '' : 's'}`}`,
          detalle: fmt(t.saldo_periodo_anterior || t.saldo_total),
          dias: diasLimite,
        })
      }

      const diasCorte = diasHasta(corte)
      if (diasCorte != null && diasCorte >= 0 && diasCorte <= 2) {
        alertas.push({
          id: `tarjeta-corte-${t.id}`,
          tipo: 'info',
          emoji: '✂️',
          titulo: `${t.nombre} corta ${diasCorte === 0 ? 'hoy' : `en ${diasCorte} día${diasCorte === 1 ? '' : 's'}`}`,
          detalle: fmt(t.gastos_periodo_actual || 0),
          dias: diasCorte,
        })
      }
    })

    // ── Suscripciones próximas a cobrarse ──────────────────────
    suscripciones.forEach((s) => {
      const dias = diasHastaFecha(s.proxima_fecha)
      if (dias != null && dias >= 0 && dias <= 2) {
        alertas.push({
          id: `suscripcion-${s.id}`,
          tipo: 'info',
          emoji: s.emoji || '🔄',
          titulo: `${s.nombre} se cobra ${dias === 0 ? 'hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}`,
          detalle: fmt(s.monto),
          dias,
        })
      }
    })

    // ── Presupuestos excedidos ──────────────────────────────────
    presupuestos
      .filter((p) => !p.contexto || p.contexto === 'personal')
      .forEach((p) => {
        const { disponible } = calcularDisponible(p, transacciones)
        if (disponible < 0) {
          alertas.push({
            id: `presupuesto-${p.id}`,
            tipo: 'bad',
            emoji: p.emoji || '🎯',
            titulo: `Presupuesto "${p.nombre}" excedido`,
            detalle: `-${fmt(Math.abs(disponible))}`,
            dias: 0,
          })
        }
      })

    // Más urgente primero: excedido/vence hoy antes que lo que falta más días
    return alertas.sort((a, b) => (a.dias ?? 99) - (b.dias ?? 99))
  }, [tarjetas, suscripciones, presupuestos, transacciones])
}

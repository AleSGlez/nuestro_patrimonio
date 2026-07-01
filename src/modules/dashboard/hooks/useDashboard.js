// src/modules/dashboard/hooks/useDashboard.js
import { useQuery } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export function useDashboardData() {
  const parejaId = useAuthStore((s) => s.pareja?.id)

  // Últimas transacciones del mes actual (para resumen)
  const mes = format(new Date(), 'yyyy-MM')
  const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const fin    = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const txMes = useQuery({
    queryKey: ['dashboard-tx-mes', parejaId, mes],
    queryFn: () => db.from('transacciones').query(
      `pareja_id=eq.${parejaId}&fecha=gte.${inicio}&fecha=lte.${fin}&order=fecha.desc,created_at.desc&limit=200`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })

  // Transacciones de los últimos 6 meses (para gráfica de flujo)
  const hace6 = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd')
  const txHistorico = useQuery({
    queryKey: ['dashboard-tx-historico', parejaId],
    queryFn: () => db.from('transacciones').query(
      `pareja_id=eq.${parejaId}&fecha=gte.${hace6}&fecha=lte.${fin}&order=fecha.asc&limit=1000`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 5,
  })

  return { txMes, txHistorico }
}

// src/modules/dashboard/hooks/useDashboard.js
import { useQuery } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { format, subMonths, subDays, startOfMonth, endOfMonth } from 'date-fns'

export function useDashboardData() {
  const parejaId = useAuthStore((s) => s.pareja?.id)

  const mes = format(new Date(), 'yyyy-MM')
  const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const fin    = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const txMes = useQuery({
    queryKey: ['dashboard-tx-mes', parejaId, mes],
    queryFn: () => db.from('transacciones').query(
      `pareja_id=eq.${parejaId}&fecha=gte.${inicio}&fecha=lte.${fin}&order=fecha.asc,created_at.asc&limit=500`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })

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

// Genera sparkline de flujo acumulado de los últimos N días
export function buildSparklineData(transacciones, dias = 14) {
  const hoy = new Date()
  const puntos = Array.from({ length: dias }, (_, i) => {
    const fecha = format(subDays(hoy, dias - 1 - i), 'yyyy-MM-dd')
    return { fecha, valor: 0 }
  })

  transacciones.forEach((t) => {
    const punto = puntos.find((p) => p.fecha === t.fecha)
    if (!punto) return
    if (t.tipo === 'ingreso') punto.valor += Number(t.monto)
    if (t.tipo === 'gasto')   punto.valor -= Number(t.monto)
  })

  // Acumular para que la línea muestre tendencia
  let acum = 0
  return puntos.map((p) => {
    acum += p.valor
    return acum
  })
}

// Serie acumulada día a día (1 al día actual) de un solo tipo dentro del
// mes en curso — usada por el switch de métricas (Ingresos/Gastos), que a
// diferencia del flujo neto de buildSparklineData necesita una curva
// siempre creciente por tipo, no un neto ingreso-gasto.
export function buildCumulativoMes(transaccionesMes, tipo) {
  const hoy = new Date()
  const dias = hoy.getDate()
  const puntos = Array.from({ length: dias }, (_, i) => {
    const fecha = format(new Date(hoy.getFullYear(), hoy.getMonth(), i + 1), 'yyyy-MM-dd')
    return { fecha, valor: 0 }
  })

  transaccionesMes.forEach((t) => {
    if (t.tipo !== tipo) return
    const punto = puntos.find((p) => p.fecha === t.fecha)
    if (punto) punto.valor += Number(t.monto)
  })

  let acum = 0
  return puntos.map((p) => {
    acum += p.valor
    return acum
  })
}

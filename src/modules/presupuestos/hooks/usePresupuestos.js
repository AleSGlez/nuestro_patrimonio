// src/modules/presupuestos/hooks/usePresupuestos.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { differenceInDays, differenceInWeeks, differenceInCalendarMonths,
         startOfDay, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

export function usePresupuestos() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['presupuestos', parejaId],
    queryFn: () => db.from('presupuestos').query({
      pareja_id: `eq.${parejaId}`,
      activo: 'eq.true',
      order: 'created_at.asc',
    }),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCrearPresupuesto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('presupuestos').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos', parejaId] }),
  })
}

export function useActualizarPresupuesto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('presupuestos').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos', parejaId] }),
  })
}

export function useEliminarPresupuesto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('presupuestos').update({ activo: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos', parejaId] }),
  })
}

// ── Cálculo de roll-over ──────────────────────────────────────
// disponible = (monto_base × períodos_transcurridos) - total_gastado_desde_inicio
//
// "períodos transcurridos" = cuántos períodos COMPLETOS han pasado + 1 (el actual)
// Ej diario: si empezó hace 3 días, van 4 períodos (día 0,1,2,3 = hoy)
//
// gastado_desde_inicio = suma de transacciones con contexto=personal
//   desde fecha_inicio del presupuesto hasta hoy

export function calcularDisponible(presupuesto, transacciones) {
  const inicio = parseISO(presupuesto.fecha_inicio)
  const hoy    = startOfDay(new Date())

  let periodos = 1
  switch (presupuesto.tipo) {
    case 'diario':
      periodos = differenceInDays(hoy, inicio) + 1
      break
    case 'semanal':
      periodos = differenceInWeeks(hoy, inicio) + 1
      break
    case 'mensual':
      periodos = differenceInCalendarMonths(hoy, inicio) + 1
      break
  }

  const presupuestoAcumulado = Number(presupuesto.monto_base) * Math.max(1, periodos)

  // Filtrar transacciones de gasto desde fecha_inicio
  const gastado = transacciones
    .filter((t) => {
      if (t.tipo !== 'gasto') return false
      if (t.contexto === 'negocio') return false
      // Filtrar por persona si aplica
      if (presupuesto.persona !== 'ambos' && t.persona !== presupuesto.persona && t.persona !== 'ambos') return false
      const fechaTx = t.fecha // 'YYYY-MM-DD'
      return fechaTx >= presupuesto.fecha_inicio
    })
    .reduce((s, t) => s + Number(t.monto), 0)

  const disponible = presupuestoAcumulado - gastado

  return {
    disponible,
    presupuestoAcumulado,
    gastado,
    periodos,
    pctUsado: presupuestoAcumulado > 0
      ? Math.round((gastado / presupuestoAcumulado) * 100)
      : 0,
  }
}

// Etiqueta del período actual para mostrar en UI
export function labelPeriodo(tipo) {
  const hoy = new Date()
  switch (tipo) {
    case 'diario':   return format(hoy, "EEEE d 'de' MMM", { locale: es })
    case 'semanal':  return 'Esta semana'
    case 'mensual':  return format(hoy, 'MMMM yyyy', { locale: es })
    default:         return ''
  }
}

// Desglose: si es mensual, calcula cuánto tienes disponible por semana y por día
// Si es semanal, calcula cuánto tienes disponible por día
export function calcularDesglose(presupuesto) {
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()

  if (presupuesto.tipo === 'mensual') {
    const diasEnMes = new Date(año, mes + 1, 0).getDate()
    const semanasEnMes = diasEnMes / 7

    const porDia    = Number(presupuesto.monto_base) / diasEnMes
    const porSemana = Number(presupuesto.monto_base) / semanasEnMes

    return { porDia, porSemana }
  }

  if (presupuesto.tipo === 'semanal') {
    const porDia = Number(presupuesto.monto_base) / 7
    return { porDia }
  }

  return null
}

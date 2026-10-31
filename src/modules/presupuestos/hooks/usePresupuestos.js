// src/modules/presupuestos/hooks/usePresupuestos.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { differenceInDays, differenceInWeeks, differenceInCalendarMonths,
         startOfDay, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { montoParaPersona } from '@lib/utils'

export function usePresupuestos() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['presupuestos', parejaId],
    queryFn: () => db.from('presupuestos').query(
      `pareja_id=eq.${parejaId}&activo=eq.true&order=created_at.asc`
    ),
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
//
// Etiquetas: si el presupuesto tiene `categorias`, solo cuentan los gastos de
// esas categorías. Sin `categorias` (presupuestos viejos) cuentan todos.

export function tieneEtiquetas(presupuesto) {
  return Array.isArray(presupuesto.categorias) && presupuesto.categorias.length > 0
}

// Una etiqueta es la categoría completa ('transporte') o solo una
// subcategoría de ella ('transporte:Gasolina')
export const SEP_SUB = ':'
export const etiquetaSub = (categoria, sub) => `${categoria}${SEP_SUB}${sub}`
export function separarEtiqueta(etiqueta) {
  const i = etiqueta.indexOf(SEP_SUB)
  return i === -1 ? { categoria: etiqueta, sub: null } : { categoria: etiqueta.slice(0, i), sub: etiqueta.slice(i + 1) }
}
export function etiquetasCubren(etiquetas, categoria, subcategoria) {
  return etiquetas.includes(categoria) || (!!subcategoria && etiquetas.includes(etiquetaSub(categoria, subcategoria)))
}

// ¿Esta transacción se descuenta de este presupuesto?
export function cuentaEnPresupuesto(presupuesto, t) {
  if (t.tipo !== 'gasto') return false
  if (t.contexto === 'negocio') return false
  if (presupuesto.persona !== 'ambos' && t.persona !== presupuesto.persona && t.persona !== 'ambos') return false
  if (tieneEtiquetas(presupuesto) && !etiquetasCubren(presupuesto.categorias, t.categoria, t.subcategoria)) return false
  return t.fecha >= presupuesto.fecha_inicio
}

// Dos presupuestos compiten por un gasto si sus personas se traslapan
export function personasSeTraslapan(a, b) {
  return a === 'ambos' || b === 'ambos' || a === b
}

// Presupuestos personales que se llevarían un gasto de esta categoría/persona
export function presupuestosDeGasto(presupuestos, categoria, persona, subcategoria = null) {
  return presupuestos.filter((p) =>
    (!p.contexto || p.contexto === 'personal') &&
    personasSeTraslapan(p.persona, persona) &&
    (!tieneEtiquetas(p) || etiquetasCubren(p.categorias, categoria, subcategoria))
  )
}

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
  // Si el presupuesto es de una persona específica, los gastos 'ambos' cuentan al 50%
  const movimientos = transacciones.filter((t) => cuentaEnPresupuesto(presupuesto, t))
  const gastado = movimientos
    .reduce((s, t) => s + montoParaPersona(t, presupuesto.persona === 'ambos' ? null : presupuesto.persona), 0)

  const disponible = presupuestoAcumulado - gastado

  return {
    disponible,
    presupuestoAcumulado,
    gastado,
    periodos,
    movimientos,
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

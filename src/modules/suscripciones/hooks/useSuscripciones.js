// src/modules/suscripciones/hooks/useSuscripciones.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { aplicarEfecto } from '@modules/transactions/hooks/useTransacciones'
import { addDays, addWeeks, addMonths, addYears, parseISO, isPast, isToday, format } from 'date-fns'

export function useSuscripciones() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['suscripciones', parejaId],
    queryFn: () => db.from('suscripciones').query(
      `pareja_id=eq.${parejaId}&estado=neq.cancelada&order=proxima_fecha.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCrearSuscripcion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('suscripciones').insert({ ...data, pareja_id: parejaId, estado: 'activa' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suscripciones', parejaId] }),
  })
}

export function useActualizarSuscripcion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('suscripciones').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suscripciones', parejaId] }),
  })
}

export function useEliminarSuscripcion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('suscripciones').update({ estado: 'cancelada' }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suscripciones', parejaId] }),
  })
}

// Calcula la siguiente fecha de cobro según la frecuencia
export function siguienteFecha(fecha, frecuencia) {
  const d = typeof fecha === 'string' ? parseISO(fecha) : fecha
  switch (frecuencia) {
    case 'diaria':      return addDays(d, 1)
    case 'semanal':     return addWeeks(d, 1)
    case 'mensual':     return addMonths(d, 1)
    case 'bimestral':   return addMonths(d, 2)
    case 'trimestral':  return addMonths(d, 3)
    case 'semestral':   return addMonths(d, 6)
    case 'anual':       return addYears(d, 1)
    default:            return addMonths(d, 1)
  }
}

// Días restantes hasta la próxima fecha
export function diasHasta(fechaStr) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = parseISO(fechaStr)
  fecha.setHours(0, 0, 0, 0)
  return Math.ceil((fecha - hoy) / 86400000)
}

// Gasto anual estimado de una suscripción
export function gastoAnual(suscripcion) {
  const multiplicador = {
    diaria: 365, semanal: 52, mensual: 12,
    bimestral: 6, trimestral: 4, semestral: 2, anual: 1,
  }
  return Number(suscripcion.monto) * (multiplicador[suscripcion.frecuencia] || 12)
}

export function useRegistrarSuscripcion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ suscripcion, cuentas, tarjetas = [] }) => {
      // 1. Crear transacción si hay método de pago
      if (suscripcion.cuenta_id || suscripcion.tarjeta_id) {
        const [tx] = await db.from('transacciones').insert({
          pareja_id: parejaId,
          tipo: 'gasto',
          monto: suscripcion.monto,
          categoria: suscripcion.categoria || 'suscripciones',
          descripcion: suscripcion.nombre,
          fecha: suscripcion.proxima_fecha,
          persona: suscripcion.persona,
          contexto: suscripcion.contexto || 'personal',
          metodo_pago: suscripcion.cuenta_id
            ? `cuenta:${suscripcion.cuenta_id}`
            : `tarjeta:${suscripcion.tarjeta_id}`,
          cuenta_id: suscripcion.cuenta_id || null,
          tarjeta_id: suscripcion.tarjeta_id || null,
        })
        // Mismo efecto en saldo/deuda que cualquier gasto de la app: descuenta la
        // cuenta O sube saldo_total de la tarjeta. Antes la tarjeta nunca subía,
        // pero borrar la tx sí le restaba — asimetría que descuadraba la deuda.
        await aplicarEfecto(tx, { cuentas, tarjetas })
      }
      // 2. Avanzar proxima_fecha
      const siguiente = siguienteFecha(suscripcion.proxima_fecha, suscripcion.frecuencia)
      await db.from('suscripciones').update(
        { proxima_fecha: format(siguiente, 'yyyy-MM-dd'), ultimo_pago_fecha: suscripcion.proxima_fecha },
        { id: suscripcion.id }
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suscripciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
    },
  })
}

export const FRECUENCIA_LABEL = {
  diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual',
  bimestral: 'Cada 2 meses', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
}

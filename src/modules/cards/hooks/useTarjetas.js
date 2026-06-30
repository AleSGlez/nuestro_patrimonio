// src/modules/cards/hooks/useTarjetas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

export function useTarjetas() {
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useQuery({
    queryKey: ['tarjetas', parejaId],
    queryFn: () => db.from('tarjetas').query({
      pareja_id: `eq.${parejaId}`,
      activa: 'eq.true',
      order: 'orden.asc,created_at.asc',
    }),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCrearTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (data) => {
      const fechas = calcularFechasCorte(data.dia_corte, data.dia_limite_pago)
      return db.from('tarjetas').insert({
        ...data,
        pareja_id: parejaId,
        saldo_total: data.saldo_periodo_anterior || 0,
        pago_sin_intereses: data.saldo_periodo_anterior || 0,
        fecha_corte_proxima: fechas.corte,
        fecha_limite_proxima: fechas.limite,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] }),
  })
}

export function useActualizarTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: ({ id, data }) => {
      // Si cambiaron las fechas de corte, recalcular próximas fechas
      const payload = { ...data }
      if (data.dia_corte || data.dia_limite_pago) {
        const fechas = calcularFechasCorte(data.dia_corte, data.dia_limite_pago)
        payload.fecha_corte_proxima  = fechas.corte
        payload.fecha_limite_proxima = fechas.limite
      }
      return db.from('tarjetas').update(payload, { id })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] }),
  })
}

export function useEliminarTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (id) => db.from('tarjetas').update({ activa: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] }),
  })
}

// ── Registrar un gasto con tarjeta ───────────────────────────
// Suma al saldo_total y a gastos_periodo_actual (se cobra hasta el siguiente corte)
export function useRegistrarGastoTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ tarjetaId, saldoTotal, gastosPeriodoActual, monto }) => {
      const m = Number(monto)
      await db.from('tarjetas').update({
        saldo_total: Number(saldoTotal) + m,
        gastos_periodo_actual: Number(gastosPeriodoActual) + m,
      }, { id: tarjetaId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] }),
  })
}

// ── Procesar corte de tarjeta ─────────────────────────────────
// Cuando llega la fecha de corte: lo que estaba en "gastos_periodo_actual"
// se convierte en "saldo_periodo_anterior" (ahora exigible para pago sin intereses)
// y se recalculan las próximas fechas.
export function useProcesarCorte() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ tarjetaId, gastosPeriodoActual, diaCorte, diaLimitePago }) => {
      const fechas = calcularFechasCorte(diaCorte, diaLimitePago)
      await db.from('tarjetas').update({
        saldo_periodo_anterior: Number(gastosPeriodoActual),
        pago_sin_intereses: Number(gastosPeriodoActual),
        gastos_periodo_actual: 0,
        fecha_corte_proxima: fechas.corte,
        fecha_limite_proxima: fechas.limite,
      }, { id: tarjetaId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] }),
  })
}

// ── Calcular próximas fechas de corte y límite de pago ───────
export function calcularFechasCorte(diaCorte, diaLimitePago) {
  if (!diaCorte) return { corte: null, limite: null }

  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()

  // Próxima fecha de corte (este mes o el siguiente si ya pasó)
  let corte = new Date(año, mes, diaCorte)
  if (corte < hoy) corte = new Date(año, mes + 1, diaCorte)

  // Fecha límite de pago
  let limite = null
  if (diaLimitePago) {
    limite = new Date(año, mes, diaLimitePago)
    // El límite de pago normalmente es DESPUÉS del corte
    if (limite <= corte) limite = new Date(año, mes + 1, diaLimitePago)
  }

  const toISO = (d) => d?.toISOString().split('T')[0] ?? null
  return { corte: toISO(corte), limite: toISO(limite) }
}

// ── Días restantes hasta una fecha ───────────────────────────
export function diasHasta(fechaISO) {
  if (!fechaISO) return null
  const fecha = new Date(fechaISO + 'T00:00:00')
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.ceil((fecha - hoy) / 86400000)
}

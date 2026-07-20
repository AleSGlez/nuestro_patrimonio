// src/modules/cards/hooks/useTarjetas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { periodoTarjeta, montoParaPersona } from '@lib/utils'

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

// ── Desglose del próximo corte por responsable (P1/P2/Negocio) ──────
// Se calcula EN VIVO desde transacciones/transferencias del período vigente
// (periodoTarjeta), no desde `gastos_periodo_actual` — ese contador nunca se
// resetea automáticamente en la app hoy (no hay caller de useProcesarCorte), así
// que no es confiable como fuente de este cálculo.
// `enabled` permite activarlo solo cuando el usuario abre el detalle del corte,
// para no disparar una consulta extra por cada tarjeta de la lista.
export function useDesgloseCorteTarjeta(tarjeta, enabled = true) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const diaCorte = tarjeta?.dia_corte

  return useQuery({
    queryKey: ['desglose-corte-tarjeta', tarjeta?.id, diaCorte],
    queryFn: async () => {
      const { inicio, fin } = periodoTarjeta(diaCorte)

      const [transacciones, disposiciones] = await Promise.all([
        db.from('transacciones').query(
          `pareja_id=eq.${parejaId}&tarjeta_id=eq.${tarjeta.id}&fecha=gte.${inicio}&fecha=lte.${fin}&limit=500`
        ),
        db.from('transferencias').query(
          `pareja_id=eq.${parejaId}&destino_tarjeta_id=eq.${tarjeta.id}&tipo=eq.disposicion_efectivo&fecha=gte.${inicio}&fecha=lte.${fin}&limit=200`
        ),
      ])

      const personales = transacciones.filter((t) => t.contexto !== 'negocio')
      const negocio = transacciones
        .filter((t) => t.contexto === 'negocio')
        .reduce((s, t) => s + Number(t.monto), 0)

      // Mismo criterio que calcularDisponible en usePresupuestos.js: filtrar a las
      // transacciones relevantes para esa persona (suyas o "ambos") ANTES de aplicar
      // montoParaPersona — si no, montoParaPersona no filtra por sí sola y se
      // contarían también las 100%-de-la-otra-persona (doble conteo).
      const p1 = personales
        .filter((t) => t.persona === 'p1' || t.persona === 'ambos')
        .reduce((s, t) => s + montoParaPersona(t, 'p1'), 0)
      const p2 = personales
        .filter((t) => t.persona === 'p2' || t.persona === 'ambos')
        .reduce((s, t) => s + montoParaPersona(t, 'p2'), 0)

      const disposicionEfectivo = disposiciones.reduce(
        (s, t) => s + Number(t.monto) + Number(t.comision || 0), 0
      )

      const total = negocio + p1 + p2 + disposicionEfectivo

      return { inicio, fin, p1, p2, negocio, disposicionEfectivo, total }
    },
    enabled: enabled && !!parejaId && !!tarjeta?.id && !!diaCorte,
    staleTime: 1000 * 60,
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

  const hoy  = new Date()
  hoy.setHours(0, 0, 0, 0)
  const año  = hoy.getFullYear()
  const mes  = hoy.getMonth()

  // Próximo corte: este mes si no pasó, el siguiente si ya pasó
  let corteProximo = new Date(año, mes, diaCorte)
  if (corteProximo < hoy) corteProximo = new Date(año, mes + 1, diaCorte)

  // Límite de pago: siempre es después del ÚLTIMO corte (el que ya pasó)
  // Si hoy es 8 jul y corte es día 7: último corte = 7 jul → límite = 27 jul
  // Si hoy es 6 jul y corte es día 7: último corte = 7 jun → límite = 27 jun
  let limite = null
  if (diaLimitePago) {
    // Último corte (el que ya pasó o es hoy)
    let ultimoCorte = new Date(año, mes, diaCorte)
    if (ultimoCorte > hoy) ultimoCorte = new Date(año, mes - 1, diaCorte)

    // Límite es diaLimitePago del mismo mes del último corte
    // Si el día límite es menor al día de corte, cae en el mes siguiente
    limite = new Date(ultimoCorte.getFullYear(), ultimoCorte.getMonth(), diaLimitePago)
    if (diaLimitePago <= diaCorte) {
      // límite cae en el mes siguiente al corte
      limite = new Date(ultimoCorte.getFullYear(), ultimoCorte.getMonth() + 1, diaLimitePago)
    }

    // Si el límite ya pasó también, usamos el del próximo ciclo
    if (limite < hoy) {
      limite = new Date(corteProximo.getFullYear(), corteProximo.getMonth(), diaLimitePago)
      if (diaLimitePago <= diaCorte) {
        limite = new Date(corteProximo.getFullYear(), corteProximo.getMonth() + 1, diaLimitePago)
      }
    }
  }

  const toISO = (d) => d?.toISOString().split('T')[0] ?? null
  return { corte: toISO(corteProximo), limite: toISO(limite) }
}

// ── Días restantes hasta una fecha ───────────────────────────
export function diasHasta(fechaISO) {
  if (!fechaISO) return null
  const fecha = new Date(fechaISO + 'T00:00:00')
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.ceil((fecha - hoy) / 86400000)
}

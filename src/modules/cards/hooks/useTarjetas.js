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
    mutationFn: (data) => db.from('tarjetas').insert({
      ...data,
      pareja_id: parejaId,
      saldo_total: data.saldo_periodo_anterior || 0,
      pago_sin_intereses: data.saldo_periodo_anterior || 0,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] }),
  })
}

export function useActualizarTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: ({ id, data }) => db.from('tarjetas').update(data, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
      // saldo_total puede cambiar aquí (corrección manual de deuda) — el
      // desglose de corte lo usa y no se refresca solo con lo de arriba.
      qc.invalidateQueries({ queryKey: ['desglose-corte-tarjeta'] })
    },
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

// ── Estado de cuenta en vivo: corte actual + próximo corte por responsable ──
// Todo se deriva de datos siempre frescos, nunca de columnas guardadas que
// puedan quedar viejas (fecha_corte_proxima/fecha_limite_proxima/
// gastos_periodo_actual/saldo_periodo_anterior ya no se mantienen — ver
// migration notes / CLAUDE.md §21 auditoría de tarjetas):
//   - fechas de corte/límite → calcularFechasCorte(), calculada al vuelo.
//   - "próximo corte" (aún no facturado) → periodoTarjeta() sobre
//     transacciones/transferencias del período vigente.
//   - "corte actual" (ya facturado, por vencer) → saldo_total − próximo corte.
//     No se desglosa por responsable: los pagos de tarjeta no se atribuyen a
//     P1/P2/Negocio en este modelo, así que no hay forma exacta de dividir un
//     saldo que ya pudo haberse pagado parcialmente.
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

      const proximoCorteTotal = negocio + p1 + p2 + disposicionEfectivo
      const corteActual = Math.max(0, Number(tarjeta.saldo_total) - proximoCorteTotal)
      const { corte: fechaCorteProxima, limite: fechaLimiteProxima } =
        calcularFechasCorte(tarjeta.dia_corte, tarjeta.dia_limite_pago)

      return {
        inicio, fin, p1, p2, negocio, disposicionEfectivo,
        total: proximoCorteTotal,
        corteActual,
        fechaCorteProxima, fechaLimiteProxima,
      }
    },
    enabled: enabled && !!parejaId && !!tarjeta?.id && !!diaCorte,
    staleTime: 1000 * 60,
  })
}

// ── Gastos y pagos por responsable (p1/p2/negocio) ────────────
// Para "cuánto gastó" usamos transacciones.persona/contexto, igual que
// useDesgloseCorteTarjeta. Para "cuánto pagó" NO existe un campo persona en
// transferencias — un pago sale de una cuenta o apartado, así que se le
// atribuye al dueño de esa cuenta/apartado (es_negocio=true → negocio;
// cuenta.persona='ambos' → mitad y mitad, igual que un gasto compartido).
export function useComparativoTarjeta(tarjeta, periodo = 'periodo', enabled = true) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const diaCorte = tarjeta?.dia_corte

  return useQuery({
    queryKey: ['comparativo-tarjeta', tarjeta?.id, periodo, diaCorte],
    queryFn: async () => {
      let filtroFecha = ''
      if (periodo === 'periodo' && diaCorte) {
        const { inicio, fin } = periodoTarjeta(diaCorte)
        filtroFecha = `&fecha=gte.${inicio}&fecha=lte.${fin}`
      }

      const [gastos, pagos, cuentas, apartados] = await Promise.all([
        db.from('transacciones').query(
          `pareja_id=eq.${parejaId}&tarjeta_id=eq.${tarjeta.id}&tipo=eq.gasto${filtroFecha}&limit=500`
        ),
        db.from('transferencias').query(
          `pareja_id=eq.${parejaId}&destino_tarjeta_id=eq.${tarjeta.id}&tipo=eq.pago_tarjeta${filtroFecha}&limit=500`
        ),
        db.from('cuentas').query(`pareja_id=eq.${parejaId}`),
        db.from('cuenta_apartados').query(`pareja_id=eq.${parejaId}`),
      ])

      // Gastos por responsable — mismo criterio que useDesgloseCorteTarjeta:
      // contexto negocio se atribuye entero a "negocio"; el resto se reparte
      // por transacciones.persona (ambos = 50/50 vía montoParaPersona).
      const personales = gastos.filter((t) => t.contexto !== 'negocio')
      const gastosNegocio = gastos
        .filter((t) => t.contexto === 'negocio')
        .reduce((s, t) => s + Number(t.monto), 0)
      const gastosP1 = personales
        .filter((t) => t.persona === 'p1' || t.persona === 'ambos')
        .reduce((s, t) => s + montoParaPersona(t, 'p1'), 0)
      const gastosP2 = personales
        .filter((t) => t.persona === 'p2' || t.persona === 'ambos')
        .reduce((s, t) => s + montoParaPersona(t, 'p2'), 0)

      // Pagos por responsable — atribuidos por la cuenta/apartado de origen.
      const personaDeCuenta = (cuentaId) => cuentas.find((c) => c.id === cuentaId)?.persona || null
      const personaDePago = (t) => {
        if (t.origen_apartado_id) {
          const ap = apartados.find((a) => a.id === t.origen_apartado_id)
          if (ap?.es_negocio) return 'negocio'
          return personaDeCuenta(ap?.cuenta_id)
        }
        return personaDeCuenta(t.origen_cuenta_id)
      }

      const pagosPorPersona = { p1: 0, p2: 0, negocio: 0 }
      pagos.forEach((t) => {
        const p = personaDePago(t)
        const m = Number(t.monto)
        if (p === 'ambos')                             { pagosPorPersona.p1 += m / 2; pagosPorPersona.p2 += m / 2 }
        else if (p === 'p1' || p === 'p2' || p === 'negocio') pagosPorPersona[p] += m
        // si la cuenta/apartado de origen ya no existe (se borró), se omite del desglose
      })

      return {
        gastos: { p1: gastosP1, p2: gastosP2, negocio: gastosNegocio },
        pagos: pagosPorPersona,
      }
    },
    enabled: enabled && !!parejaId && !!tarjeta?.id,
    staleTime: 1000 * 60,
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

// ── Alertas de pagos de tarjeta próximos a vencer (≤5 días) ──
// Compartido entre InicioPage (mobile, inline) y RightRail (desktop).
export function useAlertasTarjetas() {
  const { data: tarjetas = [] } = useTarjetas()
  const alertas = []
  tarjetas.forEach((t) => {
    if (t.dia_corte && t.dia_limite_pago) {
      const { limite } = calcularFechasCorte(t.dia_corte, t.dia_limite_pago)
      const dias = diasHasta(limite)
      if (dias != null && dias >= 0 && dias <= 5) {
        alertas.push({ msg: `Pago ${t.nombre} vence ${dias === 0 ? 'hoy' : `en ${dias} días`}`, tipo: 'warn' })
      }
    }
  })
  return alertas
}

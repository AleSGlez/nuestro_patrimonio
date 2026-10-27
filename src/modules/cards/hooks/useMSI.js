// src/modules/cards/hooks/useMSI.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { aplicarEfecto } from '@modules/transactions/hooks/useTransacciones'
import { addMonths, format, parseISO } from 'date-fns'

export function useComprasMSI(tarjetaId) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['compras-msi', parejaId, tarjetaId],
    queryFn: () => db.from('compras_msi').query(
      `pareja_id=eq.${parejaId}&tarjeta_id=eq.${tarjetaId}&order=activa.desc,proxima_fecha.asc`
    ),
    enabled: !!parejaId && !!tarjetaId,
    staleTime: 1000 * 60 * 2,
  })
}

// Todas las compras MSI activas de la pareja (para saber, ej., si una tarjeta
// tiene MSI pendientes sin tener que cargarlas todas una por una).
export function useTodasLasComprasMSI() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['compras-msi', parejaId, 'todas'],
    queryFn: () => db.from('compras_msi').query(
      `pareja_id=eq.${parejaId}&activa=eq.true&order=proxima_fecha.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

const round2 = (n) => Math.round(n * 100) / 100

export function calcularMontoMensual(montoTotal, mesesTotal) {
  if (!montoTotal || !mesesTotal) return 0
  return round2(Number(montoTotal) / Number(mesesTotal))
}

export function mesesRestantes(compra) {
  return Math.max(0, compra.meses_total - compra.meses_pagados)
}

export function montoRestante(compra) {
  return round2(Number(compra.monto_total) - Number(compra.monto_mensual) * compra.meses_pagados)
}

// ── Registra N mensualidades de una compra MSI en una sola transacción ──
// Usada al registrar/adelantar pagos (N elegido por el usuario, ver
// useRegistrarPagoMSI). El monto del último lote se ajusta contra
// monto_total para no arrastrar el redondeo de monto_mensual.
async function registrarInstalmentos(compra, cantidad, { cuentas, tarjetas }) {
  const restantes = compra.meses_total - compra.meses_pagados
  const n = Math.max(1, Math.min(cantidad, restantes))
  const esUltimoLote = compra.meses_pagados + n >= compra.meses_total

  const monto = esUltimoLote
    ? round2(Number(compra.monto_total) - Number(compra.monto_mensual) * compra.meses_pagados)
    : round2(Number(compra.monto_mensual) * n)

  const [tx] = await db.from('transacciones').insert({
    pareja_id: compra.pareja_id,
    tipo: 'gasto',
    monto,
    categoria: compra.categoria || 'otros',
    descripcion: n > 1
      ? `${compra.descripcion} (${n} mensualidades MSI)`
      : `${compra.descripcion} (mensualidad MSI ${compra.meses_pagados + 1}/${compra.meses_total})`,
    fecha: compra.proxima_fecha,
    persona: compra.persona,
    contexto: compra.contexto,
    metodo_pago: `tarjeta:${compra.tarjeta_id}`,
    tarjeta_id: compra.tarjeta_id,
  })
  await aplicarEfecto(tx, { cuentas, tarjetas })

  const mesesPagados = compra.meses_pagados + n
  const siguiente = format(addMonths(parseISO(compra.proxima_fecha), n), 'yyyy-MM-dd')

  await db.from('compras_msi').update({
    meses_pagados: mesesPagados,
    proxima_fecha: siguiente,
    activa: mesesPagados < compra.meses_total,
  }, { id: compra.id })

  return tx
}

function invalidarTodo(qc, parejaId) {
  qc.invalidateQueries({ queryKey: ['compras-msi', parejaId] })
  qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
  qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
  qc.invalidateQueries({ queryKey: ['desglose-corte-tarjeta'] })
  qc.invalidateQueries({ queryKey: ['movimientos-periodo-tarjeta'] })
  qc.invalidateQueries({ queryKey: ['comparativo-tarjeta'] })
}

// ── Crear compra MSI ─────────────────────────────────────────
// Solo crea el plan (0 meses pagados) — NO registra ninguna transacción
// todavía. El banco aún no te ha cobrado nada por esta compra, así que
// saldo_total no debe moverse hasta que el usuario registre manualmente la
// mensualidad cuando de verdad aparezca cobrada (igual que suscripciones).
// Mientras tanto, el monto completo se refleja como "comprometido" (ver
// montoRestante) para descontarlo del disponible real de la tarjeta.
export function useCrearCompraMSI() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async (data) => {
      const monto_mensual = calcularMontoMensual(data.monto_total, data.meses_total)
      const [compra] = await db.from('compras_msi').insert({
        ...data,
        pareja_id: parejaId,
        monto_mensual,
        meses_pagados: 0,
        proxima_fecha: data.fecha_compra,
        activa: true,
      })
      return compra
    },
    onSuccess: () => invalidarTodo(qc, parejaId),
  })
}

// ── Registrar / adelantar mensualidades ───────────────────────
// cantidad > 1 = "adelantar pagos": registra varias mensualidades de golpe
// en una sola transacción y avanza proxima_fecha esos mismos meses.
export function useRegistrarPagoMSI() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: ({ compra, cantidad = 1, cuentas, tarjetas }) =>
      registrarInstalmentos(compra, cantidad, { cuentas, tarjetas }),
    onSuccess: () => invalidarTodo(qc, parejaId),
  })
}

// Solo metadata editable — cambiar monto_total/meses_total a medio plan
// rompería el prorrateo de lo ya registrado, así que no se expone aquí.
export function useActualizarCompraMSI() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: ({ id, data }) => db.from('compras_msi').update(data, { id }),
    onSuccess: () => invalidarTodo(qc, parejaId),
  })
}

export function useCancelarCompraMSI() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (id) => db.from('compras_msi').update({ activa: false }, { id }),
    onSuccess: () => invalidarTodo(qc, parejaId),
  })
}

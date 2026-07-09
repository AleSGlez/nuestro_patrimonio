// src/modules/transactions/hooks/useTransacciones.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

// Lista de transacciones con filtros opcionales
export function useTransacciones(filtros = {}) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const { contexto, mes } = filtros

  return useQuery({
    queryKey: ['transacciones', parejaId, contexto, mes],
    queryFn: () => {
      const params = {
        pareja_id: `eq.${parejaId}`,
        order: 'fecha.desc,created_at.desc',
        limit: 500,
      }
      if (contexto) params.contexto = `eq.${contexto}`

      // 'fecha' es columna DATE — like.* no funciona sobre DATE en PostgREST.
      // Se usa rango gte/lte del primer al último día del mes.
      if (mes) {
        const [año, mesNum] = mes.split('-').map(Number)
        const inicio = `${mes}-01`
        const ultimoDia = new Date(año, mesNum, 0).getDate() // día 0 del mes siguiente = último día de este mes
        const fin = `${mes}-${String(ultimoDia).padStart(2, '0')}`
        // PostgREST no permite dos condiciones en el mismo campo como params planos,
        // así que se arma como string raw con 'and'
        return db.from('transacciones').query(
          `pareja_id=eq.${parejaId}&fecha=gte.${inicio}&fecha=lte.${fin}` +
          (contexto ? `&contexto=eq.${contexto}` : '') +
          `&order=fecha.desc,created_at.desc&limit=500`
        )
      }

      return db.from('transacciones').query(params)
    },
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })
}

// ── Parsea el método de pago ──────────────────────────────────
function parsearMetodoPago(metodo_pago, cuenta_id, tarjeta_id) {
  // Formato nuevo: "cuenta:UUID" o "tarjeta:UUID" o "apartado:UUID:cuentaUUID"
  if (metodo_pago?.startsWith('cuenta:')) {
    return { tipo: 'cuenta', id: metodo_pago.split(':')[1] }
  }
  if (metodo_pago?.startsWith('tarjeta:')) {
    return { tipo: 'tarjeta', id: metodo_pago.split(':')[1] }
  }
  if (metodo_pago?.startsWith('apartado:')) {
    // El dinero ya fue descontado del apartado al registrar — solo actualizar la cuenta origen
    return { tipo: 'apartado', apartadoId: metodo_pago.split(':')[1], cuentaId: metodo_pago.split(':')[2] }
  }
  // Formato legacy: campo separado
  if (metodo_pago === 'cuenta' && cuenta_id) return { tipo: 'cuenta', id: cuenta_id }
  if (metodo_pago === 'tarjeta' && tarjeta_id) return { tipo: 'tarjeta', id: tarjeta_id }
  return null
}

// ── Aplica el efecto de una transacción en el saldo de cuenta/tarjeta ──
async function aplicarEfecto(tx, ctx) {
  const m      = Number(tx.monto)
  const metodo = parsearMetodoPago(tx.metodo_pago, tx.cuenta_id, tx.tarjeta_id)
  if (!metodo) return

  if (metodo.tipo === 'cuenta') {
    const cuenta = ctx.cuentas.find((c) => c.id === metodo.id)
    if (cuenta) {
      const delta = tx.tipo === 'ingreso' ? m : -m
      await db.from('cuentas').update({ saldo: Number(cuenta.saldo) + delta }, { id: cuenta.id })
    }
  }

  if (metodo.tipo === 'tarjeta' && tx.tipo === 'gasto') {
    const tarjeta = ctx.tarjetas.find((t) => t.id === metodo.id)
    if (tarjeta) {
      await db.from('tarjetas').update({
        saldo_total:           Number(tarjeta.saldo_total) + m,
        gastos_periodo_actual: Number(tarjeta.gastos_periodo_actual) + m,
      }, { id: tarjeta.id })
    }
  }

  // Apartado: el saldo de la cuenta origen ya fue descontado al registrar la tx
  // No hacer nada aquí para evitar doble cargo
}

// ── Revierte el efecto de una transacción (para editar/eliminar) ──
async function revertirEfecto(tx, ctx) {
  const m      = Number(tx.monto)
  const metodo = parsearMetodoPago(tx.metodo_pago, tx.cuenta_id, tx.tarjeta_id)
  if (!metodo) return

  if (metodo.tipo === 'cuenta') {
    const cuenta = ctx.cuentas.find((c) => c.id === metodo.id)
    if (cuenta) {
      // Revertir: si era ingreso → restar; si era gasto → sumar
      const delta = tx.tipo === 'ingreso' ? -m : m
      await db.from('cuentas').update({ saldo: Number(cuenta.saldo) + delta }, { id: cuenta.id })
    }
  }

  if (metodo.tipo === 'tarjeta' && tx.tipo === 'gasto') {
    const tarjeta = ctx.tarjetas.find((t) => t.id === metodo.id)
    if (tarjeta) {
      await db.from('tarjetas').update({
        saldo_total:           Math.max(0, Number(tarjeta.saldo_total) - m),
        gastos_periodo_actual: Math.max(0, Number(tarjeta.gastos_periodo_actual) - m),
      }, { id: tarjeta.id })
    }
  }

  if (metodo.tipo === 'apartado') {
    // Al revertir una tx pagada con apartado: devolver el monto al apartado
    const { db: dbLib } = await import('@lib/supabase')
    const [apartado] = await db.from('cuenta_apartados').query(`id=eq.${metodo.apartadoId}`)
    if (apartado) {
      await db.from('cuenta_apartados').update(
        { monto: Number(apartado.monto) + m }, { id: apartado.id }
      )
    }
  }
}

// ── Crear transacción ────────────────────────────────────────
export function useCrearTransaccion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ cuentas, tarjetas, ...data }) => {
      const [creada] = await db.from('transacciones').insert({ ...data, pareja_id: parejaId })
      await aplicarEfecto(creada, { cuentas, tarjetas })
      return creada
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
    },
  })
}

// ── Editar transacción ───────────────────────────────────────
// Revierte el efecto anterior, aplica el nuevo
export function useActualizarTransaccion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ id, txAnterior, data, cuentas, tarjetas }) => {
      await revertirEfecto(txAnterior, { cuentas, tarjetas })

      // Refrescar saldos locales después de revertir (para aplicar correctamente)
      const cuentasFrescas = await db.from('cuentas').query({ pareja_id: `eq.${parejaId}`, activa: 'eq.true' })
      const tarjetasFrescas = await db.from('tarjetas').query({ pareja_id: `eq.${parejaId}`, activa: 'eq.true' })

      const [actualizada] = await db.from('transacciones').update(data, { id })
      await aplicarEfecto(actualizada, { cuentas: cuentasFrescas, tarjetas: tarjetasFrescas })
      return actualizada
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
    },
  })
}

// ── Eliminar transacción ─────────────────────────────────────
export function useEliminarTransaccion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ tx, cuentas, tarjetas }) => {
      await revertirEfecto(tx, { cuentas, tarjetas })
      await db.from('transacciones').delete({ id: tx.id })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
    },
  })
}

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

// ── Aplica el efecto de una transacción en el saldo de cuenta/tarjeta ──
async function aplicarEfecto(tx, ctx) {
  const m = Number(tx.monto)

  if (tx.metodo_pago === 'cuenta' && tx.cuenta_id) {
    const cuenta = ctx.cuentas.find((c) => c.id === tx.cuenta_id)
    if (cuenta) {
      const nuevoSaldo = Number(cuenta.saldo) + (tx.tipo === 'ingreso' ? m : -m)
      await db.from('cuentas').update({ saldo: nuevoSaldo }, { id: cuenta.id })
    }
  }

  if (tx.metodo_pago === 'tarjeta' && tx.tarjeta_id && tx.tipo === 'gasto') {
    const tarjeta = ctx.tarjetas.find((t) => t.id === tx.tarjeta_id)
    if (tarjeta) {
      // El gasto con tarjeta suma a saldo_total y a gastos_periodo_actual
      // (se pagará hasta el siguiente corte)
      await db.from('tarjetas').update({
        saldo_total: Number(tarjeta.saldo_total) + m,
        gastos_periodo_actual: Number(tarjeta.gastos_periodo_actual) + m,
      }, { id: tarjeta.id })
    }
  }
}

// ── Revierte el efecto de una transacción (para editar/eliminar) ──
async function revertirEfecto(tx, ctx) {
  const m = Number(tx.monto)

  if (tx.metodo_pago === 'cuenta' && tx.cuenta_id) {
    const cuenta = ctx.cuentas.find((c) => c.id === tx.cuenta_id)
    if (cuenta) {
      const nuevoSaldo = Number(cuenta.saldo) - (tx.tipo === 'ingreso' ? m : -m)
      await db.from('cuentas').update({ saldo: nuevoSaldo }, { id: cuenta.id })
    }
  }

  if (tx.metodo_pago === 'tarjeta' && tx.tarjeta_id && tx.tipo === 'gasto') {
    const tarjeta = ctx.tarjetas.find((t) => t.id === tx.tarjeta_id)
    if (tarjeta) {
      await db.from('tarjetas').update({
        saldo_total: Math.max(0, Number(tarjeta.saldo_total) - m),
        gastos_periodo_actual: Math.max(0, Number(tarjeta.gastos_periodo_actual) - m),
      }, { id: tarjeta.id })
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

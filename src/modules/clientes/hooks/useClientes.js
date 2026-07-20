// src/modules/clientes/hooks/useClientes.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { aplicarEfecto, revertirEfecto } from '@modules/transactions/hooks/useTransacciones'
import { today } from '@lib/utils'

export function useClientes() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['clientes', parejaId],
    queryFn: () => db.from('clientes').query(
      `pareja_id=eq.${parejaId}&activo=eq.true&order=nombre.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCrearCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('clientes').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes', parejaId] }),
  })
}

export function useActualizarCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('clientes').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes', parejaId] }),
  })
}

export function useEliminarCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('clientes').update({ activo: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes', parejaId] }),
  })
}

export function useVentasCliente(clienteId) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['ventas-cliente', clienteId],
    queryFn: () => db.from('ventas').query(
      `pareja_id=eq.${parejaId}&cliente_id=eq.${clienteId}&order=fecha.desc`
    ),
    enabled: !!clienteId,
    staleTime: 1000 * 60 * 2,
  })
}

// ── Cuentas por cobrar ─────────────────────────────────────────

export function useClientesConAdeudo() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['clientes-adeudo', parejaId],
    queryFn: () => db.from('clientes').query(
      `pareja_id=eq.${parejaId}&activo=eq.true&saldo_pendiente=gt.0&order=adeudo_desde.asc.nullslast`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })
}

export function useClienteMovimientos(clienteId) {
  return useQuery({
    queryKey: ['cliente-movimientos', clienteId],
    queryFn: () => db.from('clientes_movimientos').query(
      `cliente_id=eq.${clienteId}&order=fecha.desc,created_at.desc`
    ),
    enabled: !!clienteId,
    staleTime: 1000 * 60,
  })
}

// Registra un cargo (nuevo adeudo) o un pago (parcial o total) de un cliente.
// Un 'pago' es ingreso real del negocio — a diferencia de personas_movimientos
// (donde un pago_recibido solo toca el saldo de la cuenta), aquí también se crea
// una transacción de ingreso vía aplicarEfecto, para que aparezca en Movimientos/
// Reportes/Presupuesto de negocio sin lógica adicional.
export function useRegistrarMovimientoCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ cliente, tipo, monto, descripcion, fecha, ventaId, cuentaId, cuentas = [] }) => {
      const m = Number(monto)
      const saldoAnterior = Number(cliente.saldo_pendiente)

      let transaccionId = null
      if (tipo === 'pago') {
        const [creada] = await db.from('transacciones').insert({
          pareja_id: parejaId,
          tipo: 'ingreso', contexto: 'negocio', persona: 'ambos',
          categoria: 'ventas',
          descripcion: descripcion || `Pago de ${cliente.nombre}`,
          fecha, metodo_pago: `cuenta:${cuentaId}`, cuenta_id: cuentaId, tarjeta_id: null,
        })
        await aplicarEfecto(creada, { cuentas, tarjetas: [] })
        transaccionId = creada.id
      }

      await db.from('clientes_movimientos').insert({
        pareja_id: parejaId, cliente_id: cliente.id, tipo, monto: m,
        descripcion: descripcion || null, fecha: fecha || today(),
        venta_id: ventaId || null,
        cuenta_id: tipo === 'pago' ? cuentaId : null,
        transaccion_id: transaccionId,
      })

      const nuevoSaldo = tipo === 'cargo' ? saldoAnterior + m : Math.max(0, saldoAnterior - m)
      const payload = { saldo_pendiente: nuevoSaldo }
      if (tipo === 'cargo' && saldoAnterior === 0) payload.adeudo_desde = fecha || today()
      if (nuevoSaldo === 0) payload.adeudo_desde = null

      await db.from('clientes').update(payload, { id: cliente.id })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clientes', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes-adeudo', parejaId] })
      qc.invalidateQueries({ queryKey: ['cliente-movimientos', vars.cliente.id] })
      if (vars.tipo === 'pago') {
        qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
        qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      }
    },
  })
}

// Elimina un movimiento y revierte su efecto — si era un 'pago' con transacción
// vinculada, revierte también el saldo de la cuenta y borra esa transacción
// (mismo patrón que useEliminarLote en useCompras.js).
export function useEliminarMovimientoCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ movimiento, cliente, cuentas = [] }) => {
      const m = Number(movimiento.monto)
      const saldoActual = Number(cliente.saldo_pendiente)

      const nuevoSaldo = movimiento.tipo === 'cargo'
        ? Math.max(0, saldoActual - m)
        : saldoActual + m

      const payload = { saldo_pendiente: nuevoSaldo }
      if (nuevoSaldo === 0) payload.adeudo_desde = null
      await db.from('clientes').update(payload, { id: cliente.id })

      if (movimiento.tipo === 'pago' && movimiento.transaccion_id) {
        const [tx] = await db.from('transacciones').query(`id=eq.${movimiento.transaccion_id}`)
        if (tx) {
          await revertirEfecto(tx, { cuentas, tarjetas: [] })
          await db.from('transacciones').delete({ id: tx.id })
        }
      }

      await db.from('clientes_movimientos').delete({ id: movimiento.id })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clientes', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes-adeudo', parejaId] })
      qc.invalidateQueries({ queryKey: ['cliente-movimientos', vars.cliente.id] })
      if (vars.movimiento.tipo === 'pago') {
        qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
        qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      }
    },
  })
}

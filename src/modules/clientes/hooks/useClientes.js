// src/modules/clientes/hooks/useClientes.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { aplicarEfecto, revertirEfecto, parsearMetodoPago } from '@modules/transactions/hooks/useTransacciones'
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

// Cargos de un cliente que todavía tienen saldo restante propio (permite
// elegir "a cuál de sus adeudos aplica este pago" en FormPagoCliente).
// Solo incluye cargos creados después de la migración de desglose por
// cargo — los históricos (saldo_restante NULL) quedan fuera a propósito,
// ya que no hay forma confiable de saber cuánto de ellos sigue pendiente
// de forma individual (gt.0 sobre NULL siempre es falso en PostgREST).
export function useCargosPendientesCliente(clienteId) {
  return useQuery({
    queryKey: ['cliente-cargos-pendientes', clienteId],
    queryFn: () => db.from('clientes_movimientos').query(
      `cliente_id=eq.${clienteId}&tipo=eq.cargo&saldo_restante=gt.0&order=fecha.asc,created_at.asc`
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
//
// metodoPago acepta el mismo formato que transacciones.metodo_pago —
// "cuenta:UUID" o "apartado:UUID:cuentaUUID" — para poder cobrar directo a
// un apartado de negocio, no solo a una cuenta.
//
// cargoId (opcional): si el pago aplica a un cargo específico (el cliente
// debe por 2 cosas y se está pagando solo una), se descuenta el saldo_restante
// de ESE cargo puntual además del saldo agregado del cliente — así el resto
// de sus adeudos quedan intactos y se pueden seguir cobrando por separado.
//
// Exportada como función plana (no-hook) — la reusa useVentas.js al registrar una
// venta con pago parcial, para crear el cargo del saldo pendiente con exactamente
// la misma lógica que usa Cobros, sin duplicarla.
export async function aplicarMovimientoCliente({ parejaId, cliente, tipo, monto, descripcion, fecha, ventaId, metodoPago, cargoId, cuentas = [] }) {
  const m = Number(monto)
  const saldoAnterior = Number(cliente.saldo_pendiente)

  let transaccionId = null
  let cuentaId = null
  if (tipo === 'pago') {
    const metodo = parsearMetodoPago(metodoPago)
    cuentaId = metodo?.tipo === 'apartado' ? metodo.cuentaId : metodo?.id

    const [creada] = await db.from('transacciones').insert({
      pareja_id: parejaId,
      tipo: 'ingreso', contexto: 'negocio', persona: 'ambos',
      categoria: 'ventas', monto: m,
      descripcion: descripcion || `Pago de ${cliente.nombre}`,
      fecha, metodo_pago: metodoPago, cuenta_id: cuentaId, tarjeta_id: null,
    })
    await aplicarEfecto(creada, { cuentas, tarjetas: [] })
    transaccionId = creada.id

    if (cargoId) {
      const [cargo] = await db.from('clientes_movimientos').query(`id=eq.${cargoId}`)
      if (cargo) {
        const restanteAnterior = Number(cargo.saldo_restante ?? cargo.monto)
        await db.from('clientes_movimientos').update(
          { saldo_restante: Math.max(0, restanteAnterior - m) }, { id: cargoId }
        )
      }
    }
  }

  await db.from('clientes_movimientos').insert({
    pareja_id: parejaId, cliente_id: cliente.id, tipo, monto: m,
    descripcion: descripcion || null, fecha: fecha || today(),
    venta_id: ventaId || null,
    cuenta_id: tipo === 'pago' ? cuentaId : null,
    transaccion_id: transaccionId,
    cargo_id: tipo === 'pago' ? (cargoId || null) : null,
    saldo_restante: tipo === 'cargo' ? m : null,
  })

  const nuevoSaldo = tipo === 'cargo' ? saldoAnterior + m : Math.max(0, saldoAnterior - m)
  const payload = { saldo_pendiente: nuevoSaldo }
  if (tipo === 'cargo' && saldoAnterior === 0) payload.adeudo_desde = fecha || today()
  if (nuevoSaldo === 0) payload.adeudo_desde = null

  await db.from('clientes').update(payload, { id: cliente.id })

  return { transaccionId, nuevoSaldo }
}

export function useRegistrarMovimientoCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (vars) => aplicarMovimientoCliente({ parejaId, ...vars }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clientes', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes-adeudo', parejaId] })
      qc.invalidateQueries({ queryKey: ['cliente-movimientos', vars.cliente.id] })
      qc.invalidateQueries({ queryKey: ['cliente-cargos-pendientes', vars.cliente.id] })
      if (vars.tipo === 'pago') {
        qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
        qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
        qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
        qc.invalidateQueries({ queryKey: ['apartados'] })
      }
    },
  })
}

// Revierte un movimiento (cargo o pago) — si era un 'pago' con transacción
// vinculada, revierte también el saldo de la cuenta/apartado y borra esa
// transacción (mismo patrón que useEliminarLote en useCompras.js). Si el pago
// estaba ligado a un cargo específico, le regresa lo pagado a su saldo_restante.
// Un cargo con pagos ya ligados no se puede borrar directamente (dejaría el
// saldo agregado inconsistente) — hay que borrar primero esos pagos.
//
// Exportada como función plana — la reusa useVentas.js al cancelar una venta
// que dejó un cargo abierto.
export async function revertirMovimientoCliente({ movimiento, cliente, cuentas = [] }) {
  if (movimiento.tipo === 'cargo') {
    const pagosLigados = await db.from('clientes_movimientos').query(`cargo_id=eq.${movimiento.id}`)
    if (pagosLigados.length > 0) {
      throw new Error('Este cargo ya tiene pagos registrados. Elimina primero esos pagos.')
    }
  }

  const m = Number(movimiento.monto)
  const saldoActual = Number(cliente.saldo_pendiente)

  const nuevoSaldo = movimiento.tipo === 'cargo'
    ? Math.max(0, saldoActual - m)
    : saldoActual + m

  const payload = { saldo_pendiente: nuevoSaldo }
  if (nuevoSaldo === 0) payload.adeudo_desde = null
  await db.from('clientes').update(payload, { id: cliente.id })

  if (movimiento.tipo === 'pago' && movimiento.cargo_id) {
    const [cargo] = await db.from('clientes_movimientos').query(`id=eq.${movimiento.cargo_id}`)
    if (cargo) {
      await db.from('clientes_movimientos').update(
        { saldo_restante: Number(cargo.saldo_restante ?? 0) + m }, { id: cargo.id }
      )
    }
  }

  if (movimiento.tipo === 'pago' && movimiento.transaccion_id) {
    const [tx] = await db.from('transacciones').query(`id=eq.${movimiento.transaccion_id}`)
    if (tx) {
      await revertirEfecto(tx, { cuentas, tarjetas: [] })
      await db.from('transacciones').delete({ id: tx.id })
    }
  }

  await db.from('clientes_movimientos').delete({ id: movimiento.id })
}

export function useEliminarMovimientoCliente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: revertirMovimientoCliente,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clientes', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes-adeudo', parejaId] })
      qc.invalidateQueries({ queryKey: ['cliente-movimientos', vars.cliente.id] })
      qc.invalidateQueries({ queryKey: ['cliente-cargos-pendientes', vars.cliente.id] })
      if (vars.movimiento.tipo === 'pago') {
        qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
        qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
        qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
        qc.invalidateQueries({ queryKey: ['apartados'] })
      }
    },
  })
}

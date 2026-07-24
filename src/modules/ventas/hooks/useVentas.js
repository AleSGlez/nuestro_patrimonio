// src/modules/ventas/hooks/useVentas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { calcularCostoReal } from '@modules/inventario/hooks/useInventario'
import { aplicarMovimientoCliente, revertirMovimientoCliente } from '@modules/clientes/hooks/useClientes'
import { revertirEfecto } from '@modules/transactions/hooks/useTransacciones'

export { calcularCostoReal }

const COMISION_PCT = {
  efectivo: 0, transferencia: 0,
  mercadolibre: 13.25, paypal: 4.4,
  otro: 0,
}

export function useVentas() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['ventas', parejaId],
    queryFn: () => db.from('ventas').query(
      `pareja_id=eq.${parejaId}&order=fecha.desc&limit=100`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useVentaItems(ventaId) {
  return useQuery({
    queryKey: ['venta-items', ventaId],
    queryFn: () => db.from('ventas_items').query(
      `venta_id=eq.${ventaId}&order=created_at.asc`
    ),
    enabled: !!ventaId,
    staleTime: 1000 * 60,
  })
}

export const METODOS_COBRO = [
  { value: 'efectivo',      label: '💵 Efectivo',           comision: 0 },
  { value: 'transferencia', label: '🏦 Transferencia',       comision: 0 },
  { value: 'mercadolibre',  label: '🛒 MercadoLibre',        comision: 13.25 },
  { value: 'paypal',        label: '🅿️ PayPal',              comision: 4.4 },
  { value: 'otro',          label: '💳 Otro',                comision: 0 },
]

// Registra una venta completa:
// 1. Descuenta stock de cada producto
// 2. Crea la venta y sus items
// 3. Si se recibió dinero ahora, crea transacción de ingreso y actualiza la cuenta
// 4. Si quedó un saldo pendiente (venta sin cuenta, o pago parcial) y hay cliente,
//    registra ese saldo como cargo en Cobros enlazado a esta venta — misma lógica
//    que usa el módulo de Clientes (aplicarMovimientoCliente), sin duplicarla.
export function useRegistrarVenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ items, clienteId, clientes = [], fecha, metodoCobro, cuentaId, montoRecibido, nota, cuentas }) => {
      // ── Calcular totales ─────────────────────────────────
      const comisionPct = METODOS_COBRO.find((m) => m.value === metodoCobro)?.comision || 0

      let totalVenta = 0
      let totalCosto = 0

      const itemsCalculados = items.map((item) => {
        const costoUnitario = calcularCostoReal(item.producto)
        const subtotal      = Number(item.precioVenta) * item.cantidad
        const costoTotal    = costoUnitario * item.cantidad
        const gananciaItem  = subtotal - costoTotal
        totalVenta += subtotal
        totalCosto += costoTotal
        return {
          producto_id:    item.producto.id,
          cantidad:       item.cantidad,
          precio_venta:   Number(item.precioVenta),
          costo_unitario: costoUnitario,
          subtotal,
          ganancia_item:  gananciaItem,
        }
      })

      const comisionMonto = totalVenta * (comisionPct / 100)
      const ganancia      = totalVenta - totalCosto - comisionMonto

      // ── 1. Crear venta ───────────────────────────────────
      const [venta] = await db.from('ventas').insert({
        pareja_id: parejaId,
        cliente_id: clienteId || null,
        fecha, metodo_cobro: metodoCobro,
        cuenta_id: cuentaId || null,
        total_venta: totalVenta, total_costo: totalCosto,
        ganancia, comision_pct: comisionPct, comision_monto: comisionMonto,
        nota: nota || null, estado: 'completada',
      })

      // ── 2. Crear items ───────────────────────────────────
      await Promise.all(itemsCalculados.map((item) =>
        db.from('ventas_items').insert({ ...item, venta_id: venta.id })
      ))

      // ── 3. Descontar stock ───────────────────────────────
      await Promise.all(items.map((item) => {
        const nuevoStock = Math.max(0, Number(item.producto.cantidad_stock) - item.cantidad)
        const patch = { cantidad_stock: nuevoStock }
        if (nuevoStock === 0) patch.estado = 'vendido'
        return db.from('productos').update(patch, { id: item.producto.id })
      }))

      // ── 4. Dinero recibido ahora vs. saldo pendiente ─────
      // `montoRecibido` es en términos brutos (lo que pagó el cliente del total_venta).
      // Sin cuenta seleccionada no hay dónde depositar nada, así que se trata como
      // si no se hubiera recibido nada todavía (igual que el comportamiento previo).
      const recibido  = cuentaId ? Math.min(Number(montoRecibido ?? totalVenta), totalVenta) : 0
      const pendiente = Math.max(0, totalVenta - recibido)

      if (recibido > 0) {
        // La comisión de la plataforma aplica proporcional a lo efectivamente cobrado
        const comisionRecibida = recibido * (comisionPct / 100)
        const netoRecibido = recibido - comisionRecibida

        const [tx] = await db.from('transacciones').insert({
          pareja_id: parejaId,
          tipo: 'ingreso',
          monto: netoRecibido,
          categoria: 'ventas',
          descripcion: `Venta — ${items.length} carta${items.length > 1 ? 's' : ''}`,
          fecha, persona: 'ambos', contexto: 'negocio',
          metodo_pago: `cuenta:${cuentaId}`,
        })

        const cuenta = cuentas.find((c) => c.id === cuentaId)
        if (cuenta) {
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) + netoRecibido },
            { id: cuentaId }
          )
        }

        await db.from('ventas').update({ transaccion_id: tx.id }, { id: venta.id })
      }

      if (pendiente > 0 && clienteId) {
        const cliente = clientes.find((c) => c.id === clienteId)
        if (cliente) {
          await aplicarMovimientoCliente({
            parejaId, cliente, tipo: 'cargo', monto: pendiente,
            descripcion: `Venta — ${items.length} carta${items.length > 1 ? 's' : ''}`,
            fecha, ventaId: venta.id,
          })
        }
      }

      return venta
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ventas', parejaId] })
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes-adeudo', parejaId] })
      if (vars.clienteId) qc.invalidateQueries({ queryKey: ['cliente-movimientos', vars.clienteId] })
    },
  })
}

// Cancela una venta y revierte TODO lo que generó al registrarla:
// 1. Devuelve el stock de cada carta vendida
// 2. Si se había cobrado algo (transaccion_id), revierte el saldo de la cuenta y
//    borra esa transacción — mismo patrón que useEliminarLote en useCompras.js
// 3. Si quedó un cargo abierto en Cobros (venta con saldo pendiente), lo revierte
//    y lo borra — reusa revertirMovimientoCliente, sin duplicar esa lógica
export function useCancelarVenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ ventaId, cuentas = [] }) => {
      const [venta] = await db.from('ventas').query(`id=eq.${ventaId}`)
      if (!venta) throw new Error('Venta no encontrada')

      // 1. Restaurar stock (y sacar del estado 'vendido' si vuelve a haber unidades)
      const items = await db.from('ventas_items').query(`venta_id=eq.${ventaId}`)
      await Promise.all(items.map(async (item) => {
        const [producto] = await db.from('productos').query(`id=eq.${item.producto_id}`)
        if (producto) {
          const nuevoStock = Number(producto.cantidad_stock) + Number(item.cantidad)
          const patch = { cantidad_stock: nuevoStock }
          if (producto.estado === 'vendido' && nuevoStock > 0) patch.estado = 'disponible'
          await db.from('productos').update(patch, { id: item.producto_id })
        }
      }))

      // 2. Revertir el ingreso, si se había cobrado algo
      if (venta.transaccion_id) {
        const [tx] = await db.from('transacciones').query(`id=eq.${venta.transaccion_id}`)
        if (tx) {
          await revertirEfecto(tx, { cuentas, tarjetas: [] })
          await db.from('transacciones').delete({ id: tx.id })
        }
      }

      // 3. Revertir el cargo en Cobros, si esta venta dejó saldo pendiente
      if (venta.cliente_id) {
        const [movimiento] = await db.from('clientes_movimientos').query(
          `venta_id=eq.${ventaId}&tipo=eq.cargo`
        )
        if (movimiento) {
          const [cliente] = await db.from('clientes').query(`id=eq.${venta.cliente_id}`)
          if (cliente) await revertirMovimientoCliente({ movimiento, cliente, cuentas })
        }
      }

      await db.from('ventas').update({ estado: 'cancelada', transaccion_id: null }, { id: ventaId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas', parejaId] })
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes', parejaId] })
      qc.invalidateQueries({ queryKey: ['clientes-adeudo', parejaId] })
    },
  })
}

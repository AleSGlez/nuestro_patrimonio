// src/modules/ventas/hooks/useVentas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { calcularCostoReal } from '@modules/inventario/hooks/useInventario'

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
// 3. Crea transacción de ingreso automáticamente
// 4. Actualiza saldo de la cuenta destino
export function useRegistrarVenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ items, clienteId, fecha, metodoCobro, cuentaId, nota, cuentas }) => {
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
        return db.from('productos').update({ cantidad_stock: nuevoStock }, { id: item.producto.id })
      }))

      // ── 4. Crear transacción de ingreso ──────────────────
      if (cuentaId) {
        const [tx] = await db.from('transacciones').insert({
          pareja_id: parejaId,
          tipo: 'ingreso',
          monto: totalVenta - comisionMonto,  // ingreso neto
          categoria: 'ventas',
          descripcion: `Venta${clienteId ? '' : ''} — ${items.length} carta${items.length > 1 ? 's' : ''}`,
          fecha, persona: 'ambos', contexto: 'negocio',
          metodo_pago: `cuenta:${cuentaId}`,
        })

        // Actualizar saldo de la cuenta
        const cuenta = cuentas.find((c) => c.id === cuentaId)
        if (cuenta) {
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) + (totalVenta - comisionMonto) },
            { id: cuentaId }
          )
        }

        // Vincular transacción a la venta
        await db.from('ventas').update({ transaccion_id: tx.id }, { id: venta.id })
      }

      return venta
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas', parejaId] })
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

export function useCancelarVenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('ventas').update({ estado: 'cancelada' }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ventas', parejaId] }),
  })
}

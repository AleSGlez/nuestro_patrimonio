// src/modules/compras/hooks/useCompras.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

export const ESTADOS_LOTE = [
  { value: 'pagado',           label: 'Pagado',               emoji: '💳', color: '#F59E0B' },
  { value: 'en_almacen_buyee', label: 'En almacén Buyee',     emoji: '🏭', color: '#7C6EFA' },
  { value: 'enviado_mexico',   label: 'Enviado a México',      emoji: '✈️', color: '#3B82F6' },
  { value: 'en_aduana',        label: 'En aduana',             emoji: '🛃', color: '#F97316' },
  { value: 'recibido',         label: 'Recibido',              emoji: '✅', color: '#10B981' },
]

export const METODOS_PAGO_COMPRA = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'paypal',        label: '🅿️ PayPal' },
  { value: 'tarjeta',       label: '💳 Tarjeta' },
  { value: 'otro',          label: '📦 Otro' },
]

export function useLotes() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['lotes', parejaId],
    queryFn: () => db.from('lotes_compra').query(
      `pareja_id=eq.${parejaId}&estado=neq.cancelado&order=fecha_compra.desc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useProductosLote(loteId) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['productos-lote', loteId],
    queryFn: () => db.from('productos').query(
      `pareja_id=eq.${parejaId}&lote_id=eq.${loteId}&order=created_at.asc`
    ),
    enabled: !!loteId,
    staleTime: 1000 * 60,
  })
}

export function useCrearLote() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ loteData, productos, cuentas, tarjetas = [] }) => {
      const {
        nombre, proveedor_id, fecha, monto_total_jpy, tipo_cambio,
        costo_envio, costo_aduana, notas, cuenta_id, tarjeta_id, metodo_pago,
        estado = 'pagado', fecha_estimada, tipo = 'buyee',
      } = loteData

      const montoMXN     = (Number(monto_total_jpy) * Number(tipo_cambio || 1))
      const costoEnvioN  = Number(costo_envio || 0)
      const costoAduanaN = Number(costo_aduana || 0)
      const totalMXN     = montoMXN + costoEnvioN + costoAduanaN
      const numProductos = productos.length || 1
      const costoProrr   = (costoEnvioN + costoAduanaN) / numProductos

      // 1. Crear el lote
      const [lote] = await db.from('lotes_compra').insert({
        pareja_id: parejaId,
        nombre: nombre || `Lote ${fecha}`,
        proveedor_id: proveedor_id || null,
        fecha,
        monto_total_jpy: Number(monto_total_jpy || 0),
        tipo_cambio: Number(tipo_cambio || 1),
        costo_envio: costoEnvioN,
        costo_aduana: costoAduanaN,
        notas: notas || null,
        cuenta_id: cuenta_id || null,
        metodo_pago: metodo_pago || null,
        estado,
        fecha_estimada: fecha_estimada || null,
        tipo,
      })

      // 2. Crear transacción de egreso + actualizar saldo/deuda
      if (totalMXN > 0) {
        const esTarjeta = metodo_pago === 'tarjeta_personal' && tarjeta_id

        const [tx] = await db.from('transacciones').insert({
          pareja_id: parejaId,
          tipo: 'gasto',
          monto: totalMXN,
          categoria: 'inventario',
          descripcion: `Compra: ${nombre || `Lote ${fecha}`}`,
          fecha,
          persona: 'ambos',
          contexto: 'negocio',
          metodo_pago: esTarjeta ? `tarjeta:${tarjeta_id}` : (cuenta_id ? `cuenta:${cuenta_id}` : metodo_pago),
          cuenta_id: esTarjeta ? null : (cuenta_id || null),
          tarjeta_id: esTarjeta ? tarjeta_id : null,
        })

        if (esTarjeta) {
          // Sumar a la deuda de la tarjeta
          const tarjeta = tarjetas.find((t) => t.id === tarjeta_id)
          if (tarjeta) {
            await db.from('tarjetas').update({
              saldo_total: Number(tarjeta.saldo_total) + totalMXN,
              gastos_periodo_actual: Number(tarjeta.gastos_periodo_actual) + totalMXN,
            }, { id: tarjeta_id })
          }
        } else if (cuenta_id) {
          // Descontar de la cuenta
          const cuenta = cuentas.find((c) => c.id === cuenta_id)
          if (cuenta) {
            await db.from('cuentas').update(
              { saldo: Number(cuenta.saldo) - totalMXN },
              { id: cuenta_id }
            )
          }
        }

        await db.from('lotes_compra').update({ transaccion_id: tx.id }, { id: lote.id })
      }

      // 3. Crear productos
      const estadoProducto = estado === 'recibido' ? 'disponible' : 'en_transito'
      if (productos.length > 0) {
        await Promise.all(productos.map((p) =>
          db.from('productos').insert({
            pareja_id: parejaId,
            lote_id: lote.id,
            nombre_jp: p.nombre_jp || null,
            nombre_en: p.nombre_en || null,
            serie: p.serie || null,
            numero_carta: p.numero_carta || null,
            idioma: p.idioma || 'JP',
            condicion: p.condicion || 'mint',
            cantidad_compra: Number(p.cantidad_compra || 1),
            cantidad_stock: Number(p.cantidad_compra || 1),
            precio_unitario_compra: Number(p.precio_unitario_compra || 0),
            precio_venta: p.precio_venta ? Number(p.precio_venta) : null,
            costo_extra_prorrateado: costoProrr,
            estado: estadoProducto,
            activo: true,
          })
        ))
      }

      return lote
    },
    onSuccess: () => {
      const pId = useAuthStore.getState().pareja?.id
      qc.invalidateQueries({ queryKey: ['lotes', pId] })
      qc.invalidateQueries({ queryKey: ['productos', pId] })
      qc.invalidateQueries({ queryKey: ['transacciones', pId] })
      qc.invalidateQueries({ queryKey: ['cuentas', pId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', pId] })
    },
  })
}

// Marcar una carta individual como disponible para venta
export function useMarcarDisponible() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ productoId, disponible }) => {
      await db.from('productos').update(
        { estado: disponible ? 'disponible' : 'en_transito' },
        { id: productoId }
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
      qc.invalidateQueries({ queryKey: ['lotes', parejaId] })
    },
  })
}

// Marcar TODAS las cartas de un lote como disponibles
export function useMarcarLoteDisponible() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async (loteId) => {
      const productos = await db.from('productos').query(
        `lote_id=eq.${loteId}&estado=eq.en_transito`
      )
      await Promise.all(
        productos.map((p) => db.from('productos').update({ estado: 'disponible' }, { id: p.id }))
      )
      await db.from('lotes_compra').update({ estado: 'recibido' }, { id: loteId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
      qc.invalidateQueries({ queryKey: ['lotes', parejaId] })
    },
  })
}

// Avanzar estado del lote → si llega a "recibido", marcar productos como disponibles
export function useAvanzarEstadoLote() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ loteId, nuevoEstado }) => {
      await db.from('lotes_compra').update({ estado: nuevoEstado }, { id: loteId })

      if (nuevoEstado === 'recibido') {
        const productos = await db.from('productos').query(
          `lote_id=eq.${loteId}&estado=eq.en_transito`
        )
        await Promise.all(productos.map((p) =>
          db.from('productos').update({ estado: 'disponible' }, { id: p.id })
        ))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lotes', parejaId] })
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
    },
  })
}

// Eliminar lote y sus productos
export function useEliminarLote() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async (loteId) => {
      // Primero eliminar productos del lote
      const prods = await db.from('productos').query(`lote_id=eq.${loteId}`)
      await Promise.all(prods.map((p) =>
        db.from('productos').update({ activo: false }, { id: p.id })
      ))
      // Luego marcar el lote como cancelado
      await db.from('lotes_compra').update({ estado: 'cancelado' }, { id: loteId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lotes', parejaId] })
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

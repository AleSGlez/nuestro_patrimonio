// src/modules/inventario/hooks/useInventario.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

const pid = (s) => s.pareja?.id

// ── Proveedores ───────────────────────────────────────────────
export function useProveedores() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['proveedores', parejaId],
    queryFn: () => db.from('proveedores').query({ pareja_id: `eq.${parejaId}`, activo: 'eq.true', order: 'nombre.asc' }),
    enabled: !!parejaId, staleTime: 1000 * 60 * 5,
  })
}

export function useCrearProveedor() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('proveedores').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores', parejaId] }),
  })
}

export function useActualizarProveedor() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('proveedores').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores', parejaId] }),
  })
}

// ── Lotes de compra ───────────────────────────────────────────
export function useLotes() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['lotes', parejaId],
    queryFn: () => db.from('lotes_compra').query({ pareja_id: `eq.${parejaId}`, order: 'fecha_compra.desc' }),
    enabled: !!parejaId, staleTime: 1000 * 60 * 2,
  })
}

export function useCrearLote() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('lotes_compra').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lotes', parejaId] }),
  })
}

export function useActualizarLote() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('lotes_compra').update(data, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lotes', parejaId] })
      qc.invalidateQueries({ queryKey: ['productos', parejaId] })
    },
  })
}

// ── Productos ─────────────────────────────────────────────────
export function useProductos(filtros = {}) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const { loteId, soloStock } = filtros
  return useQuery({
    queryKey: ['productos', parejaId, loteId, soloStock],
    queryFn: () => {
      if (loteId) {
        return db.from('productos').query({ pareja_id: `eq.${parejaId}`, lote_id: `eq.${loteId}`, activo: 'eq.true', order: 'created_at.asc' })
      }
      const params = { pareja_id: `eq.${parejaId}`, activo: 'eq.true', order: 'created_at.desc' }
      if (soloStock) params.cantidad_stock = 'gt.0'
      return db.from('productos').query(params)
    },
    enabled: !!parejaId, staleTime: 1000 * 60 * 2,
  })
}

export function useCrearProducto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('productos').insert({
      ...data, pareja_id: parejaId,
      cantidad_stock: data.cantidad_compra, // al crear, stock = cantidad comprada
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos', parejaId] }),
  })
}

export function useActualizarProducto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('productos').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos', parejaId] }),
  })
}

export function useEliminarProducto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('productos').update({ activo: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos', parejaId] }),
  })
}

// Vender unidades — descuenta del stock
export function useVenderProducto() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ producto, cantidad }) => {
      const nuevoStock = Math.max(0, Number(producto.cantidad_stock) - Number(cantidad))
      return db.from('productos').update({ cantidad_stock: nuevoStock }, { id: producto.id })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos', parejaId] }),
  })
}

// ── Cálculo de costo real por unidad ─────────────────────────
// costo_real = precio_unitario_compra + costo_extra_prorrateado
// costo_extra_prorrateado = (envio + aduanas + otros) / total_unidades_en_lote
export function calcularCostoReal(producto) {
  return Number(producto.precio_unitario_compra) + Number(producto.costo_extra_prorrateado || 0)
}

export function calcularMargen(producto) {
  if (!producto.precio_venta) return null
  const costo = calcularCostoReal(producto)
  const venta = Number(producto.precio_venta)
  return { margen: venta - costo, pct: costo > 0 ? ((venta - costo) / costo) * 100 : 0 }
}

// Prorratea costos del lote entre sus productos y actualiza cada uno
export function useProrratearLote() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ lote, productos }) => {
      const totalUnidades = productos.reduce((s, p) => s + Number(p.cantidad_compra), 0)
      if (totalUnidades === 0) return

      const costosExtra = Number(lote.costo_envio) + Number(lote.costo_aduanas) + Number(lote.costo_otros)
      const costoXUnidad = costosExtra / totalUnidades

      await Promise.all(productos.map((p) =>
        db.from('productos').update({
          costo_extra_prorrateado: costoXUnidad,
        }, { id: p.id })
      ))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos', parejaId] }),
  })
}

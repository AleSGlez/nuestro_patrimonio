// src/modules/transactions/hooks/useSubcategorias.js
// Subcategorías = sugeridas (en código) + las que agrega la pareja (tabla)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { SUBCATEGORIAS_GASTO, SUBCATEGORIAS_INGRESO } from '@lib/utils'

export function useSubcategorias() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['subcategorias', parejaId],
    // Si la migración v3_27 aún no corre, la tabla no existe: solo sugeridas
    queryFn: () => db.from('subcategorias')
      .query(`pareja_id=eq.${parejaId}&activa=eq.true&order=nombre.asc`)
      .catch(() => []),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCrearSubcategoria() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ categoria, nombre }) =>
      db.from('subcategorias').insert({ pareja_id: parejaId, categoria, nombre: nombre.trim() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subcategorias', parejaId] }),
  })
}

// Lista de nombres para una categoría, sin repetidos
export function subcategoriasDe(categoria, propias = [], tipo = 'gasto') {
  const sugeridas = (tipo === 'ingreso' ? SUBCATEGORIAS_INGRESO : SUBCATEGORIAS_GASTO)[categoria] || []
  const extra = propias.filter((s) => s.categoria === categoria).map((s) => s.nombre)
  return [...new Set([...sugeridas, ...extra])]
}

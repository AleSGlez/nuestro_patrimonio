// src/modules/accounts/hooks/useCuentas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

export function useCuentas() {
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useQuery({
    queryKey: ['cuentas', parejaId],
    queryFn: () => db.from('cuentas').query({
      pareja_id: `eq.${parejaId}`,
      activa: 'eq.true',
      order: 'orden.asc,created_at.asc',
    }),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCrearCuenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (data) => db.from('cuentas').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas', parejaId] }),
  })
}

export function useActualizarCuenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: ({ id, data }) => db.from('cuentas').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas', parejaId] }),
  })
}

export function useEliminarCuenta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (id) => db.from('cuentas').update({ activa: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas', parejaId] }),
  })
}

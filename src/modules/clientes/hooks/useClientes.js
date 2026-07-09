// src/modules/clientes/hooks/useClientes.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

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

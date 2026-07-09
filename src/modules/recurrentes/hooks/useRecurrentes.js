// src/modules/recurrentes/hooks/useRecurrentes.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { siguienteFecha } from '@modules/suscripciones/hooks/useSuscripciones'
import { format } from 'date-fns'

export function useRecurrentes() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['recurrentes', parejaId],
    queryFn: () => db.from('transacciones_recurrentes').query(
      `pareja_id=eq.${parejaId}&activa=eq.true&order=proxima_fecha.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCrearRecurrente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('transacciones_recurrentes').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes', parejaId] }),
  })
}

export function useActualizarRecurrente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('transacciones_recurrentes').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes', parejaId] }),
  })
}

export function useEliminarRecurrente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('transacciones_recurrentes').update({ activa: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes', parejaId] }),
  })
}

// Registra la transacción manualmente y avanza proxima_fecha
export function useRegistrarRecurrente() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ recurrente, cuentas }) => {
      // 1. Crear transacción
      await db.from('transacciones').insert({
        pareja_id: parejaId,
        tipo: recurrente.tipo,
        monto: recurrente.monto,
        categoria: recurrente.categoria || (recurrente.tipo === 'ingreso' ? 'otros_ingresos' : 'otros'),
        descripcion: recurrente.nombre,
        fecha: recurrente.proxima_fecha,
        persona: recurrente.persona,
        contexto: recurrente.contexto,
        cuenta_id: recurrente.cuenta_id || null,
        tarjeta_id: recurrente.tarjeta_id || null,
        metodo_pago: recurrente.cuenta_id ? `cuenta:${recurrente.cuenta_id}` : null,
      })

      // 2. Actualizar saldo si hay cuenta
      if (recurrente.cuenta_id) {
        const cuenta = cuentas.find((c) => c.id === recurrente.cuenta_id)
        if (cuenta) {
          const delta = recurrente.tipo === 'ingreso' ? 1 : -1
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) + delta * Number(recurrente.monto) },
            { id: cuenta.id }
          )
        }
      }

      // 3. Avanzar proxima_fecha
      const siguiente = siguienteFecha(recurrente.proxima_fecha, recurrente.frecuencia)
      await db.from('transacciones_recurrentes').update(
        { proxima_fecha: format(siguiente, 'yyyy-MM-dd') },
        { id: recurrente.id }
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrentes', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

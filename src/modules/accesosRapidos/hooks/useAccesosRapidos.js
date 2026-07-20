// src/modules/accesosRapidos/hooks/useAccesosRapidos.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { today } from '@lib/utils'

export function useAccesosRapidos() {
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useQuery({
    queryKey: ['accesos-rapidos', parejaId],
    queryFn: () => db.from('accesos_rapidos').query(
      `pareja_id=eq.${parejaId}&activo=eq.true&order=favorito.desc,orden.asc,created_at.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })
}

export function useCrearAccesoRapido() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async (data) => {
      const existentes = qc.getQueryData(['accesos-rapidos', parejaId]) || []
      const maxOrden = existentes.reduce((m, a) => Math.max(m, a.orden ?? 0), 0)
      const [creado] = await db.from('accesos_rapidos').insert({
        ...data, pareja_id: parejaId, orden: maxOrden + 1,
      })
      return creado
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesos-rapidos', parejaId] }),
  })
}

export function useActualizarAccesoRapido() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: ({ id, data }) => db.from('accesos_rapidos').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesos-rapidos', parejaId] }),
  })
}

export function useEliminarAccesoRapido() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (id) => db.from('accesos_rapidos').update({ activo: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesos-rapidos', parejaId] }),
  })
}

export function useDuplicarAccesoRapido() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async (acceso) => {
      const { id, created_at, ultimo_uso, ...resto } = acceso
      const existentes = qc.getQueryData(['accesos-rapidos', parejaId]) || []
      const maxOrden = existentes.reduce((m, a) => Math.max(m, a.orden ?? 0), 0)
      return db.from('accesos_rapidos').insert({
        ...resto, nombre: `${acceso.nombre} (copia)`, pareja_id: parejaId, orden: maxOrden + 1,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesos-rapidos', parejaId] }),
  })
}

// Recibe el array ya reordenado por el usuario y persiste el nuevo `orden` de cada uno
export function useReordenarAccesosRapidos() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (accesosOrdenados) => Promise.all(
      accesosOrdenados.map((a, i) => db.from('accesos_rapidos').update({ orden: i }, { id: a.id }))
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesos-rapidos', parejaId] }),
  })
}

export function useMarcarUsoAccesoRapido() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: (id) => db.from('accesos_rapidos').update({ ultimo_uso: today() }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accesos-rapidos', parejaId] }),
  })
}

// ── Saldos frescos de cuentas/tarjetas, leídos directo de la BD ──
// Igual que useActualizarTransaccion en useTransacciones.js: el `cuentas`/`tarjetas`
// que devuelven los hooks useCuentas()/useTarjetas() puede estar un paso atrás justo
// después de crear una transacción (la invalidación es async). Para encadenar
// crear → deshacer con el saldo correcto, se relee directo de la BD en cada paso.
export async function fetchSaldosFrescos(parejaId) {
  const [cuentas, tarjetas] = await Promise.all([
    db.from('cuentas').query({ pareja_id: `eq.${parejaId}`, activa: 'eq.true' }),
    db.from('tarjetas').query({ pareja_id: `eq.${parejaId}`, activa: 'eq.true' }),
  ])
  return { cuentas, tarjetas }
}

// ── Estadísticas del mes, derivadas de la lista de transacciones ya cargada ──
// (no se guardan contadores — se calculan de la fuente de verdad, igual que
// el roll-over de presupuestos en usePresupuestos.js)
export function estadisticasAccesoRapido(accesoId, transaccionesMes = []) {
  const delMes = transaccionesMes.filter((t) => t.acceso_rapido_id === accesoId)
  return {
    usadoEsteMes: delMes.length,
    totalEsteMes: delMes.reduce((s, t) => s + Number(t.monto), 0),
  }
}

// src/modules/metas/hooks/useMetas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { differenceInDays, differenceInMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function useMetas() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['metas', parejaId],
    queryFn: () => db.from('metas').query(
      `pareja_id=eq.${parejaId}&activa=eq.true&order=created_at.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAportaciones(metaId) {
  return useQuery({
    queryKey: ['metas-aportaciones', metaId],
    queryFn: () => db.from('metas_aportaciones').query(
      `meta_id=eq.${metaId}&order=fecha.desc`
    ),
    enabled: !!metaId,
    staleTime: 1000 * 60,
  })
}

export function useCrearMeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('metas').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas', parejaId] }),
  })
}

export function useActualizarMeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('metas').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas', parejaId] }),
  })
}

export function useEliminarMeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('metas').update({ activa: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas', parejaId] }),
  })
}

// Registra una aportación a la meta:
// 1. Descuenta de la cuenta si se especifica
// 2. Suma al monto_actual de la meta
// 3. Marca como completada si llega al objetivo
export function useAportar() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ meta, monto, fecha, nota, cuentaId, cuentas }) => {
      const montoNum = Number(monto)

      // 1. Registrar aportación
      await db.from('metas_aportaciones').insert({
        meta_id: meta.id,
        pareja_id: parejaId,
        monto: montoNum,
        fecha, nota: nota || null,
        cuenta_id: cuentaId || null,
      })

      // 2. Actualizar monto_actual de la meta
      const nuevoMonto = Number(meta.monto_actual) + montoNum
      const completada = nuevoMonto >= Number(meta.monto_objetivo)
      await db.from('metas').update({
        monto_actual: nuevoMonto,
        completada,
      }, { id: meta.id })

      // 3. Descontar de la cuenta si aplica
      if (cuentaId) {
        const cuenta = cuentas.find((c) => c.id === cuentaId)
        if (cuenta) {
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) - montoNum },
            { id: cuentaId }
          )
          // Crear transacción de gasto para registro
          await db.from('transacciones').insert({
            pareja_id: parejaId,
            tipo: 'gasto',
            monto: montoNum,
            categoria: 'ahorro',
            descripcion: `Aportación: ${meta.nombre}`,
            fecha, persona: meta.persona,
            contexto: 'personal',
            metodo_pago: `cuenta:${cuentaId}`,
          })
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['metas', parejaId] })
      qc.invalidateQueries({ queryKey: ['metas-aportaciones', vars.meta.id] })
      if (vars.cuentaId) {
        qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
        qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      }
    },
  })
}

// ── Cálculos de la meta ───────────────────────────────────────
export function calcularMeta(meta) {
  const objetivo   = Number(meta.monto_objetivo)
  const actual     = Number(meta.monto_actual)
  const faltante   = Math.max(0, objetivo - actual)
  const pct        = objetivo > 0 ? Math.min(100, Math.round((actual / objetivo) * 100)) : 0

  let diasRestantes = null
  let mesesRestantes = null
  let aportacionMensual = null
  let aportacionQuincenal = null

  if (meta.fecha_objetivo && faltante > 0) {
    const hoy = new Date()
    const fechaObj = parseISO(meta.fecha_objetivo)
    diasRestantes  = differenceInDays(fechaObj, hoy)
    mesesRestantes = Math.max(1, differenceInMonths(fechaObj, hoy))
    aportacionMensual   = faltante / mesesRestantes
    aportacionQuincenal = faltante / (mesesRestantes * 2)
  }

  return { objetivo, actual, faltante, pct, diasRestantes, mesesRestantes, aportacionMensual, aportacionQuincenal }
}

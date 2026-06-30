// src/modules/accounts/hooks/useApartados.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

export function useApartados(cuentaId) {
  return useQuery({
    queryKey: ['apartados', cuentaId],
    queryFn: () => db.from('cuenta_apartados').query({
      cuenta_id: `eq.${cuentaId}`,
      activo: 'eq.true',
      order: 'created_at.asc',
    }),
    enabled: !!cuentaId,
    staleTime: 1000 * 60 * 2,
  })
}

// Todos los apartados de la pareja (para el resumen del dashboard)
export function useTodosLosApartados() {
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useQuery({
    queryKey: ['apartados-todos', parejaId],
    queryFn: () => db.from('cuenta_apartados').query({
      pareja_id: `eq.${parejaId}`,
      activo: 'eq.true',
      order: 'created_at.asc',
    }),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

// ── Crear apartado ────────────────────────────────────────────
// El saldo DISPONIBLE de la cuenta se reduce por el monto del apartado.
// El dinero "se mueve" de disponible a apartado, no se duplica.
export function useCrearApartado() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ cuentaSaldoActual, ...data }) => {
      const monto = Number(data.monto) || 0

      const [apartado] = await db.from('cuenta_apartados').insert({ ...data, pareja_id: parejaId })

      const nuevoSaldo = Number(cuentaSaldoActual) - monto
      await db.from('cuentas').update({ saldo: nuevoSaldo }, { id: data.cuenta_id })

      return apartado
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['apartados', vars.cuenta_id] })
      qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

// ── Actualizar apartado ──────────────────────────────────────
// Si cambia el monto, ajusta la diferencia contra el saldo disponible.
// Ej: apartado pasa de $100 a $150 → disponible baja $50 más.
// Ej: apartado pasa de $100 a $60  → disponible sube $40.
export function useActualizarApartado() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ id, cuentaId, montoAnterior, cuentaSaldoActual, data }) => {
      const montoNuevo = Number(data.monto) || 0
      const diferencia = montoNuevo - Number(montoAnterior) // positivo = se aparta más, negativo = se libera

      const [actualizado] = await db.from('cuenta_apartados').update(data, { id })

      if (diferencia !== 0) {
        const nuevoSaldo = Number(cuentaSaldoActual) - diferencia
        await db.from('cuentas').update({ saldo: nuevoSaldo }, { id: cuentaId })
      }

      return actualizado
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['apartados', vars.cuentaId] })
      qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

// ── Eliminar apartado ─────────────────────────────────────────
// El monto regresa completo al saldo disponible de la cuenta.
export function useEliminarApartado() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ id, cuentaId, monto, cuentaSaldoActual }) => {
      await db.from('cuenta_apartados').update({ activo: false }, { id })

      const nuevoSaldo = Number(cuentaSaldoActual) + Number(monto)
      await db.from('cuentas').update({ saldo: nuevoSaldo }, { id: cuentaId })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['apartados', vars.cuentaId] })
      qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

// ── Cálculo de rendimiento ───────────────────────────────────
// simple:    monto * (tasa/100) * (dias/365)
// compuesto: monto * ((1 + tasa/100)^(dias/365) - 1)
export function calcularRendimiento(apartado) {
  const monto = Number(apartado.monto) || 0
  const tasa  = Number(apartado.tasa_anual) || 0
  if (monto === 0 || tasa === 0) return 0

  const inicio = new Date(apartado.fecha_inicio + 'T00:00:00')
  const hoy = new Date()
  const dias = Math.max(0, Math.floor((hoy - inicio) / 86400000))
  const años = dias / 365

  if (apartado.tipo_interes === 'compuesto') {
    return monto * (Math.pow(1 + tasa / 100, años) - 1)
  }
  return monto * (tasa / 100) * años
}

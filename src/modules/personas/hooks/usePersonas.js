// src/modules/personas/hooks/usePersonas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

const KEY = (id) => ['personas', id]
const KEY_MOV = (personaId) => ['personas-movimientos', personaId]

export function usePersonas() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: KEY(parejaId),
    queryFn: () => db.from('personas_externas').query({
      pareja_id: `eq.${parejaId}`,
      order: 'nombre.asc',
    }),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function usePersonaMovimientos(personaId) {
  return useQuery({
    queryKey: KEY_MOV(personaId),
    queryFn: () => db.from('personas_movimientos').query({
      persona_id: `eq.${personaId}`,
      order: 'fecha.desc,created_at.desc',
    }),
    enabled: !!personaId,
    staleTime: 1000 * 60,
  })
}

// ── CRUD Personas ────────────────────────────────────────────
export function useCrearPersona() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('personas_externas').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(parejaId) }),
  })
}

export function useActualizarPersona() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('personas_externas').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(parejaId) }),
  })
}

export function useEliminarPersona() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('personas_externas').delete({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(parejaId) }),
  })
}

// ── Movimientos (prestamos, cobros, pagos) ────────────────────
// Cada movimiento actualiza el saldo de la persona automáticamente.
//
// Tipos y efecto en saldo:
//   prestamo      → saldo SUBE   (yo le presté, me debe más)
//   cobro         → saldo SUBE   (me debe por algo)
//   pago_recibido → saldo BAJA   (me pagó, me debe menos)
//   pago_enviado  → saldo BAJA   (le pagué, le debo menos)

const DELTA = {
  prestamo:      +1,
  cobro:         +1,
  pago_recibido: -1,
  pago_enviado:  -1,
}

export function useRegistrarMovimiento() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ persona, cuentas = [], ...data }) => {
      const delta = DELTA[data.tipo] * Number(data.monto)

      await db.from('personas_movimientos').insert({ ...data, pareja_id: parejaId })

      const nuevoSaldo = Number(persona.saldo) + delta
      await db.from('personas_externas').update({ saldo: nuevoSaldo }, { id: persona.id })

      // Si viene con cuenta, actualiza su saldo también
      if (data.cuenta_id) {
        const cuenta = cuentas.find((c) => c.id === data.cuenta_id)
        if (cuenta) {
          // prestamo/pago_enviado → sale dinero de la cuenta
          // pago_recibido → entra dinero a la cuenta
          const efectoCuenta = (data.tipo === 'pago_recibido') ? +1 : -1
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) + efectoCuenta * Number(data.monto) },
            { id: cuenta.id }
          )
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY(parejaId) })
      qc.invalidateQueries({ queryKey: KEY_MOV(vars.persona.id) })
      if (vars.cuenta_id) qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

export function useEliminarMovimiento() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ movimiento, persona, cuentas = [] }) => {
      // Revertir el efecto en el saldo de la persona
      const delta = DELTA[movimiento.tipo] * Number(movimiento.monto)
      const nuevoSaldo = Number(persona.saldo) - delta
      await db.from('personas_externas').update({ saldo: nuevoSaldo }, { id: persona.id })

      // Revertir el efecto en la cuenta si aplica
      if (movimiento.cuenta_id) {
        const cuenta = cuentas.find((c) => c.id === movimiento.cuenta_id)
        if (cuenta) {
          const efectoCuenta = (movimiento.tipo === 'pago_recibido') ? -1 : +1
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) + efectoCuenta * Number(movimiento.monto) },
            { id: cuenta.id }
          )
        }
      }

      await db.from('personas_movimientos').delete({ id: movimiento.id })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY(parejaId) })
      qc.invalidateQueries({ queryKey: KEY_MOV(vars.persona.id) })
      if (vars.movimiento.cuenta_id) qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
    },
  })
}

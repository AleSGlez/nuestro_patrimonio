// src/modules/accounts/hooks/useTransferencias.js
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

// Transferencia entre cuentas propias
export function useTransferirEntreCuentas() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ origenId, destinoId, origenSaldo, destinoSaldo, monto, descripcion, fecha }) => {
      const m = Number(monto)

      await db.from('transferencias').insert({
        pareja_id: parejaId,
        tipo: 'entre_cuentas',
        monto: m,
        origen_cuenta_id: origenId,
        destino_cuenta_id: destinoId,
        descripcion: descripcion || null,
        fecha,
      })

      await db.from('cuentas').update({ saldo: Number(origenSaldo) - m },  { id: origenId })
      await db.from('cuentas').update({ saldo: Number(destinoSaldo) + m }, { id: destinoId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas', parejaId] }),
  })
}

// Pago de tarjeta de crédito desde una cuenta
export function usePagarTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ cuentaId, cuentaSaldo, tarjetaId, tarjetaSaldoTotal, tarjetaSaldoAnterior, monto, descripcion, fecha }) => {
      const m = Number(monto)

      await db.from('transferencias').insert({
        pareja_id: parejaId,
        tipo: 'pago_tarjeta',
        monto: m,
        origen_cuenta_id: cuentaId,
        destino_tarjeta_id: tarjetaId,
        descripcion: descripcion || null,
        fecha,
      })

      await db.from('cuentas').update({ saldo: Number(cuentaSaldo) - m }, { id: cuentaId })

      // El pago reduce primero el saldo del período anterior (lo exigible)
      const nuevoAnterior = Math.max(0, Number(tarjetaSaldoAnterior) - m)
      const nuevoTotal     = Math.max(0, Number(tarjetaSaldoTotal) - m)

      await db.from('tarjetas').update({
        saldo_total: nuevoTotal,
        saldo_periodo_anterior: nuevoAnterior,
        pago_sin_intereses: nuevoAnterior,
      }, { id: tarjetaId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
    },
  })
}

// Transferencia personal → negocio o negocio → personal
export function useTransferirPersonalNegocio() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ tipo, origenId, destinoId, origenSaldo, destinoSaldo, monto, descripcion, fecha }) => {
      const m = Number(monto)

      await db.from('transferencias').insert({
        pareja_id: parejaId,
        tipo, // 'personal_a_negocio' | 'negocio_a_personal'
        monto: m,
        origen_cuenta_id: origenId,
        destino_cuenta_id: destinoId,
        descripcion: descripcion || null,
        fecha,
      })

      await db.from('cuentas').update({ saldo: Number(origenSaldo) - m },  { id: origenId })
      await db.from('cuentas').update({ saldo: Number(destinoSaldo) + m }, { id: destinoId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas', parejaId] }),
  })
}

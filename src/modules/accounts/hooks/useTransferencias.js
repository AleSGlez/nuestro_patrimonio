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

// Pago de tarjeta de crédito desde una cuenta o desde un apartado.
// Si viene apartadoId: el dinero sale SOLO del apartado — el saldo de la cuenta
// no se toca, porque al crear el apartado ese monto ya se restó del disponible
// (useCrearApartado). Descontar ambos duplicaría la salida de dinero.
export function usePagarTarjeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ cuentaId, cuentaSaldo, tarjetaId, tarjetaSaldoTotal, monto, descripcion, fecha, apartadoId, apartadoMonto }) => {
      const m = Number(monto)

      await db.from('transferencias').insert({
        pareja_id: parejaId,
        tipo: 'pago_tarjeta',
        monto: m,
        origen_cuenta_id: cuentaId,
        origen_apartado_id: apartadoId || null,
        destino_tarjeta_id: tarjetaId,
        descripcion: descripcion || null,
        fecha,
      })

      if (apartadoId) {
        await db.from('cuenta_apartados').update(
          { monto: Math.max(0, Number(apartadoMonto) - m) }, { id: apartadoId }
        )
      } else {
        await db.from('cuentas').update({ saldo: Number(cuentaSaldo) - m }, { id: cuentaId })
      }

      // El pago reduce la deuda total. pago_sin_intereses es lo que el usuario
      // definió manualmente — NO se toca aquí (regla de negocio §11).
      await db.from('tarjetas').update({
        saldo_total: Math.max(0, Number(tarjetaSaldoTotal) - m),
      }, { id: tarjetaId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
      qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
      qc.invalidateQueries({ queryKey: ['apartados'] })
    },
  })
}

// Disposición de efectivo: retiras dinero de tu tarjeta de crédito
// hacia una cuenta. La deuda de la tarjeta sube por (monto + comisión).
// No hay cuenta "origen" — el dinero nace de la línea de crédito.
export function useDisposicionEfectivo() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ tarjetaId, tarjetaSaldoTotal, cuentaId, cuentaSaldo, monto, comision, descripcion, fecha }) => {
      const m = Number(monto)
      const com = Number(comision) || 0
      const totalDeuda = m + com

      await db.from('transferencias').insert({
        pareja_id: parejaId,
        tipo: 'disposicion_efectivo',
        monto: m,
        comision: com,
        origen_cuenta_id: null,
        destino_cuenta_id: cuentaId,
        destino_tarjeta_id: tarjetaId,
        descripcion: descripcion || null,
        fecha,
      })

      // El dinero retirado entra a la cuenta destino
      await db.from('cuentas').update({ saldo: Number(cuentaSaldo) + m }, { id: cuentaId })

      // La deuda de la tarjeta sube por el monto retirado MÁS la comisión
      await db.from('tarjetas').update({
        saldo_total: Number(tarjetaSaldoTotal) + totalDeuda,
      }, { id: tarjetaId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
    },
  })
}

// Transferencia personal → negocio o negocio → personal.
// Si viene apartadoId (negocio→personal desde apartado): el dinero sale SOLO
// del apartado — la cuenta origen no se toca (mismo criterio que usePagarTarjeta).
export function useTransferirPersonalNegocio() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ tipo, origenId, destinoId, origenSaldo, destinoSaldo, monto, descripcion, fecha, apartadoId, apartadoMonto }) => {
      const m = Number(monto)

      await db.from('transferencias').insert({
        pareja_id: parejaId,
        tipo, // 'personal_a_negocio' | 'negocio_a_personal'
        monto: m,
        origen_cuenta_id: origenId,
        origen_apartado_id: apartadoId || null,
        destino_cuenta_id: destinoId,
        descripcion: descripcion || null,
        fecha,
      })

      if (apartadoId) {
        await db.from('cuenta_apartados').update(
          { monto: Math.max(0, Number(apartadoMonto) - m) }, { id: apartadoId }
        )
      } else {
        await db.from('cuentas').update({ saldo: Number(origenSaldo) - m }, { id: origenId })
      }
      await db.from('cuentas').update({ saldo: Number(destinoSaldo) + m }, { id: destinoId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
      qc.invalidateQueries({ queryKey: ['apartados'] })
    },
  })
}

// Devuelve el monto de una transferencia a su origen: al apartado si salió de
// un apartado (origen_apartado_id), o a la cuenta origen si no.
async function devolverAOrigen(t, cuentas, m) {
  if (t.origen_apartado_id) {
    const [apartado] = await db.from('cuenta_apartados').query(`id=eq.${t.origen_apartado_id}`)
    if (apartado) {
      await db.from('cuenta_apartados').update(
        { monto: Number(apartado.monto) + m }, { id: apartado.id }
      )
    }
    return
  }
  const origen = cuentas.find((c) => c.id === t.origen_cuenta_id)
  if (origen) await db.from('cuentas').update({ saldo: Number(origen.saldo) + m }, { id: origen.id })
}

// Eliminar una transferencia — revierte el efecto en saldos según su tipo
export function useEliminarTransferencia() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)

  return useMutation({
    mutationFn: async ({ transferencia, cuentas, tarjetas }) => {
      const t = transferencia
      const m = Number(t.monto)

      if (t.tipo === 'entre_cuentas' || t.tipo === 'personal_a_negocio' || t.tipo === 'negocio_a_personal') {
        const destino = cuentas.find((c) => c.id === t.destino_cuenta_id)
        await devolverAOrigen(t, cuentas, m)
        if (destino) await db.from('cuentas').update({ saldo: Number(destino.saldo) - m }, { id: destino.id })
      }

      if (t.tipo === 'pago_tarjeta') {
        const tarjeta = tarjetas.find((tj) => tj.id === t.destino_tarjeta_id)
        await devolverAOrigen(t, cuentas, m)
        // pago_sin_intereses NO se toca — es manual (regla de negocio §11), igual
        // que en usePagarTarjeta al aplicar el pago. Antes se sumaba aquí y no allá,
        // una asimetría que dejaba ese campo mal cada vez que se revertía un pago.
        if (tarjeta) {
          await db.from('tarjetas').update({
            saldo_total: Number(tarjeta.saldo_total) + m,
          }, { id: tarjeta.id })
        }
      }

      if (t.tipo === 'disposicion_efectivo') {
        const com = Number(t.comision || 0)
        const totalDeuda = m + com
        const cuenta  = cuentas.find((c) => c.id === t.destino_cuenta_id)
        const tarjeta = tarjetas.find((tj) => tj.id === t.destino_tarjeta_id)
        if (cuenta)  await db.from('cuentas').update({ saldo: Math.max(0, Number(cuenta.saldo) - m) }, { id: cuenta.id })
        if (tarjeta) {
          await db.from('tarjetas').update({
            saldo_total: Math.max(0, Number(tarjeta.saldo_total) - totalDeuda),
          }, { id: tarjeta.id })
        }
      }

      await db.from('transferencias').delete({ id: t.id })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias-list', parejaId] })
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['tarjetas', parejaId] })
      qc.invalidateQueries({ queryKey: ['apartados-todos', parejaId] })
      qc.invalidateQueries({ queryKey: ['apartados'] })
    },
  })
}

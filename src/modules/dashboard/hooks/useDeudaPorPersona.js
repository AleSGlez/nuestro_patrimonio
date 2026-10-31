// src/modules/dashboard/hooks/useDeudaPorPersona.js
// Reparte la deuda real de cada tarjeta (saldo_total) entre p1 / p2 / ambos / negocio
// según quién hizo los gastos con esa tarjeta en los últimos 12 meses.
// p1 + p2 + ambos + negocio = deuda total de las tarjetas.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { parsearMetodoPago } from '@modules/transactions/hooks/useTransacciones'

function useGastosConTarjeta() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const desde = format(subMonths(new Date(), 12), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['gastos-con-tarjeta', parejaId, desde],
    queryFn: () => db.from('transacciones').query(
      `pareja_id=eq.${parejaId}&tipo=eq.gasto&fecha=gte.${desde}` +
      `&or=(tarjeta_id.not.is.null,metodo_pago.like.tarjeta*)` +
      `&select=persona,contexto,monto,metodo_pago,cuenta_id,tarjeta_id&limit=5000`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDeudaPorPersona(tarjetas) {
  const { data: gastos = [] } = useGastosConTarjeta()

  return useMemo(() => {
    const res = { p1: 0, p2: 0, ambos: 0, negocio: 0 }
    const porTarjeta = {}
    gastos.forEach((t) => {
      const m = parsearMetodoPago(t.metodo_pago, t.cuenta_id, t.tarjeta_id)
      if (m?.tipo !== 'tarjeta') return
      const g = (porTarjeta[m.id] = porTarjeta[m.id] || { p1: 0, p2: 0, ambos: 0, negocio: 0 })
      // Los cargos del negocio son del negocio, aunque los haya hecho Ale o Ruli
      const k = t.contexto === 'negocio' ? 'negocio' : t.persona === 'p1' || t.persona === 'p2' ? t.persona : 'ambos'
      g[k] += Number(t.monto)
    })
    tarjetas.forEach((tarjeta) => {
      const saldo = Number(tarjeta.saldo_total) || 0
      if (saldo <= 0) return
      const g = porTarjeta[tarjeta.id]
      const total = g ? g.p1 + g.p2 + g.ambos + g.negocio : 0
      if (total <= 0) {
        // Sin gastos registrados: se le asigna a quien es dueño de la tarjeta
        res[tarjeta.persona === 'p1' || tarjeta.persona === 'p2' ? tarjeta.persona : 'ambos'] += saldo
        return
      }
      Object.keys(res).forEach((k) => { res[k] += (g[k] / total) * saldo })
    })
    return res
  }, [gastos, tarjetas])
}

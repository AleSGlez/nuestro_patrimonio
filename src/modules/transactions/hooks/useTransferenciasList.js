// src/modules/transactions/hooks/useTransferenciasList.js
import { useQuery } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { rangoDeMes } from './useTransacciones'

// Lista de transferencias con filtro opcional de `mes` o rango `desde`/`hasta`
// — se muestran mezcladas con los movimientos en Movimientos.
export function useTransferenciasList(filtros = {}) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const { mes } = filtros
  const { desde, hasta } = mes ? rangoDeMes(mes) : filtros

  return useQuery({
    queryKey: ['transferencias-list', parejaId, mes, desde, hasta],
    queryFn: () => {
      if (desde || hasta) {
        return db.from('transferencias').query(
          `pareja_id=eq.${parejaId}` +
          (desde ? `&fecha=gte.${desde}` : '') +
          (hasta ? `&fecha=lte.${hasta}` : '') +
          `&order=fecha.desc,created_at.desc&limit=500`
        )
      }
      return db.from('transferencias').query({
        pareja_id: `eq.${parejaId}`,
        order: 'fecha.desc,created_at.desc',
        limit: 500,
      })
    },
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })
}

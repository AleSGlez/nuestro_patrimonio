// src/modules/transactions/hooks/useTransferenciasList.js
import { useQuery } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

// Lista de transferencias con filtro opcional de mes — para la pestaña
// "Transferencias" dentro de Movimientos.
export function useTransferenciasList(filtros = {}) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const { mes } = filtros

  return useQuery({
    queryKey: ['transferencias-list', parejaId, mes],
    queryFn: () => {
      if (mes) {
        const [año, mesNum] = mes.split('-').map(Number)
        const inicio = `${mes}-01`
        const ultimoDia = new Date(año, mesNum, 0).getDate()
        const fin = `${mes}-${String(ultimoDia).padStart(2, '0')}`
        return db.from('transferencias').query(
          `pareja_id=eq.${parejaId}&fecha=gte.${inicio}&fecha=lte.${fin}&order=fecha.desc,created_at.desc&limit=500`
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

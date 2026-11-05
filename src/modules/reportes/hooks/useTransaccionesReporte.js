// src/modules/reportes/hooks/useTransaccionesReporte.js
import { useQuery } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

// Supabase corta cada respuesta en 1000 filas, así que se pide por páginas
const PAGINA = 1000

// Todas las transacciones desde `desde` ('YYYY-MM-DD'). Los reportes comparan
// varios meses y no pueden quedarse con solo los últimos 500 movimientos.
export function useTransaccionesReporte(desde) {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['transacciones', parejaId, 'reporte', desde],
    queryFn: async () => {
      const todas = []
      for (let offset = 0; ; offset += PAGINA) {
        const pagina = await db.from('transacciones').query(
          `pareja_id=eq.${parejaId}&fecha=gte.${desde}` +
          `&order=fecha.desc,created_at.desc&limit=${PAGINA}&offset=${offset}`
        )
        todas.push(...pagina)
        if (pagina.length < PAGINA) return todas
      }
    },
    enabled: !!parejaId && !!desde,
    staleTime: 1000 * 60,
  })
}

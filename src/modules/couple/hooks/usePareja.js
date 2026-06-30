// src/modules/couple/hooks/usePareja.js
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

// Carga la pareja del usuario actual (por user1_id o user2_id)
export function usePareja() {
  const user = useAuthStore((s) => s.user)
  const setPareja = useAuthStore((s) => s.setPareja)

  const query = useQuery({
    queryKey: ['pareja', user?.id],
    queryFn: async () => {
      const result = await db.from('parejas').query(
        `or=(user1_id.eq.${user.id},user2_id.eq.${user.id})&limit=1`
      )
      const pareja = Array.isArray(result) ? result[0] : null
      setPareja(pareja)
      return pareja
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })

  return query
}

// Carga los perfiles de ambos integrantes
export function usePerfiles(parejaId) {
  return useQuery({
    queryKey: ['perfiles', parejaId],
    queryFn: () => db.from('perfiles').query({ pareja_id: `eq.${parejaId}`, order: 'persona.asc' }),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 5,
  })
}

// Invalida el cache de pareja (usar después de mutaciones)
export function useInvalidatePareja() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['pareja'] })
    qc.invalidateQueries({ queryKey: ['perfiles'] })
  }
}

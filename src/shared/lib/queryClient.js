// src/shared/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        1000 * 60 * 5,   // 5 min default
      gcTime:           1000 * 60 * 10,  // 10 min cache
      retry:            1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (err) => console.error('[Mutation error]', err),
    },
  },
})

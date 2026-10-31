// src/shared/hooks/useEsEscritorio.js
// true en pantallas ≥1024px (breakpoint `lg` de Tailwind)
import { useState, useEffect } from 'react'

const QUERY = '(min-width: 1024px)'

export function useEsEscritorio() {
  const [es, setEs] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const cambio = () => setEs(mq.matches)
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [])
  return es
}

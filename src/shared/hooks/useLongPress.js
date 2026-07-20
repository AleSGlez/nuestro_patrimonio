// src/shared/hooks/useLongPress.js
import { useRef, useCallback } from 'react'

const THRESHOLD_MS = 480
const MOVE_TOLERANCE = 10

// Detecta long-press por touch/mouse sin disparar el tap normal.
// onLongPress: () => void, onTap: () => void
export function useLongPress(onLongPress, onTap) {
  const timer = useRef(null)
  const start = useRef({ x: 0, y: 0 })
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const handleStart = useCallback((e) => {
    const point = e.touches ? e.touches[0] : e
    start.current = { x: point.clientX, y: point.clientY }
    fired.current = false
    clear()
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress?.()
    }, THRESHOLD_MS)
  }, [onLongPress, clear])

  const handleMove = useCallback((e) => {
    const point = e.touches ? e.touches[0] : e
    const dx = Math.abs(point.clientX - start.current.x)
    const dy = Math.abs(point.clientY - start.current.y)
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clear()
  }, [clear])

  const handleEnd = useCallback(() => {
    clear()
    if (!fired.current) onTap?.()
  }, [clear, onTap])

  const handleCancel = useCallback(() => {
    clear()
    fired.current = true // evita disparar el tap si se cancela (ej: sale de la pantalla)
  }, [clear])

  return {
    onMouseDown:  handleStart,
    onMouseMove:  handleMove,
    onMouseUp:    handleEnd,
    onMouseLeave: handleCancel,
    onTouchStart: handleStart,
    onTouchMove:  handleMove,
    onTouchEnd:   handleEnd,
    onTouchCancel: handleCancel,
  }
}

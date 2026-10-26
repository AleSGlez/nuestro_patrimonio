// src/modules/notificaciones/hooks/useWebPush.js
import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// El navegador pide la llave VAPID como Uint8Array, no como string —
// conversión estándar de base64url a bytes (la misma en cualquier guía de Web Push).
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

// iOS Safari solo soporta Web Push desde iOS 16.4+ y SOLO cuando la app está
// agregada a la pantalla de inicio (modo standalone) — en Safari normal
// PushManager no existe aunque el navegador sea reciente.
export function soportaPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function esStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// Estado de la suscripción push EN ESTE dispositivo/navegador. No es dato de
// servidor (por eso no usa TanStack Query) — es permiso + suscripción local
// del browser, que puede diferir entre el iPhone y la compu de la misma pareja.
export function usePushState() {
  const [cargando, setCargando] = useState(true)
  const [permiso, setPermiso]   = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const [activo, setActivo]     = useState(false)

  const revisar = useCallback(async () => {
    if (!soportaPush()) { setCargando(false); return }
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setActivo(!!sub)
      setPermiso(Notification.permission)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { revisar() }, [revisar])

  return { cargando, permiso, activo, soportado: soportaPush(), revisar }
}

export function useActivarPush() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const userId   = useAuthStore((s) => s.user?.id)
  const [loading, setLoading] = useState(false)

  const activar = useCallback(async () => {
    if (!soportaPush()) throw new Error('Este navegador no soporta notificaciones push')
    if (!VAPID_PUBLIC_KEY) throw new Error('Falta configurar la llave VAPID (VITE_VAPID_PUBLIC_KEY)')

    setLoading(true)
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') throw new Error('Permiso de notificaciones denegado')

      const registration = await navigator.serviceWorker.ready
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const data = {
        pareja_id: parejaId,
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: bufferToBase64(sub.getKey('p256dh')),
        auth: bufferToBase64(sub.getKey('auth')),
        user_agent: navigator.userAgent,
        activa: true,
      }

      try {
        await db.from('push_subscriptions').insert(data)
      } catch (e) {
        // Mismo endpoint ya registrado (otro login en este dispositivo) —
        // solo reactivarlo y refrescar sus llaves.
        if (String(e.message).toLowerCase().includes('duplicate')) {
          await db.from('push_subscriptions').update(data, { endpoint: sub.endpoint })
        } else {
          throw e
        }
      }

      return sub
    } finally {
      setLoading(false)
    }
  }, [parejaId, userId])

  return { activar, loading }
}

export function useDesactivarPush() {
  const [loading, setLoading] = useState(false)

  const desactivar = useCallback(async () => {
    setLoading(true)
    try {
      if (!soportaPush()) return
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (!sub) return
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      try {
        await db.from('push_subscriptions').update({ activa: false }, { endpoint })
      } catch {
        // Si no existía la fila (ya se había borrado) no es un error real
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { desactivar, loading }
}

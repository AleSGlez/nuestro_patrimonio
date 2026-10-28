// src/sw.js
// Service worker custom (modo injectManifest) — vite-plugin-pwa inyecta aquí
// el precache de siempre (self.__WB_MANIFEST) y además escuchamos 'push' y
// 'notificationclick' para las notificaciones nativas (tarjetas, suscripciones,
// presupuestos excedidos). Ver supabase/functions/enviar-notificaciones.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let data = { title: 'Nuestro Patrimonio', body: 'Tienes una notificación nueva.' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // Si el payload no es JSON válido, se usa el mensaje genérico
  }

  const opciones = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'np-notificacion',
    renotify: true,
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(data.title, opciones))
})

// Al tocar la notificación: enfocar una pestaña ya abierta de la app o abrir una nueva
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

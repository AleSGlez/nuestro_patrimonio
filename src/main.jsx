// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lib/queryClient'
import { ToastProvider } from '@ui/Toast'
import { ConfirmProvider } from '@ui/ConfirmDialog'
import './index.css'
import App from './App'

// Actualización automática: cuando un service worker nuevo toma el control,
// recargar para no seguir con el código viejo en caché. Al volver a la app
// (Android la deja en segundo plano) se revisa si hay versión nueva.
if ('serviceWorker' in navigator) {
  const habiaControlador = !!navigator.serviceWorker.controller
  let recargando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaControlador || recargando) return
    recargando = true
    window.location.reload()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update())
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
)

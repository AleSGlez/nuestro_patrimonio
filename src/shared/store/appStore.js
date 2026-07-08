// src/shared/store/appStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      // Tema visual
      tema: 'violet',
      setTema: (tema) => {
        document.documentElement.setAttribute('data-theme', tema)
        set({ tema })
      },

      // Nombres de la pareja (personalizados en setup)
      nombres: { p1: 'Yo', p2: 'Mi amor' },
      setNombres: (nombres) => set({ nombres }),

      // Setup completado
      setupCompleto: false,
      setSetupCompleto: (v) => set({ setupCompleto: v }),

      // Tab activo de navegación
      tab: 'inicio',
      setTab: (tab) => set({ tab }),
    }),
    {
      name: 'np-app',
      partialize: (s) => ({
        tema:         s.tema,
        nombres:      s.nombres,
        setupCompleto: s.setupCompleto,
      }),
    }
  )
)

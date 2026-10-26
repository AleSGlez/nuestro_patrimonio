// src/shared/store/appStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeAccentVariants } from '@lib/utils'

export const useAppStore = create(
  persist(
    (set) => ({
      // Tema visual — 'violet'|'emerald'|'rose'|'amber' (predefinidos, con
      // sus variantes fijas en index.css) o 'custom' (accentHex manda).
      tema: 'violet',
      accentHex: null,
      setTema: (tema) => {
        // Limpia cualquier color personalizado anterior — si no, sus
        // variables inline (más específicas que [data-theme]) seguirían
        // ganándole al tema predefinido que se acaba de elegir.
        document.documentElement.style.removeProperty('--accent')
        document.documentElement.style.removeProperty('--accent-light')
        document.documentElement.style.removeProperty('--accent-muted')
        document.documentElement.setAttribute('data-theme', tema)
        set({ tema, accentHex: null })
      },
      setAccentCustom: (hex) => {
        const { accent, accentLight, accentMuted } = computeAccentVariants(hex)
        document.documentElement.setAttribute('data-theme', 'custom')
        document.documentElement.style.setProperty('--accent', accent)
        document.documentElement.style.setProperty('--accent-light', accentLight)
        document.documentElement.style.setProperty('--accent-muted', accentMuted)
        set({ tema: 'custom', accentHex: hex })
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

      // Sidebar de escritorio colapsado a solo íconos
      sidebarColapsado: false,
      setSidebarColapsado: (v) => set({ sidebarColapsado: v }),
    }),
    {
      name: 'np-app',
      partialize: (s) => ({
        tema:         s.tema,
        accentHex:    s.accentHex,
        nombres:      s.nombres,
        setupCompleto: s.setupCompleto,
        sidebarColapsado: s.sidebarColapsado,
      }),
    }
  )
)

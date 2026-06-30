// src/shared/store/authStore.js
import { create } from 'zustand'
import { auth, tokens } from '@lib/supabase'

export const useAuthStore = create((set) => ({
  user:        null,
  pareja:      null,
  initialized: false,

  // Restaurar sesión al cargar la app
  init: async () => {
    const user = tokens.user
    const at   = tokens.access

    if (user && at) {
      set({ user, initialized: true })
      // Refresh silencioso en background
      auth.refresh().catch(() => {})
    } else if (tokens.refresh) {
      try {
        const data = await auth.refresh()
        set({ user: data.user, initialized: true })
      } catch {
        set({ user: null, initialized: true })
      }
    } else {
      set({ user: null, initialized: true })
    }
  },

  login: async (email, password) => {
    const data = await auth.signIn(email, password)
    set({ user: data.user })
    return data
  },

  register: async (email, password, meta = {}) => {
    const data = await auth.signUp(email, password, meta)
    if (data.user) set({ user: data.user })
    return data
  },

  logout: async () => {
    await auth.signOut()
    set({ user: null, pareja: null })
  },

  setPareja: (pareja) => set({ pareja }),
  setUser:   (user)   => set({ user }),
}))

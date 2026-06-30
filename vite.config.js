import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nuestro Patrimonio',
        short_name: 'Patrimonio',
        description: 'Finanzas en pareja',
        theme_color: '#0F0F14',
        background_color: '#0F0F14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@ui': resolve(__dirname, 'src/shared/components/ui'),
      '@lib': resolve(__dirname, 'src/shared/lib'),
      '@store': resolve(__dirname, 'src/shared/store'),
      '@hooks': resolve(__dirname, 'src/shared/hooks'),
    },
  },
})

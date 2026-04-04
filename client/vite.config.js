import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_URL ? env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:5000';

  if (!env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL not set. Falling back proxy to http://localhost:5000');
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Digital Twin Academic Platform',
          short_name: 'DigitalTwin',
          description: 'University Management Platform',
          theme_color: '#312e81',
          background_color: '#1e1b4b',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    server: {
      port: 5173,
      proxy: { '/api': { target, changeOrigin: true } },
    },
  }
})

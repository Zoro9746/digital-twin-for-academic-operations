import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_URL ? env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:5000';

  if (!env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL not set. Falling back proxy to http://localhost:5000');
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target, changeOrigin: true } },
    },
  }
})

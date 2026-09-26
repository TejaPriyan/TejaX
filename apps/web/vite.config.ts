import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api and /ws to the FastAPI backend so the browser
// only ever talks to same-origin URLs (works behind the sandbox preview too).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.TEJAX_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.TEJAX_API_URL || 'http://127.0.0.1:8000',
        ws: true,
      },
    },
  },
})

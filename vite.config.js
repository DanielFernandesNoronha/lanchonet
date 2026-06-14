import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/webhook': {
        target: 'https://agrobot-n8n.fyi4ak.easypanel.host',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api/mexc': {
        target: 'https://contract.mexc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mexc/, ''),
        secure: false,
      },
      '/ws/mexc': {
        target: 'wss://contract.mexc.com',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws\/mexc/, ''),
      },
    },
  },
})

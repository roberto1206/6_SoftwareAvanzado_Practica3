import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Permite acceso desde Docker
  },
  preview: {
    port: 80,
    host: true, // Permite acceso desde Docker
  },
})

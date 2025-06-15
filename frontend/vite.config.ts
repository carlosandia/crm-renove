
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lovable-tagger'],
  },
  server: {
    host: "::",
    port: 8080,
  },
})

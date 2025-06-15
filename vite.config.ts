
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './frontend',
  build: {
    outDir: '../dist',
  },
  server: {
    host: "::",
    port: 8080,
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})

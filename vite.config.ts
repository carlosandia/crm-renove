import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(() => ({
  plugins: [
    react(),
  ],
  root: './frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      clientPort: 8080,
      port: 8080
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src')
    }
  },
  define: {
    __WS_TOKEN__: JSON.stringify(process.env.WS_TOKEN || ''),
    global: 'globalThis',
  }
}))

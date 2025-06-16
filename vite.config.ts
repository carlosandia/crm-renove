
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  root: './frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 5173,
    hmr: {
      clientPort: 5173,
      port: 5173
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

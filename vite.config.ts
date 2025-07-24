import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// import { componentTagger } from "lovable-tagger"

// ============================================
// CONFIGURAÇÃO VITE SIMPLIFICADA E FUNCIONAL
// ============================================

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // AIDEV-NOTE: lovable-tagger temporariamente desabilitado devido conflito Vite 6.x
    // mode === 'development' && componentTagger(),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    host: "127.0.0.1", // ✅ Forçar localhost como especificado
    port: 8080, // ✅ Porta obrigatória 8080
    strictPort: true, // ✅ CRÍTICO: Não permitir fallback - deve ser 8080 SEMPRE
    cors: true,
    open: false, // Não abrir automaticamente
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    target: 'baseline-widely-available', // ✅ Vite 7 default target
    // ✅ Configuração mínima de build compatível com Vite 7/Rolldown
    rollupOptions: {
      output: {
        // ✅ Chunks básicos compatíveis com Vite 7
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }
        },
      }
    },
    
    // ✅ Configuração simples de minificação
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    } : undefined,
  },
  
  // ✅ Configurações básicas de ambiente
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  
  // ✅ Pre-bundling básico
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@tanstack/react-query',
      '@supabase/supabase-js',
    ],
  },
  
  // ✅ ESBuild com configuração JSX explícita
  esbuild: {
    target: 'es2020',
    keepNames: mode === 'development',
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // ✅ Configuração JSX explícita para React
    jsx: 'automatic',
    jsxDev: mode === 'development',
  },
}))
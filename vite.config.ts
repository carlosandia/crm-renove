import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dns from 'node:dns'
import { visualizer } from 'rollup-plugin-visualizer'
// import { componentTagger } from "lovable-tagger"

// ✅ CORREÇÃO DNS: Set DNS resolution order to 'verbatim' conforme documentação Vite
// Previne que Node.js reordene endereços resolvidos para 'localhost'
dns.setDefaultResultOrder('verbatim')

// ============================================
// CONFIGURAÇÃO VITE SIMPLIFICADA E FUNCIONAL
// ============================================

export default defineConfig(({ command, mode }) => {
  // Carregar variáveis de ambiente baseado no modo
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determinar se é produção
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  // URLs baseadas no ambiente
  const apiUrl = isProduction 
    ? 'https://crm.renovedigital.com.br/api'
    : env.VITE_API_URL || 'http://127.0.0.1:3001/api'
    
  const frontendUrl = isProduction
    ? 'https://crm.renovedigital.com.br'
    : env.VITE_FRONTEND_URL || 'http://127.0.0.1:8080'
  
  return {
    plugins: [
      react({
        // ✅ CORREÇÃO HMR: Configuração otimizada para Fast Refresh estável
        jsxRuntime: 'automatic',
        // Remover babel: false que estava causando problemas de Fast Refresh
        babel: {
          // Permitir parsing de decorators e outras features ES proposal
          parserOpts: {
            plugins: ['decorators-legacy', 'classProperties']
          }
        }
      }),
      // AIDEV-NOTE: lovable-tagger temporariamente desabilitado devido conflito Vite 6.x
      // mode === 'development' && componentTagger(),
      // ✅ FASE 5: Plugin para análise de bundle e performance
      isProduction && visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap' // ou 'sunburst', 'network'
      }) as PluginOption,
    ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    host: isDevelopment ? '127.0.0.1' : '0.0.0.0',
    port: 8080, // ✅ Porta obrigatória 8080
    strictPort: true, // ✅ CORREÇÃO: Forçar porta 8080 sem fallback
    cors: true,
    open: false, // Não abrir automaticamente
    // ✅ CORREÇÃO DA REGRESSÃO: Proxy SMTP corrigido (revertido para configuração funcional)
    // PROBLEMA ORIGINAL: URLs /api/simple-email/* chegavam como /simple-email/* no backend
    // PROBLEMA DA "CORREÇÃO": target com /api + rewrite criou duplicação api/api/simple-email/*
    // SOLUÇÃO CORRETA: target sem /api, sem rewrite, mantém URLs como /api/simple-email/*
    proxy: {
      '/api': {
        target: isDevelopment ? 'http://127.0.0.1:3001' : 'https://crm.renovedigital.com.br',
        changeOrigin: true,
        secure: isProduction
        // Sem rewrite: URLs /api/simple-email/* são enviadas como /api/simple-email/* ao backend
      }
    },
    // ✅ CORREÇÃO PROBLEMA #2: HMR simplificado usando configuração padrão Vite 6.x
    // Vite 6.x tem configuração automática muito mais estável
    hmr: true, // Deixar Vite gerenciar automaticamente: protocol, host, port, timeout
    // ✅ CORREÇÃO PROBLEMA #12: Implementar prefetch strategy com server.warmup
    warmup: {
      clientFiles: [
        './src/components/AppDashboard.tsx', // ✅ Dashboard principal
        './src/components/auth/ModernLoginForm.tsx', // ✅ Login crítico
        './src/components/Pipeline/PipelineKanbanView.tsx', // ✅ Pipeline principal
        './src/components/LeadsModule.tsx', // ✅ Módulo de leads
        './src/providers/AuthProvider.tsx', // ✅ Provider de autenticação
        './src/lib/supabase.ts', // ✅ Conexão com Supabase
        './src/lib/api.ts', // ✅ Cliente API
      ]
    },
    // ✅ CORREÇÃO PROBLEMA #11: File watching otimizado conforme Vite 6.x
    watch: {
      // ✅ Usar polling apenas se necessário (WSL2, Docker, alguns casos macOS)
      // Na maioria dos casos macOS funciona bem sem polling
      usePolling: false,
      interval: 300, // Intervalo reduzido para menos CPU usage
      ignored: [
        '**/node_modules/**', 
        '**/dist/**', 
        '**/.git/**',
        '**/.vite/**', // ✅ Ignorar cache do Vite
        '**/coverage/**' // ✅ Ignorar coverage de testes
      ]
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    // ✅ CORREÇÃO PROBLEMA #18: Ajustar build target conforme Vite 6.x documentação
    // 'modules' = browsers with native ES Modules support (Chrome >=64, Firefox >=67, Safari >=11.1, Edge >=79)
    // Mais compatível que 'es2020' e usa menos transpilation, melhor performance
    target: 'modules',
    // ✅ CORREÇÃO PROBLEMA #8: Bundle splitting otimizado conforme Vite 6.x
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendors principais que mudam raramente
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select',
            '@radix-ui/react-tooltip', '@radix-ui/react-tabs', '@radix-ui/react-alert-dialog'
          ],
          'vendor-data': ['@supabase/supabase-js', '@tanstack/react-query'],
          'vendor-dnd': ['@hello-pangea/dnd'],
          // Utilities que são usadas em toda aplicação
          'vendor-utils': ['axios', 'date-fns', 'zod', 'clsx']
        }
      }
    },
    
    // ✅ CORREÇÃO PROBLEMA #10: Usar esbuild (padrão Vite 6.x) ao invés de Terser
    // esbuild é 20-40x mais rápido que Terser com apenas 1-2% pior compressão
    minify: mode === 'production' ? 'esbuild' : false,
    // ✅ Configuração esbuild mais conservadora (não quebra libs)
    // console/debugger removidos via esbuild.drop (mais seguro)
  },
  
  // ✅ Configurações básicas de ambiente
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  
  // ✅ CORREÇÃO PROBLEMA #9: OptimizeDeps reduzido conforme Vite 6.x melhores práticas
  // Vite 6.x tem detecção automática melhorada - só incluir o que realmente precisa
  optimizeDeps: {
    include: [
      // ✅ Manter apenas dependências que realmente precisam de force pre-bundling
      '@hello-pangea/dnd', // Dependency com muitos deep imports
    ],
    exclude: [], // Vazio - deixar Vite detectar automaticamente
    // ✅ Usar nova estratégia de otimização do Vite 6.x
    holdUntilCrawlEnd: false // Melhora cold start em projetos grandes
  },
  
  // ✅ CORREÇÃO PROBLEMA #22: Configurar Vite Preview Server
  // Conforme documentação oficial Vite 6.x: /v6.vite.dev/config/preview-options
  preview: {
    host: isDevelopment ? '127.0.0.1' : '0.0.0.0',
    port: isProduction ? 8080 : 4173, // Use mesma porta em produção
    strictPort: true, // ✅ Forçar porta específica sem fallback
    cors: true, // ✅ Habilitar CORS para preview
    open: false, // ✅ Não abrir automaticamente
    // ✅ Herda configuração de proxy do server para manter compatibilidade
    proxy: isProduction ? undefined : {
      '/api': {
        target: isDevelopment ? 'http://127.0.0.1:3001' : 'https://crm.renovedigital.com.br',
        changeOrigin: true,
        secure: isProduction
        // Corrigido: mesmo padrão do server para consistência
      }
    },
    // ✅ Headers de segurança para preview
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  },
  
  // ✅ ESBuild com configuração JSX explícita  
  esbuild: {
    // ✅ CORREÇÃO PROBLEMA #18: Ajustar esbuild target consistente com build.target
    // 'es2018' é ideal para módulos nativos, bem suportado e performático
    target: 'es2018',
    keepNames: mode === 'development',
    // ✅ CORREÇÃO PROBLEMA #14: Drop configurado adequadamente para produção
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // ✅ Legalizer para remover console statements em produção de forma mais agressiva
    legalComments: mode === 'production' ? 'none' : 'inline',
    // ✅ Configuração JSX explícita para React
    jsx: 'automatic',
    jsxDev: isDevelopment,
  },
  
  }
})
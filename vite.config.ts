import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from "lovable-tagger"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    // 🚀 OTIMIZAÇÃO: Configuração avançada de chunks para performance máxima
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 🎯 VENDOR CHUNKS: Divisão inteligente de bibliotecas
          if (id.includes('node_modules')) {
            // React Core - essencial para primeiro carregamento
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            
            // TanStack Query - cache e estado
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            
            // Supabase - banco de dados
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase';
            }
            
            // Lucide Icons - ícones (otimização especial)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            
            // Drag and Drop - funcionalidade específica
            if (id.includes('@hello-pangea/dnd') || id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            
            // React Router - navegação
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            
            // Radix UI - componentes UI (separado por ser grande)
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            
            // Framer Motion - animações
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            
            // Outras bibliotecas menores em um chunk
            return 'vendor-misc';
          }
          
          // 🎯 MODULE CHUNKS: Separação de módulos por funcionalidade
          // FormBuilder - módulo pesado e específico
          if (id.includes('FormBuilder') || id.includes('FormBuilderModule') || 
              id.includes('ModernFormBuilder') || id.includes('FormioEditor')) {
            return 'module-formbuilder';
          }
          
          // Pipeline - funcionalidade central do CRM
          if (id.includes('Pipeline') || id.includes('Kanban') || id.includes('LeadCard')) {
            return 'module-pipeline';
          }
          
          // Companies/Empresas - gestão de empresas
          if (id.includes('EmpresasModule') || id.includes('VendedoresModule')) {
            return 'module-companies';
          }
          
          // Integrations - integrações externas
          if (id.includes('IntegrationsModule') || id.includes('ConversionsPanel')) {
            return 'module-integrations';
          }
          
          // Reports - relatórios e analytics
          if (id.includes('ReportsModule') || id.includes('PerformanceModule')) {
            return 'module-reports';
          }
          
          // UI Components - componentes reutilizáveis
          if (id.includes('components/ui/') || id.includes('src/components/ui')) {
            return 'ui-components';
          }
          
          // Utils e Hooks
          if (id.includes('hooks/') || id.includes('utils/') || id.includes('lib/')) {
            return 'shared-utils';
          }
          
          // Componentes gerais
          if (id.includes('components/')) {
            return 'components';
          }
        },
        
        // 🚀 OTIMIZAÇÃO: Nomes com hash para cache eficiente
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name].[hash].js`;
        },
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];
          
          // 🎯 Organizar assets por tipo
          if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name!)) {
            return `assets/fonts/[name].[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name!)) {
            return `assets/images/[name].[hash].${ext}`;
          }
          return `assets/[name].[hash].${ext}`;
        }
      }
    },
    
    // 🚀 OTIMIZAÇÃO: Configurações avançadas de minificação
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remover console.log em produção
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        // Otimizações adicionais
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
        // Remover código morto
        dead_code: true,
        // Reduzir condicionais
        conditionals: true,
        // Remover código não utilizado
        unused: true,
        // Reduzir comparações
        comparisons: true,
        // Otimizar loops
        loops: true,
        // Inline pequenas funções
        inline: 2,
      },
      mangle: {
        // Manter nomes de classes para CSS
        keep_classnames: false,
        // Manter nomes de funções para debug (apenas em dev)
        keep_fnames: mode !== 'production',
      },
      format: {
        // Remover comentários
        comments: false,
      }
    },
    
    // 🚀 OTIMIZAÇÃO: Configurações de performance
    chunkSizeWarningLimit: 1000, // Aviso para chunks > 1MB
    assetsInlineLimit: 4096, // Inline assets < 4KB como base64
    
    // 🚀 OTIMIZAÇÃO: Configurações de CSS
    cssCodeSplit: true, // Separar CSS por chunk
    cssTarget: 'es2015', // Compatibilidade CSS
  },
  
  // 🚀 OTIMIZAÇÃO: Configurações de desenvolvimento
  define: {
    global: 'globalThis',
    // Definir variáveis de ambiente como fallback
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.REACT_APP_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
  },
  
  // 🚀 OTIMIZAÇÃO: Pre-bundling de dependências
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@tanstack/react-query',
      '@hello-pangea/dnd',
      '@supabase/supabase-js',
      // Incluir hooks customizados frequentemente usados
      'react/jsx-runtime',
    ],
    exclude: [
      // Excluir bibliotecas que devem ser carregadas sob demanda
      '@radix-ui/react-accordion',
      '@radix-ui/react-collapsible',
    ]
  },
  
  // 🚀 OTIMIZAÇÃO: Configurações de performance do servidor de dev
  esbuild: {
    target: 'es2020',
    // Manter nomes de classes em desenvolvimento para debug
    keepNames: mode === 'development',
    // Remover console.log apenas em produção
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  
  // 🚀 OTIMIZAÇÃO: Configurações experimentais
  experimental: {
    // Renderização de assets otimizada
    renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
      if (hostType === 'js') {
        return { js: `window.__assetsPath("${filename}")` }
      } else {
        return { relative: true }
      }
    }
  }
}))

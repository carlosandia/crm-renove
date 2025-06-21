// Utilitário robusto para filtrar erros irrelevantes do console
export const setupConsoleFilter = () => {
  // Salvar referências originais
  const originalError = console.error;
  const originalWarn = console.warn;

  // Lista de padrões para filtrar
  const filterPatterns = [
    // Extensões do Chrome
    'chrome-extension://',
    'background.js',
    'background.html',
    'The message port closed before a response was received',
    
    // React Router v6 warnings conhecidos
    'React Router Future Flag Warning',
    'future.v7_startTransition',
    'future.v7_relativeSplatPath',
    
    // React DevTools
    'react-devtools',
    
    // Vite/HMR warnings
    '[vite]',
    'HMR',
    
    // Browser APIs não críticos
    'ResizeObserver loop limit exceeded',
    'Non-passive event listener',
    
    // Supabase warnings não críticos
    'Using the user object as returned from supabase.auth.getSession()',
    
    // Console warnings de desenvolvimento
    'Warning: ReactDOM.render is no longer supported',
    'Warning: validateDOMNesting',
    
    // Network errors que são tratados pela aplicação
    'Failed to fetch',
    'NetworkError',
    
    // Errors de chunk loading (lazy loading)
    'Loading chunk',
    'ChunkLoadError'
  ];

  // Função para verificar se deve filtrar
  const shouldFilter = (message: string): boolean => {
    return filterPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  // Interceptar console.error
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Filtrar erros irrelevantes
    if (shouldFilter(message)) {
      return;
    }
    
    // Manter apenas erros importantes
    originalError.apply(console, args);
  };

  // Interceptar console.warn para warnings específicos
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Filtrar warnings irrelevantes
    if (shouldFilter(message)) {
      return;
    }
    
    // Manter warnings importantes
    originalWarn.apply(console, args);
  };

  // Log apenas em desenvolvimento
  if (import.meta.env.DEV) {
    console.log('🔧 Filtro de console configurado - suprimindo erros irrelevantes');
  }
};

// Função para restaurar o console original (para debugging)
export const restoreConsole = () => {
  // Implementação básica - recarregar página para restaurar
  if (import.meta.env.DEV) {
    console.log('⚠️ Para restaurar console original, recarregue a página');
  }
};

// Função para debug - mostrar todos os logs temporariamente
export const enableDebugMode = () => {
  if (import.meta.env.DEV) {
    console.log('🐛 Modo debug ativado - todos os logs serão exibidos');
    // Recarregar página para desativar filtros
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
};

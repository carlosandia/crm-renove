// Filtro avançado de console para reduzir ruído de logs

// Flag para controlar se deve aplicar filtros de console
const SHOULD_FILTER_CONSOLE = import.meta.env.VITE_DEBUG_MODE !== 'true';

// Lista de padrões de mensagens para filtrar
const FILTERED_PATTERNS = [
  // Warnings do React/Browser que não são críticos
  'Warning: ReactDOM.render is deprecated',
  'Warning: findDOMNode is deprecated',
  'validateDOMNesting',
  
  // Mensagens de extensões do browser
  'extension',
  'Extension',
  'chrome-extension',
  
  // Warnings específicos do sistema (NÃO filtrar erros de resource)
  'AuthProvider',
  'Renderizando contexto',
  'Estado atual do usePipelineData',
  
  // Avisos não críticos do Supabase (mas não erros de query)
  'supabase-js: realtime',
  'realtime connection',
  
  // Avisos de performance que não são críticos
  'performanceMonitoring'
];

// Função para verificar se uma mensagem deve ser filtrada
function shouldFilterMessage(message: string): boolean {
  if (!SHOULD_FILTER_CONSOLE) return false;
  
  // 🔒 ANTI-LOOP: Nunca filtrar mensagens relacionadas ao próprio filtro
  if (message.toLowerCase().includes('consolefilter')) {
    return false;
  }
  
  return FILTERED_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Aplicar filtros apenas se não estivermos em modo debug
if (SHOULD_FILTER_CONSOLE) {
  // Backup das funções originais
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;

  // Interceptar console.warn
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilterMessage(message)) {
      originalWarn.apply(console, args);
    }
  };

  // Interceptar console.error (apenas para warnings não críticos)
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    // Só filtrar erros específicos que sabemos que não são críticos
    const nonCriticalErrorPatterns = [
      'AuthProvider',
      'Renderizando contexto'
    ];
    
    // ✅ NUNCA filtrar erros do Supabase - são críticos para debug
    if (message.toLowerCase().includes('supabase') || 
        message.toLowerCase().includes('could not embed') ||
        message.toLowerCase().includes('relationship')) {
      originalError.apply(console, args);
      return;
    }
    
    const isNonCritical = nonCriticalErrorPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (!isNonCritical) {
      originalError.apply(console, args);
    }
  };

  // Interceptar console.log para reduzir spam
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilterMessage(message)) {
      originalLog.apply(console, args);
    }
  };
}

export { shouldFilterMessage };

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

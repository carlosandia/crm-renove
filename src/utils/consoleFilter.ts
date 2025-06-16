// Utilitário avançado para filtrar erros de extensões do Chrome no console
export const setupConsoleFilter = () => {
  // Salvar referências originais
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Lista abrangente de padrões para filtrar
  const filterPatterns = [
    // Extensões do Chrome
    'chrome-extension://',
    'background.js',
    'background.html',
    
    // Erros de frame e messaging
    'DelayedMessageSender',
    'FrameDoesNotExistError',
    'FrameIsBrowserFrameError',
    'Frame with ID',
    'Frame does not exist',
    'cancelPendingRequests',
    'readyToReceiveMessages',
    'frameIsReadyToReceiveMessages',
    'TabMonitor.frameIsReadyToReceiveMessages',
    'setupContentScript',
    'reset',
    
    // Runtime errors
    'Unchecked runtime.lastError',
    'Could not establish connection',
    'Receiving end does not exist',
    'The message port closed before a response was received',
    'Connection closed',
    'Port error',
    
    // Tab errors específicos
    'tab 26603',
    'tab 26684',
    'tab 2668',
    'tab does not exist',
    'is a browser frame',
    'showing error page',
    
    // Outros padrões comuns
    'Error: Cancelled',
    'anonymous>',
    'chunk-UPELNCPK',
    'js:v=',
    'net::ERR_FILE_NOT_FOUND'
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
    if (shouldFilter(message)) {
      return; // Suprimir erro
    }
    originalError.apply(console, args);
  };

  // Interceptar console.warn
  console.warn = (...args) => {
    const message = args.join(' ');
    if (shouldFilter(message)) {
      return; // Suprimir warning
    }
    originalWarn.apply(console, args);
  };

  // Interceptar console.log para casos específicos
  console.log = (...args) => {
    const message = args.join(' ');
    if (shouldFilter(message)) {
      return; // Suprimir log
    }
    originalLog.apply(console, args);
  };

  // Interceptar erros não capturados
  window.addEventListener('error', (event) => {
    if (shouldFilter(event.message || '')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  // Interceptar promises rejeitadas
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.toString() || '';
    if (shouldFilter(message)) {
      event.preventDefault();
      return false;
    }
  });
};

// Função para restaurar o console original (se necessário)
export const restoreConsole = () => {
  // Esta função pode ser usada para restaurar o console original se necessário
  // Por enquanto, deixamos vazia pois queremos manter o filtro ativo
}; 
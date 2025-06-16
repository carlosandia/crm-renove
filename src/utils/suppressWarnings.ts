// Suprimir warnings específicos do console de forma mais robusta
if (typeof window !== 'undefined') {
  // Lista expandida de padrões para suprimir
  const suppressPatterns = [
    'chrome-extension://',
    'ERR_FILE_NOT_FOUND',
    'net::ERR_FAILED',
    'Failed to load resource',
    'Extension context invalidated',
    'Unchecked runtime.lastError',
    'runtime.lastError',
    'frameDoesNotExistError',
    'Frame does not exist',
    'Could not establish connection',
    'Receiving end does not exist',
    'The message port closed before a response was received',
    'Extra attributes from the server',
    'Warning: Extra attributes',
    'Hydration',
    'suppressWarnings.ts',
    'webpack-internal://',
    'at html',
    'at RootLayout',
    'at RedirectErrorBoundary',
    'at RedirectBoundary',
    'at NotFoundErrorBoundary',
    'at NotFoundBoundary',
    'at DevRootNotFoundBoundary',
    'at ReactDevOverlay',
    'at HotReload',
    'at Router',
    'at ErrorBoundaryHandler',
    'at ErrorBoundary',
    'at AppRouter',
    'at ServerRoot',
    'moz-extension://',
    'safari-extension://',
    'extension://',
    'Script error',
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded'
  ];

  // Função melhorada para verificar se deve suprimir
  const shouldSuppress = (message: any): boolean => {
    if (!message) return false;
    
    const messageStr = String(message).toLowerCase();
    
    return suppressPatterns.some(pattern => {
      const patternLower = pattern.toLowerCase();
      return messageStr.includes(patternLower) || 
             messageStr.indexOf(patternLower) !== -1;
    });
  };

  // Backup das funções originais
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Suprimir console.error
  console.error = (...args: any[]) => {
    // Verificar se algum dos argumentos deve ser suprimido
    if (args.some(arg => shouldSuppress(arg))) {
      return;
    }
    
    // Verificar se é um erro de extensão específico
    const errorMessage = args.join(' ');
    if (shouldSuppress(errorMessage)) {
      return;
    }
    
    originalError.apply(console, args);
  };

  // Suprimir console.warn
  console.warn = (...args: any[]) => {
    // Verificar se algum dos argumentos deve ser suprimido
    if (args.some(arg => shouldSuppress(arg))) {
      return;
    }
    
    // Verificar se é um warning de extensão específico
    const warnMessage = args.join(' ');
    if (shouldSuppress(warnMessage)) {
      return;
    }
    
    originalWarn.apply(console, args);
  };

  // Suprimir console.log para desenvolvimento (opcional)
  console.log = (...args: any[]) => {
    // Verificar se algum dos argumentos deve ser suprimido
    if (args.some(arg => shouldSuppress(arg))) {
      return;
    }
    originalLog.apply(console, args);
  };

  // Interceptar erros não capturados de forma mais robusta
  window.addEventListener('error', (event: ErrorEvent) => {
    if (shouldSuppress(event.message) || 
        shouldSuppress(event.filename) ||
        shouldSuppress((event.error as Error)?.message) ||
        shouldSuppress((event.error as Error)?.stack)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Interceptar promises rejeitadas de forma mais robusta
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (shouldSuppress((event.reason as Error)?.message) || 
        shouldSuppress(String(event.reason)) ||
        shouldSuppress((event.reason as Error)?.stack)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Interceptar erros de runtime específicos do Chrome
  try {
    if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.runtime) {
      const chromeRuntime = (window as any).chrome.runtime;
      const originalSendMessage = chromeRuntime.sendMessage;
      chromeRuntime.sendMessage = function(...args: any[]) {
        try {
          return originalSendMessage.apply(this, args);
        } catch (error) {
          // Suprimir erros de runtime do Chrome
          if (shouldSuppress((error as Error).message)) {
            return;
          }
          throw error;
        }
      };
    }
  } catch (e) {
    // Ignorar erros ao tentar acessar chrome.runtime
  }

  // Suprimir erros específicos do DOM
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(
    this: EventTarget,
    type: string, 
    listener: EventListenerOrEventListenerObject | null, 
    options?: boolean | AddEventListenerOptions
  ) {
    const wrappedListener = function(this: EventTarget, event: Event) {
      try {
        if (typeof listener === 'function') {
          return listener.call(this, event);
        } else if (listener && typeof listener.handleEvent === 'function') {
          return listener.handleEvent(event);
        }
      } catch (error) {
        if (shouldSuppress((error as Error).message)) {
          return;
        }
        throw error;
      }
    };
    
    return originalAddEventListener.call(this, type, wrappedListener, options);
  };
}

export {}; 
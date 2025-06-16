// Supressor seguro de erros sem conflitos
if (typeof window !== 'undefined') {
  // Padrões de erro para suprimir
  const errorPatterns = [
    'TypeError: Cannot redefine property: chrome',
    'frameDoesNotExistError',
    'runtime.lastError',
    'chrome-extension://',
    'Extension context invalidated',
    'The message port closed before a response was received'
  ];

  // Função para verificar se deve suprimir
  const shouldSuppressError = (message: string): boolean => {
    return errorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  // Interceptar erros globais de forma mais segura
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Converter message para string se necessário
    const messageStr = typeof message === 'string' ? message : String(message);
    
    // Verificar se deve suprimir
    if (shouldSuppressError(messageStr)) {
      return true; // Suprimir o erro
    }

    // Verificar source também
    if (typeof source === 'string' && shouldSuppressError(source)) {
      return true;
    }

    // Chamar handler original se existir
    if (originalErrorHandler) {
      return originalErrorHandler.call(window, message, source, lineno, colno, error);
    }

    return false;
  };

  // Interceptar promises rejeitadas
  const originalRejectionHandler = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    const reason = String(event.reason || '');
    
    if (shouldSuppressError(reason)) {
      event.preventDefault();
      return true;
    }

    if (originalRejectionHandler) {
      return originalRejectionHandler.call(window, event);
    }

    return false;
  };

  // Interceptar console.error de forma mais específica
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    // Verificar se algum argumento contém padrões a serem suprimidos
    const hasSuppressionPattern = args.some(arg => {
      const argStr = String(arg);
      return shouldSuppressError(argStr);
    });

    if (hasSuppressionPattern) {
      return; // Não mostrar no console
    }

    // Chamar console.error original
    originalConsoleError.apply(console, args);
  };

  // Interceptar addEventListener para capturar erros específicos
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    // Se for um listener de erro, wrappear para suprimir erros específicos
    if (type === 'error' && listener) {
      const wrappedListener = function(this: EventTarget, event: Event) {
        try {
          if (typeof listener === 'function') {
            return listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            return listener.handleEvent(event);
          }
        } catch (error) {
          const errorMessage = (error as Error).message || String(error);
          if (shouldSuppressError(errorMessage)) {
            return; // Suprimir erro
          }
          throw error; // Re-throw se não for para suprimir
        }
      };
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }

    // Para outros tipos de evento, usar o listener original
    return originalAddEventListener.call(this, type, listener, options);
  };
}

export {}; 
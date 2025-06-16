// Supressor específico para erros de extensões do Chrome
if (typeof window !== 'undefined') {
  // Interceptar erros específicos de extensões
  const extensionErrorPatterns = [
    'frameDoesNotExistError',
    'Frame does not exist',
    'runtime.lastError',
    'Unchecked runtime.lastError',
    'Could not establish connection',
    'Receiving end does not exist',
    'The message port closed before a response was received',
    'Extension context invalidated',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://'
  ];

  // Função para verificar se é erro de extensão
  const isExtensionError = (message: string): boolean => {
    return extensionErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  // Interceptar e suprimir erros de runtime do Chrome
  const originalOnerror = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Verificar se é erro de extensão
    if (typeof message === 'string' && isExtensionError(message)) {
      return true; // Suprimir o erro
    }
    
    if (typeof source === 'string' && isExtensionError(source)) {
      return true; // Suprimir o erro
    }

    // Chamar o handler original se não for erro de extensão
    if (originalOnerror) {
      return originalOnerror.call(window, message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Interceptar promises rejeitadas relacionadas a extensões
  const originalOnunhandledrejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    const reason = String(event.reason);
    
    if (isExtensionError(reason)) {
      event.preventDefault();
      return true; // Suprimir o erro
    }

    // Chamar o handler original se não for erro de extensão
    if (originalOnunhandledrejection) {
      return originalOnunhandledrejection.call(window, event);
    }
    
    return false;
  };

  // Interceptar tentativas de acesso ao chrome.runtime de forma mais segura
  try {
    if (typeof (window as any).chrome !== 'undefined') {
      const chrome = (window as any).chrome;
      
      // Wrapper para chrome.runtime.sendMessage
      if (chrome.runtime && chrome.runtime.sendMessage) {
        const originalSendMessage = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = function(...args: any[]) {
          try {
            return originalSendMessage.apply(this, args);
          } catch (error) {
            // Suprimir silenciosamente erros de runtime
            return undefined;
          }
        };
      }

      // Wrapper para chrome.runtime.connect
      if (chrome.runtime && chrome.runtime.connect) {
        const originalConnect = chrome.runtime.connect;
        chrome.runtime.connect = function(...args: any[]) {
          try {
            return originalConnect.apply(this, args);
          } catch (error) {
            // Retornar um objeto mock para evitar erros
            return {
              postMessage: () => {},
              disconnect: () => {},
              onMessage: { addListener: () => {} },
              onDisconnect: { addListener: () => {} }
            };
          }
        };
      }
    }
  } catch (e) {
    // Ignorar erros ao tentar acessar chrome APIs
  }
}

export {}; 
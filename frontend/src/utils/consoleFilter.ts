// Utilitário para filtrar erros de extensões do Chrome no console
export const setupConsoleFilter = () => {
  // Filtrar erros relacionados a extensões do Chrome
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args) => {
    const message = args.join(' ');
    
    // Filtrar erros conhecidos de extensões
    if (
      message.includes('chrome-extension://') ||
      message.includes('background.js') ||
      message.includes('DelayedMessageSender') ||
      message.includes('FrameDoesNotExistError') ||
      message.includes('Frame with ID') ||
      message.includes('tab 26') ||
      message.includes('Unchecked runtime.lastError') ||
      message.includes('Could not establish connection')
    ) {
      return; // Suprimir esses erros
    }
    
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Filtrar warnings conhecidos de extensões
    if (
      message.includes('chrome-extension://') ||
      message.includes('background.js')
    ) {
      return; // Suprimir esses warnings
    }
    
    originalWarn.apply(console, args);
  };
};

// Função para restaurar o console original (se necessário)
export const restoreConsole = () => {
  // Esta função pode ser usada para restaurar o console original se necessário
  // Por enquanto, deixamos vazia pois queremos manter o filtro ativo
}; 
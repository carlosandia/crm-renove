// =====================================================================================
// INTEGRATION: Logger + Modern Notification System
// Autor: Claude (Arquiteto Sênior)
// Descrição: Integração entre sistema de logging e notificações modernas
// =====================================================================================

let modernNotifyInstance: any = null;

// Função para registrar a instância do modernNotify
export const registerModernNotify = (notifyInstance: any) => {
  modernNotifyInstance = notifyInstance;
};

// Função para obter a instância registrada
export const getModernNotify = () => {
  return modernNotifyInstance;
};

// Hook para auto-registro quando ModernNotificationSystem é carregado
if (typeof window !== 'undefined') {
  // Aguardar carregamento do sistema de notificações
  const checkForNotificationSystem = () => {
    if ((window as any).modernNotify) {
      registerModernNotify((window as any).modernNotify);
    } else {
      setTimeout(checkForNotificationSystem, 100);
    }
  };
  
  checkForNotificationSystem();
}
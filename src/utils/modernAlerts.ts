// =====================================================================================
// UTILITY: Modern Alerts
// Autor: Claude (Arquiteto Sênior)
// Descrição: Substituição moderna para alert(), confirm() e prompt() usando Magic UI
// =====================================================================================

import { getModernNotify } from './loggerNotificationIntegration';

// Substituição moderna para alert()
export const modernAlert = (message: string, title: string = 'Aviso', type: 'info' | 'warning' | 'error' = 'info') => {
  const notify = getModernNotify();
  
  if (notify) {
    // Usar sistema moderno se disponível
    return notify[type](title, message, {
      duration: 5000,
      persistent: type === 'error'
    });
  } else {
    // Fallback para alert nativo se sistema não estiver disponível
    console.warn('ModernNotificationSystem não disponível, usando alert nativo');
    alert(`${title}: ${message}`);
  }
};

// Substituição moderna para confirm()
export const modernConfirm = (message: string, title: string = 'Confirmação'): Promise<boolean> => {
  return new Promise((resolve) => {
    // Por enquanto, usar confirm nativo mas preparar para modal futuro
    const result = confirm(`${title}\n\n${message}`);
    resolve(result);
  });
};

// Substituição moderna para success notifications
export const modernSuccess = (message: string, title: string = 'Sucesso', celebrate: boolean = false) => {
  const notify = getModernNotify();
  
  if (notify) {
    if (celebrate) {
      return notify.celebrate(title, message);
    } else {
      return notify.success(title, message);
    }
  } else {
    console.log(`✅ ${title}: ${message}`);
  }
};

// Substituição moderna para error notifications  
export const modernError = (error: any, title: string = 'Erro', correlationId?: string) => {
  const notify = getModernNotify();
  
  if (notify) {
    return notify.fromError(error, title, correlationId);
  } else {
    console.error(`❌ ${title}:`, error);
    alert(`${title}: ${typeof error === 'string' ? error : error.message || 'Erro inesperado'}`);
  }
};

// Substituição moderna para warning notifications
export const modernWarning = (message: string, title: string = 'Atenção') => {
  const notify = getModernNotify();
  
  if (notify) {
    return notify.warning(title, message);
  } else {
    console.warn(`⚠️ ${title}: ${message}`);
    alert(`${title}: ${message}`);
  }
};

// API simplificada para migração gradual
export const modernAlerts = {
  alert: modernAlert,
  confirm: modernConfirm,
  success: modernSuccess,
  error: modernError,
  warning: modernWarning,
  
  // Shortcuts para casos comuns
  info: (message: string) => modernAlert(message, 'Informação', 'info'),
  saved: (entityName: string = 'Item') => modernSuccess(`${entityName} salvo com sucesso!`, 'Salvo'),
  deleted: (entityName: string = 'Item') => modernSuccess(`${entityName} excluído com sucesso!`, 'Excluído'),
  created: (entityName: string = 'Item') => modernSuccess(`${entityName} criado com sucesso!`, 'Criado', true),
  updated: (entityName: string = 'Item') => modernSuccess(`${entityName} atualizado com sucesso!`, 'Atualizado'),
  
  // Confirmações comuns
  confirmDelete: (entityName: string = 'este item') => 
    modernConfirm(`Tem certeza que deseja excluir ${entityName}? Esta ação não pode ser desfeita.`, 'Confirmar Exclusão'),
  
  confirmSave: (entityName: string = 'as alterações') => 
    modernConfirm(`Deseja salvar ${entityName}?`, 'Confirmar Salvamento'),
    
  confirmDiscard: (entityName: string = 'as alterações') =>
    modernConfirm(`Deseja descartar ${entityName}? Todas as modificações serão perdidas.`, 'Confirmar Descarte')
};

// Substituir globals (opcional - para migração automática)
if (typeof window !== 'undefined') {
  // Backup das funções originais
  (window as any).originalAlert = window.alert;
  (window as any).originalConfirm = window.confirm;
  
  // Substituir globalmente (comentado por segurança - ativar apenas se necessário)
  // window.alert = (message: string) => modernAlert(message);
  // window.confirm = (message: string) => modernConfirm(message);
  
  // Disponibilizar globalmente para uso opcional
  (window as any).modernAlerts = modernAlerts;
}
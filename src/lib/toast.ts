import { 
  toast, 
  showSuccessToast, 
  showErrorToast, 
  showWarningToast, 
  showInfoToast 
} from "../hooks/useToast"

// Função de compatibilidade para o sistema antigo
export const showToast = (options: {
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}) => {
  const { title = '', message = '', type = 'info' } = options;
  
  switch (type) {
    case 'success':
      return showSuccessToast(title, message);
    case 'error':
      return showErrorToast(title, message);
    case 'warning':
      return showWarningToast(title, message);
    case 'info':
    default:
      return showInfoToast(title, message);
  }
};

// Re-exportar as funções específicas para facilitar imports
export { showSuccessToast, showErrorToast, showWarningToast, showInfoToast };

// Funções específicas para cada tipo (mantidas para compatibilidade)
export const showSuccess = (title: string, message?: string) => {
  return showSuccessToast(title, message);
};

export const showError = (title: string, message?: string) => {
  return showErrorToast(title, message);
};

export const showWarning = (title: string, message?: string) => {
  return showWarningToast(title, message);
};

export const showInfo = (title: string, message?: string) => {
  return showInfoToast(title, message);
}; 
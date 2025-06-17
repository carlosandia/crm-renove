// ============================================
// UTILITÁRIOS DE FUSO HORÁRIO - BRASÍLIA
// ============================================

/**
 * Gera data/hora atual no fuso horário de Brasília (GMT-3)
 * @returns string no formato ISO com timezone de Brasília
 */
export const getBrasiliaDateTime = (): string => {
  return new Date().toLocaleString('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(', ', 'T') + '-03:00';
};

/**
 * Formata data/hora para exibição em português com fuso de Brasília
 * @param dateString - String de data no formato ISO
 * @returns string formatada para exibição
 */
export const formatBrasiliaDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Formata apenas a data para exibição em português
 * @param dateString - String de data no formato ISO
 * @returns string formatada apenas com a data
 */
export const formatBrasiliaDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Calcula diferença de tempo em português
 * @param dateString - String de data no formato ISO
 * @returns string descritiva da diferença de tempo
 */
export const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'agora mesmo';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''} atrás`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'} atrás`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ano${diffInYears > 1 ? 's' : ''} atrás`;
};

/**
 * Verifica se uma data está no fuso horário de Brasília
 * @param dateString - String de data no formato ISO
 * @returns boolean indicando se está no fuso correto
 */
export const isBrasiliaTimezone = (dateString: string): boolean => {
  return dateString.endsWith('-03:00') || dateString.includes('America/Sao_Paulo');
};

/**
 * Converte qualquer data para o fuso de Brasília
 * @param dateString - String de data em qualquer formato
 * @returns string no fuso de Brasília
 */
export const convertToBrasilia = (dateString: string): string => {
  const date = new Date(dateString);
  return new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).toISOString();
}; 
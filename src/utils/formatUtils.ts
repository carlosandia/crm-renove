/**
 * 🔧 Utilitários de Formatação - Elimina duplicação em 15+ componentes
 * Formatação consistente de moeda, data, telefone e números
 */

// ============================================
// FORMATAÇÃO DE MOEDA
// ============================================

/**
 * Formata valor para moeda brasileira (R$)
 * Elimina duplicação em 15+ arquivos
 */
export const formatCurrency = (value?: number | string): string => {
  const numValue = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

/**
 * Formata valor para moeda compacta (1.5K, 2.3M)
 */
export const formatCurrencyCompact = (value?: number | string): string => {
  const numValue = Number(value) || 0;
  
  if (numValue >= 1000000) {
    return `R$ ${(numValue / 1000000).toFixed(1)}M`;
  } else if (numValue >= 1000) {
    return `R$ ${(numValue / 1000).toFixed(1)}K`;
  }
  
  return formatCurrency(numValue);
};

/**
 * Formata entrada de moeda enquanto usuário digita
 */
export const formatCurrencyInput = (value: string): string => {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  
  // Converte para centavos
  const cents = Number(numbers) || 0;
  const reais = cents / 100;
  
  return formatCurrency(reais);
};

/**
 * Remove formatação de moeda para obter número
 */
export const parseCurrency = (formattedValue: string): number => {
  const cleaned = formattedValue
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
    
  return Number(cleaned) || 0;
};

// ============================================
// FORMATAÇÃO DE DATA
// ============================================

/**
 * Formata data para padrão brasileiro (dd/mm/aaaa)
 * Elimina duplicação em 40+ arquivos
 */
export const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return 'Não informado';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return 'Data inválida';
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata data e hora para padrão brasileiro
 */
export const formatDateTime = (dateString?: string | Date): string => {
  if (!dateString) return 'Não informado';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return 'Data inválida';
  
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata data para exibição relativa (hoje, ontem, X dias atrás)
 */
export const formatRelativeDate = (dateString?: string | Date): string => {
  if (!dateString) return 'Não informado';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} semanas atrás`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} meses atrás`;
  
  return `${Math.ceil(diffDays / 365)} anos atrás`;
};

/**
 * Formata data para input HTML5 (YYYY-MM-DD)
 */
export const formatDateForInput = (dateString?: string | Date): string => {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return '';
  
  return date.toISOString().split('T')[0];
};

/**
 * Formata duração em segundos para string legível
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

// ============================================
// FORMATAÇÃO DE NÚMEROS
// ============================================

/**
 * Formata número para padrão brasileiro
 */
export const formatNumber = (value?: number | string): string => {
  const numValue = Number(value) || 0;
  return numValue.toLocaleString('pt-BR');
};

/**
 * Formata percentual
 */
export const formatPercentage = (value?: number | string, decimals: number = 1): string => {
  const numValue = Number(value) || 0;
  return `${numValue.toFixed(decimals)}%`;
};

/**
 * Formata número compacto (1.5K, 2.3M)
 */
export const formatNumberCompact = (value?: number | string): string => {
  const numValue = Number(value) || 0;
  
  if (numValue >= 1000000) {
    return `${(numValue / 1000000).toFixed(1)}M`;
  } else if (numValue >= 1000) {
    return `${(numValue / 1000).toFixed(1)}K`;
  }
  
  return formatNumber(numValue);
};

// ============================================
// FORMATAÇÃO DE TELEFONE
// ============================================

/**
 * Formata telefone brasileiro
 */
export const formatPhone = (phone?: string): string => {
  if (!phone) return '';
  
  // Remove tudo exceto números
  const numbers = phone.replace(/\D/g, '');
  
  // Celular com 11 dígitos: (xx) xxxxx-xxxx
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  
  // Fixo com 10 dígitos: (xx) xxxx-xxxx
  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  return phone; // Retorna como está se não seguir padrão
};

/**
 * Remove formatação do telefone
 */
export const parsePhone = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '');
};

// ============================================
// FORMATAÇÃO DE CPF/CNPJ
// ============================================

/**
 * Formata CPF: 000.000.000-00
 */
export const formatCPF = (cpf?: string): string => {
  if (!cpf) return '';
  
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  }
  
  return cpf;
};

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export const formatCNPJ = (cnpj?: string): string => {
  if (!cnpj) return '';
  
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length === 14) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  }
  
  return cnpj;
};

/**
 * Formata CPF ou CNPJ automaticamente
 */
export const formatDocument = (document?: string): string => {
  if (!document) return '';
  
  const numbers = document.replace(/\D/g, '');
  
  if (numbers.length === 11) return formatCPF(numbers);
  if (numbers.length === 14) return formatCNPJ(numbers);
  
  return document;
};

// ============================================
// FORMATAÇÃO DE EMAIL
// ============================================

/**
 * Valida e formata email
 */
export const formatEmail = (email?: string): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

/**
 * Ofusca email para privacidade (ex: jo***@example.com)
 */
export const maskEmail = (email?: string): string => {
  if (!email) return '';
  
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  if (localPart.length <= 2) return email;
  
  const masked = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  return `${masked}@${domain}`;
};

// ============================================
// FORMATAÇÃO DE NOME
// ============================================

/**
 * Formata nome próprio (primeira letra maiúscula)
 */
export const formatName = (name?: string): string => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Gera iniciais do nome
 */
export const getInitials = (name?: string): string => {
  if (!name) return '';
  
  const words = name.trim().split(' ');
  const initials = words
    .slice(0, 2) // Primeiros 2 nomes apenas
    .map(word => word.charAt(0).toUpperCase())
    .join('');
    
  return initials;
};

// ============================================
// FORMATAÇÃO DE ENDEREÇO
// ============================================

/**
 * Formata CEP: 00000-000
 */
export const formatCEP = (cep?: string): string => {
  if (!cep) return '';
  
  const numbers = cep.replace(/\D/g, '');
  
  if (numbers.length === 8) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  }
  
  return cep;
};

// ============================================
// EXPORTAÇÕES CONVENIENTES
// ============================================

export const formatUtils = {
  // Moeda
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyInput,
  parseCurrency,
  
  // Data
  formatDate,
  formatDateTime,
  formatRelativeDate,
  formatDateForInput,
  formatDuration,
  
  // Números
  formatNumber,
  formatPercentage,
  formatNumberCompact,
  
  // Telefone
  formatPhone,
  parsePhone,
  
  // Documentos
  formatCPF,
  formatCNPJ,
  formatDocument,
  
  // Email
  formatEmail,
  maskEmail,
  
  // Nome
  formatName,
  getInitials,
  
  // Endereço
  formatCEP
}; 
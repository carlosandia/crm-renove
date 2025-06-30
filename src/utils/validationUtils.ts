/**
 * 🔧 Utilitários de Validação - Complementa useFormValidation da TAREFA 4
 * Validações específicas e reutilizáveis para o CRM
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => ValidationResult;
}

// ============================================
// VALIDAÇÕES BÁSICAS
// ============================================

/**
 * Valida se campo obrigatório está preenchido
 */
export const validateRequired = (value: any, fieldName: string = 'Campo'): ValidationResult => {
  const isEmpty = value === null || value === undefined || 
                  (typeof value === 'string' && value.trim() === '') ||
                  (Array.isArray(value) && value.length === 0);
                  
  return {
    isValid: !isEmpty,
    message: isEmpty ? `${fieldName} é obrigatório` : undefined
  };
};

/**
 * Valida comprimento mínimo
 */
export const validateMinLength = (value: string, minLength: number, fieldName: string = 'Campo'): ValidationResult => {
  const length = value?.length || 0;
  const isValid = length >= minLength;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve ter pelo menos ${minLength} caracteres` : undefined
  };
};

/**
 * Valida comprimento máximo
 */
export const validateMaxLength = (value: string, maxLength: number, fieldName: string = 'Campo'): ValidationResult => {
  const length = value?.length || 0;
  const isValid = length <= maxLength;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve ter no máximo ${maxLength} caracteres` : undefined
  };
};

/**
 * Valida padrão regex
 */
export const validatePattern = (value: string, pattern: RegExp, message: string): ValidationResult => {
  const isValid = pattern.test(value || '');
  
  return {
    isValid,
    message: !isValid ? message : undefined
  };
};

// ============================================
// VALIDAÇÕES DE EMAIL
// ============================================

/**
 * Valida formato de email
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email || '');
  
  return {
    isValid,
    message: !isValid ? 'Email deve ter um formato válido' : undefined
  };
};

/**
 * Valida se email não está em lista de domínios bloqueados
 */
export const validateEmailDomain = (email: string, blockedDomains: string[] = []): ValidationResult => {
  if (!email) return { isValid: true };
  
  const domain = email.split('@')[1]?.toLowerCase();
  const isBlocked = blockedDomains.some(blocked => domain === blocked.toLowerCase());
  
  return {
    isValid: !isBlocked,
    message: isBlocked ? 'Domínio de email não permitido' : undefined
  };
};

// ============================================
// VALIDAÇÕES DE TELEFONE
// ============================================

/**
 * Valida telefone brasileiro
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) return { isValid: true };
  
  const numbers = phone.replace(/\D/g, '');
  
  // Aceita 10 dígitos (fixo) ou 11 dígitos (celular)
  const isValid = numbers.length === 10 || numbers.length === 11;
  
  return {
    isValid,
    message: !isValid ? 'Telefone deve ter 10 ou 11 dígitos' : undefined
  };
};

/**
 * Valida se é celular (11 dígitos)
 */
export const validateCellPhone = (phone: string): ValidationResult => {
  if (!phone) return { isValid: true };
  
  const numbers = phone.replace(/\D/g, '');
  const isValid = numbers.length === 11;
  
  return {
    isValid,
    message: !isValid ? 'Celular deve ter 11 dígitos' : undefined
  };
};

// ============================================
// VALIDAÇÕES DE DOCUMENTOS
// ============================================

/**
 * Valida CPF brasileiro
 */
export const validateCPF = (cpf: string): ValidationResult => {
  if (!cpf) return { isValid: true };
  
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) {
    return { isValid: false, message: 'CPF deve ter 11 dígitos' };
  }
  
  if (/^(\d)\1{10}$/.test(numbers)) {
    return { isValid: false, message: 'CPF inválido' };
  }
  
  return { isValid: true };
};

/**
 * Valida CNPJ brasileiro
 */
export const validateCNPJ = (cnpj: string): ValidationResult => {
  if (!cnpj) return { isValid: true };
  
  const numbers = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (numbers.length !== 14) {
    return { isValid: false, message: 'CNPJ deve ter 14 dígitos' };
  }
  
  // Verifica se não é sequência repetida
  if (/^(\d)\1{13}$/.test(numbers)) {
    return { isValid: false, message: 'CNPJ inválido' };
  }
  
  // Algoritmo de validação do CNPJ
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(numbers.charAt(12))) {
    return { isValid: false, message: 'CNPJ inválido' };
  }
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit2 !== parseInt(numbers.charAt(13))) {
    return { isValid: false, message: 'CNPJ inválido' };
  }
  
  return { isValid: true };
};

// ============================================
// VALIDAÇÕES DE SENHA
// ============================================

/**
 * Valida senha forte
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) return { isValid: false, message: 'Senha é obrigatória' };
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    return { isValid: false, message: `Senha deve ter pelo menos ${minLength} caracteres` };
  }
  
  if (!hasUpperCase) {
    return { isValid: false, message: 'Senha deve conter pelo menos uma letra maiúscula' };
  }
  
  if (!hasNumbers) {
    return { isValid: false, message: 'Senha deve conter pelo menos um número' };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Senha deve conter pelo menos um caractere especial' };
  }
  
  return { isValid: true };
};

/**
 * Valida confirmação de senha
 */
export const validatePasswordConfirmation = (password: string, confirmation: string): ValidationResult => {
  const isValid = password === confirmation;
  
  return {
    isValid,
    message: !isValid ? 'Senhas não coincidem' : undefined
  };
};

// ============================================
// VALIDAÇÕES DE VALOR/NÚMEROS
// ============================================

/**
 * Valida valor numérico mínimo
 */
export const validateMinValue = (value: number, minValue: number, fieldName: string = 'Valor'): ValidationResult => {
  const numValue = Number(value) || 0;
  const isValid = numValue >= minValue;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve ser pelo menos ${minValue}` : undefined
  };
};

/**
 * Valida valor numérico máximo
 */
export const validateMaxValue = (value: number, maxValue: number, fieldName: string = 'Valor'): ValidationResult => {
  const numValue = Number(value) || 0;
  const isValid = numValue <= maxValue;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve ser no máximo ${maxValue}` : undefined
  };
};

/**
 * Valida se é número positivo
 */
export const validatePositiveNumber = (value: number, fieldName: string = 'Valor'): ValidationResult => {
  const numValue = Number(value) || 0;
  const isValid = numValue > 0;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve ser um número positivo` : undefined
  };
};

// ============================================
// VALIDAÇÕES DE DATA
// ============================================

/**
 * Valida se data não é passada
 */
export const validateFutureDate = (date: string | Date, fieldName: string = 'Data'): ValidationResult => {
  if (!date) return { isValid: true };
  
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isValid = inputDate >= today;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve ser hoje ou uma data futura` : undefined
  };
};

/**
 * Valida se data está dentro de um intervalo
 */
export const validateDateRange = (
  date: string | Date, 
  minDate: string | Date, 
  maxDate: string | Date,
  fieldName: string = 'Data'
): ValidationResult => {
  if (!date) return { isValid: true };
  
  const inputDate = new Date(date);
  const min = new Date(minDate);
  const max = new Date(maxDate);
  
  const isValid = inputDate >= min && inputDate <= max;
  
  return {
    isValid,
    message: !isValid ? `${fieldName} deve estar entre ${min.toLocaleDateString('pt-BR')} e ${max.toLocaleDateString('pt-BR')}` : undefined
  };
};

// ============================================
// VALIDAÇÃO DE FORMULÁRIO COMPLETO
// ============================================

/**
 * Valida múltiplos campos
 */
export const validateFields = (
  data: Record<string, any>, 
  validations: Record<string, FieldValidation>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const [fieldName, validation] of Object.entries(validations)) {
    const value = data[fieldName];
    
    // Validação de obrigatório
    if (validation.required) {
      const result = validateRequired(value, fieldName);
      if (!result.isValid) {
        errors[fieldName] = result.message!;
        continue;
      }
    }
    
    // Se campo não é obrigatório e está vazio, pula outras validações
    if (!validation.required && (!value || value === '')) {
      continue;
    }
    
    // Validação de comprimento mínimo
    if (validation.minLength && typeof value === 'string') {
      const result = validateMinLength(value, validation.minLength, fieldName);
      if (!result.isValid) {
        errors[fieldName] = result.message!;
        continue;
      }
    }
    
    // Validação de comprimento máximo
    if (validation.maxLength && typeof value === 'string') {
      const result = validateMaxLength(value, validation.maxLength, fieldName);
      if (!result.isValid) {
        errors[fieldName] = result.message!;
        continue;
      }
    }
    
    // Validação de padrão
    if (validation.pattern && typeof value === 'string') {
      const result = validatePattern(value, validation.pattern, `${fieldName} tem formato inválido`);
      if (!result.isValid) {
        errors[fieldName] = result.message!;
        continue;
      }
    }
    
    // Validação customizada
    if (validation.customValidator) {
      const result = validation.customValidator(value);
      if (!result.isValid) {
        errors[fieldName] = result.message!;
        continue;
      }
    }
  }
  
  return errors;
};

// ============================================
// EXPORTAÇÕES CONVENIENTES
// ============================================

export const validationUtils = {
  // Básicas
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  
  // Email
  validateEmail,
  validateEmailDomain,
  
  // Telefone
  validatePhone,
  validateCellPhone,
  
  // Documentos
  validateCPF,
  validateCNPJ,
  
  // Senha
  validatePassword,
  validatePasswordConfirmation,
  
  // Números
  validateMinValue,
  validateMaxValue,
  validatePositiveNumber,
  
  // Data
  validateFutureDate,
  validateDateRange,
  
  // Formulário
  validateFields
}; 
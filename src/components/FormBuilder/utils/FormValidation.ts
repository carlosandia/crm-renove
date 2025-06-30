// FASE 5.2: FormValidation - Utilitário centralizado de validações
// Extrai toda lógica de validação do PublicFormRenderer

import { FormField, ValidationRules } from '../../../types/Forms';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  fieldErrors: Record<string, string>;
  globalErrors: string[];
}

// Validações por tipo de campo
export const validateFieldValue = (field: FormField, value: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar se é obrigatório
  if (field.is_required && (!value || (typeof value === 'string' && !value.trim()))) {
    return {
      isValid: false,
      error: field.validation_rules?.required_message || `${field.field_label} é obrigatório`
    };
  }

  // Se não tem valor e não é obrigatório, é válido
  if (!value) {
    return { isValid: true };
  }

  // Validações específicas por tipo
  switch (field.field_type) {
    case 'email':
      return validateEmail(value, field.validation_rules);
    
    case 'phone':
      return validatePhone(value, field.validation_rules);
    
    case 'cpf':
      return validateCPF(value);
    
    case 'cnpj':
      return validateCNPJ(value);
    
    case 'url':
      return validateURL(value, field.validation_rules);
    
    case 'number':
    case 'currency':
      return validateNumber(value, field.validation_rules);
    
    case 'text':
    case 'textarea':
      return validateText(value, field.validation_rules);
    
    case 'date':
      return validateDate(value, field.validation_rules);
    
    case 'file':
      return validateFile(value, field.field_options);
    
    case 'rating':
      return validateRating(value, field.field_options);
    
    case 'range':
      return validateRange(value, field.field_options);
    
    default:
      return { isValid: true };
  }
};

// Validação de email
const validateEmail = (value: string, rules?: ValidationRules): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(value)) {
    return {
      isValid: false,
      error: rules?.custom_message || 'E-mail inválido'
    };
  }
  
  return { isValid: true };
};

// Validação de telefone
const validatePhone = (value: string, rules?: ValidationRules): ValidationResult => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length < 10 || numbers.length > 11) {
    return {
      isValid: false,
      error: rules?.custom_message || 'Telefone deve ter 10 ou 11 dígitos'
    };
  }
  
  return { isValid: true };
};

// Validação de CPF
const validateCPF = (value: string): ValidationResult => {
  const cpf = value.replace(/\D/g, '');
  
  if (cpf.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  // Validação do algoritmo do CPF
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  return { isValid: true };
};

// Validação de CNPJ
const validateCNPJ = (value: string): ValidationResult => {
  const cnpj = value.replace(/\D/g, '');
  
  if (cnpj.length !== 14) {
    return { isValid: false, error: 'CNPJ deve ter 14 dígitos' };
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return { isValid: false, error: 'CNPJ inválido' };
  }
  
  // Validação do algoritmo do CNPJ
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cnpj.charAt(12))) {
    return { isValid: false, error: 'CNPJ inválido' };
  }
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit2 !== parseInt(cnpj.charAt(13))) {
    return { isValid: false, error: 'CNPJ inválido' };
  }
  
  return { isValid: true };
};

// Validação de URL
const validateURL = (value: string, rules?: ValidationRules): ValidationResult => {
  try {
    new URL(value);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: rules?.custom_message || 'URL inválida'
    };
  }
};

// Validação de número
const validateNumber = (value: string, rules?: ValidationRules): ValidationResult => {
  const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: rules?.custom_message || 'Valor deve ser um número'
    };
  }
  
  return { isValid: true };
};

// Validação de texto
const validateText = (value: string, rules?: ValidationRules): ValidationResult => {
  if (rules?.min_length && value.length < rules.min_length) {
    return {
      isValid: false,
      error: rules.custom_message || `Mínimo de ${rules.min_length} caracteres`
    };
  }
  
  if (rules?.max_length && value.length > rules.max_length) {
    return {
      isValid: false,
      error: rules.custom_message || `Máximo de ${rules.max_length} caracteres`
    };
  }
  
  if (rules?.pattern) {
    const regex = new RegExp(rules.pattern);
    if (!regex.test(value)) {
      return {
        isValid: false,
        error: rules.custom_message || 'Formato inválido'
      };
    }
  }
  
  return { isValid: true };
};

// Validação de data
const validateDate = (value: string, rules?: ValidationRules): ValidationResult => {
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: rules?.custom_message || 'Data inválida'
    };
  }
  
  return { isValid: true };
};

// Validação de arquivo
const validateFile = (value: File | FileList, options: any): ValidationResult => {
  if (!value) return { isValid: true };
  
  const file = value instanceof FileList ? value[0] : value;
  
  // Verificar tipo
  if (options.accept) {
    const acceptedTypes = options.accept.split(',').map((t: string) => t.trim());
    const fileType = file.type;
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isAccepted = acceptedTypes.some((type: string) => 
      type === fileType || type === fileExtension || 
      (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))
    );
    
    if (!isAccepted) {
      return {
        isValid: false,
        error: `Tipo de arquivo não permitido. Aceitos: ${options.accept}`
      };
    }
  }
  
  // Verificar tamanho
  if (options.max_size) {
    const maxBytes = parseSize(options.max_size);
    if (file.size > maxBytes) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Máximo: ${options.max_size}`
      };
    }
  }
  
  return { isValid: true };
};

// Validação de rating
const validateRating = (value: number, options: any): ValidationResult => {
  const rating = parseInt(value.toString());
  const maxRating = options.max_rating || 5;
  
  if (rating < 1 || rating > maxRating) {
    return {
      isValid: false,
      error: `Avaliação deve estar entre 1 e ${maxRating}`
    };
  }
  
  return { isValid: true };
};

// Validação de range
const validateRange = (value: number, options: any): ValidationResult => {
  const numValue = parseFloat(value.toString());
  const min = options.min || 0;
  const max = options.max || 100;
  
  if (numValue < min || numValue > max) {
    return {
      isValid: false,
      error: `Valor deve estar entre ${min} e ${max}`
    };
  }
  
  return { isValid: true };
};

// Helper para converter tamanho de arquivo
const parseSize = (sizeStr: string): number => {
  const size = parseFloat(sizeStr);
  const unit = sizeStr.toLowerCase();
  
  if (unit.includes('kb')) return size * 1024;
  if (unit.includes('mb')) return size * 1024 * 1024;
  if (unit.includes('gb')) return size * 1024 * 1024 * 1024;
  
  return size; // bytes
};

// Validar formulário completo
export const validateForm = (fields: FormField[], formData: Record<string, any>): FormValidationResult => {
  const fieldErrors: Record<string, string> = {};
  const globalErrors: string[] = [];
  let isValid = true;

  // Validar cada campo
  fields.forEach(field => {
    const value = formData[field.field_name];
    const result = validateFieldValue(field, value);
    
    if (!result.isValid && result.error) {
      fieldErrors[field.field_name] = result.error;
      isValid = false;
    }
  });

  // Validações globais
  const requiredFields = fields.filter(f => f.is_required);
  const emptyRequired = requiredFields.filter(f => !formData[f.field_name]);
  
  if (emptyRequired.length > 0) {
    globalErrors.push(`${emptyRequired.length} campo(s) obrigatório(s) não preenchido(s)`);
    isValid = false;
  }

  return {
    isValid,
    fieldErrors,
    globalErrors
  };
};

// Aplicar máscara a valor
// ================================================================================
// FASE 3.7: Funções de defaults extraídas do ModernFormBuilder.tsx
// ================================================================================

export const getDefaultPlaceholder = (fieldType: string): string => {
  const placeholders: Record<string, string> = {
    text: 'Digite seu texto aqui...',
    email: 'seu@email.com',
    phone: '(11) 99999-9999',
    textarea: 'Digite sua mensagem...',
    number: '0',
    url: 'https://exemplo.com',
    currency: 'R$ 0,00',
    city: 'São Paulo',
    state: 'São Paulo',
    country: 'Brasil',
    captcha: 'Digite o código...'
  };
  return placeholders[fieldType] || '';
};

export const getDefaultOptions = (fieldType: string): any => {
  const options: Record<string, any> = {
    select: { options: ['Opção 1', 'Opção 2', 'Opção 3'] },
    radio: { options: ['Opção 1', 'Opção 2', 'Opção 3'] },
    checkbox: { options: ['Opção 1', 'Opção 2', 'Opção 3'] },
    rating: { max_rating: 5, style: 'stars' },
    range: { min: 0, max: 100, step: 1 },
    file: { accept: '*', max_size: '10MB', multiple: false },
    city: { 
      autocomplete: true,
      suggestions: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília', 'Fortaleza', 'Curitiba', 'Recife', 'Porto Alegre', 'Manaus']
    },
    state: { 
      options: ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins']
    },
    country: { 
      options: ['Brasil', 'Argentina', 'Chile', 'Uruguai', 'Paraguai', 'Bolívia', 'Peru', 'Equador', 'Colômbia', 'Venezuela', 'Estados Unidos', 'Canadá', 'México', 'Portugal', 'Espanha', 'França', 'Alemanha', 'Itália', 'Reino Unido']
    },
    captcha: {
      type: 'math', // math, text, image
      difficulty: 'easy' // easy, medium, hard
    },
    submit: { 
      button_text: 'Enviar Formulário',
      redirect_url: '',
      background_color: '#3b82f6',
      text_color: '#ffffff'
    },
    whatsapp: { 
      number: '',
      message: 'Olá! Gostaria de mais informações.',
      button_text: 'Enviar via WhatsApp',
      background_color: '#25d366',
      text_color: '#ffffff'
    }
  };
  return options[fieldType] || {};
};

// ================================================================================
// FUNÇÕES DE MÁSCARA
// ================================================================================

export const applyMask = (value: string, fieldType: string): string => {
  switch (fieldType) {
    case 'phone':
      return applyPhoneMask(value);
    case 'cpf':
      return applyCPFMask(value);
    case 'cnpj':
      return applyCNPJMask(value);
    case 'currency':
      return applyCurrencyMask(value);
    default:
      return value;
  }
};

// Máscaras específicas
const applyPhoneMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

const applyCPFMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const applyCNPJMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const applyCurrencyMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  const amount = parseFloat(numbers) / 100;
  return amount.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
}; 
import { useState, useCallback, useMemo } from 'react';

// ============================================
// TIPOS E INTERFACES BASE
// ============================================

export type ValidationRule<T = any> = {
  required?: boolean | string;
  min?: number | string;
  max?: number | string;
  pattern?: RegExp | string;
  email?: boolean | string;
  url?: boolean | string;
  custom?: (value: T) => string | boolean;
  minLength?: number | string;
  maxLength?: number | string;
  match?: keyof T | string;
  oneOf?: T[] | string;
  numeric?: boolean | string;
  positive?: boolean | string;
  phone?: boolean | string;
  cpf?: boolean | string;
  cnpj?: boolean | string;
};

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

export interface UseFormValidationReturn<T> {
  errors: ValidationErrors<T>;
  isValid: boolean;
  isSubmitting: boolean;
  hasErrors: boolean;
  
  // Validação
  validate: (data: T) => ValidationErrors<T>;
  validateField: (field: keyof T, value: T[keyof T], data?: T) => string | undefined;
  clearErrors: () => void;
  clearFieldError: (field: keyof T) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setErrors: (errors: ValidationErrors<T>) => void;
  
  // Estados
  setSubmitting: (submitting: boolean) => void;
  
  // Utilitários
  getFieldError: (field: keyof T) => string | undefined;
  hasFieldError: (field: keyof T) => boolean;
  getErrorsCount: () => number;
  
  // Validação automática
  handleFieldChange: (field: keyof T, value: T[keyof T], data?: T) => void;
  handleSubmit: (data: T, onSuccess?: (data: T) => void | Promise<void>) => Promise<void>;
}

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

const validateEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const validateUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const validatePhone = (value: string): boolean => {
  // Remove caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  // Aceita telefones de 10 ou 11 dígitos (com ou sem código de área)
  return numbers.length >= 10 && numbers.length <= 11;
};

const validateCPF = (value: string): boolean => {
  const cpf = value.replace(/\D/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  return remainder === parseInt(cpf.charAt(10));
};

const validateCNPJ = (value: string): boolean => {
  const cnpj = value.replace(/\D/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return result === parseInt(digits.charAt(1));
};

// ============================================
// HOOK PRINCIPAL DE VALIDAÇÃO
// ============================================

export function useFormValidation<T extends Record<string, any>>(
  schema: ValidationSchema<T>,
  options: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    stopOnFirstError?: boolean;
  } = {}
): UseFormValidationReturn<T> {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    stopOnFirstError = false
  } = options;

  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // VALIDAÇÃO DE CAMPO ÚNICO
  // ============================================

  const validateField = useCallback((
    field: keyof T, 
    value: T[keyof T], 
    data?: T
  ): string | undefined => {
    const rules = schema[field];
    if (!rules) return undefined;

    const fieldName = String(field);
    
    // Required
    if (rules.required) {
      const isEmpty = value === undefined || 
                     value === null || 
                     value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        const message = typeof rules.required === 'string' 
          ? rules.required 
          : `${fieldName} é obrigatório`;
        return message;
      }
    }

    // Se o valor está vazio e não é obrigatório, pular outras validações
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const stringValue = String(value);

    // Email
    if (rules.email && !validateEmail(stringValue)) {
      return typeof rules.email === 'string' 
        ? rules.email 
        : 'Email inválido';
    }

    // URL
    if (rules.url && !validateUrl(stringValue)) {
      return typeof rules.url === 'string' 
        ? rules.url 
        : 'URL inválida';
    }

    // Phone
    if (rules.phone && !validatePhone(stringValue)) {
      return typeof rules.phone === 'string' 
        ? rules.phone 
        : 'Telefone inválido';
    }

    // CPF
    if (rules.cpf && !validateCPF(stringValue)) {
      return typeof rules.cpf === 'string' 
        ? rules.cpf 
        : 'CPF inválido';
    }

    // CNPJ
    if (rules.cnpj && !validateCNPJ(stringValue)) {
      return typeof rules.cnpj === 'string' 
        ? rules.cnpj 
        : 'CNPJ inválido';
    }

    // Pattern
    if (rules.pattern) {
      const regex = typeof rules.pattern === 'string' 
        ? new RegExp(rules.pattern) 
        : rules.pattern;
      
      if (!regex.test(stringValue)) {
        return `${fieldName} não atende ao padrão exigido`;
      }
    }

    // Min Length
    if (rules.minLength !== undefined) {
      const minLength = typeof rules.minLength === 'string' 
        ? parseInt(rules.minLength) 
        : rules.minLength;
      
      if (stringValue.length < minLength) {
        const message = typeof rules.minLength === 'string' && rules.minLength.includes(' ')
          ? rules.minLength
          : `${fieldName} deve ter pelo menos ${minLength} caracteres`;
        return message;
      }
    }

    // Max Length
    if (rules.maxLength !== undefined) {
      const maxLength = typeof rules.maxLength === 'string' 
        ? parseInt(rules.maxLength) 
        : rules.maxLength;
      
      if (stringValue.length > maxLength) {
        const message = typeof rules.maxLength === 'string' && rules.maxLength.includes(' ')
          ? rules.maxLength
          : `${fieldName} deve ter no máximo ${maxLength} caracteres`;
        return message;
      }
    }

    // Numeric
    if (rules.numeric) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return typeof rules.numeric === 'string' 
          ? rules.numeric 
          : `${fieldName} deve ser um número`;
      }
    }

    // Positive
    if (rules.positive) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue <= 0) {
        return typeof rules.positive === 'string' 
          ? rules.positive 
          : `${fieldName} deve ser um número positivo`;
      }
    }

    // Min/Max (numérico)
    if (rules.min !== undefined || rules.max !== undefined) {
      const numValue = Number(value);
      
      if (!isNaN(numValue)) {
        if (rules.min !== undefined) {
          const minValue = typeof rules.min === 'string' 
            ? parseFloat(rules.min) 
            : rules.min;
          
          if (numValue < minValue) {
            return `${fieldName} deve ser maior ou igual a ${minValue}`;
          }
        }

        if (rules.max !== undefined) {
          const maxValue = typeof rules.max === 'string' 
            ? parseFloat(rules.max) 
            : rules.max;
          
          if (numValue > maxValue) {
            return `${fieldName} deve ser menor ou igual a ${maxValue}`;
          }
        }
      }
    }

    // Match (comparar com outro campo)
    if (rules.match && data) {
      const matchField = rules.match;
      const matchValue = data[matchField as keyof T];
      
      if (value !== matchValue) {
        return `${fieldName} deve ser igual a ${String(matchField)}`;
      }
    }

    // One Of (valores permitidos)
    if (rules.oneOf) {
      const allowedValues = Array.isArray(rules.oneOf) ? rules.oneOf : [];
      if (!allowedValues.includes(value)) {
        return typeof rules.oneOf === 'string' 
          ? rules.oneOf 
          : `${fieldName} deve ser um dos valores: ${allowedValues.join(', ')}`;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value);
      if (typeof customResult === 'string') {
        return customResult;
      }
      if (customResult === false) {
        return `${fieldName} é inválido`;
      }
    }

    return undefined;
  }, [schema]);

  // ============================================
  // VALIDAÇÃO COMPLETA
  // ============================================

  const validate = useCallback((data: T): ValidationErrors<T> => {
    const newErrors: ValidationErrors<T> = {};

    for (const field of Object.keys(schema)) {
      const fieldKey = field as keyof T;
      const error = validateField(fieldKey, data[fieldKey], data);
      
      if (error) {
        newErrors[fieldKey] = error;
        
        if (stopOnFirstError) {
          break;
        }
      }
    }

    return newErrors;
  }, [schema, validateField, stopOnFirstError]);

  // ============================================
  // MANIPULAÇÃO DE ERROS
  // ============================================

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFieldChange = useCallback((
    field: keyof T, 
    value: T[keyof T], 
    data?: T
  ) => {
    if (validateOnChange) {
      const error = validateField(field, value, data);
      if (error) {
        setFieldError(field, error);
      } else {
        clearFieldError(field);
      }
    } else {
      // Limpar erro existente se o valor mudou
      if (errors[field]) {
        clearFieldError(field);
      }
    }
  }, [validateOnChange, validateField, setFieldError, clearFieldError, errors]);

  const handleSubmit = useCallback(async (
    data: T, 
    onSuccess?: (data: T) => void | Promise<void>
  ) => {
    setIsSubmitting(true);
    
    try {
      console.log('🔍 [useFormValidation] Validando formulário...', Object.keys(schema));
      
      const validationErrors = validate(data);
      setErrors(validationErrors);

      const hasValidationErrors = Object.keys(validationErrors).length > 0;

      if (hasValidationErrors) {
        console.log('❌ [useFormValidation] Formulário inválido:', validationErrors);
        return;
      }

      console.log('✅ [useFormValidation] Formulário válido, executando onSuccess');
      
      if (onSuccess) {
        await onSuccess(data);
      }
    } catch (error) {
      console.error('❌ [useFormValidation] Erro ao processar formulário:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, schema]);

  // ============================================
  // ESTADOS COMPUTADOS
  // ============================================

  const isValid = useMemo(() => 
    Object.keys(errors).length === 0, 
    [errors]
  );

  const hasErrors = useMemo(() => 
    Object.keys(errors).length > 0, 
    [errors]
  );

  const getFieldError = useCallback((field: keyof T) => {
    return errors[field];
  }, [errors]);

  const hasFieldError = useCallback((field: keyof T) => {
    return Boolean(errors[field]);
  }, [errors]);

  const getErrorsCount = useCallback(() => {
    return Object.keys(errors).length;
  }, [errors]);

  // ============================================
  // RETURN INTERFACE
  // ============================================

  return {
    errors,
    isValid,
    isSubmitting,
    hasErrors,
    
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
    setErrors,
    
    setSubmitting: setIsSubmitting,
    
    getFieldError,
    hasFieldError,
    getErrorsCount,
    
    handleFieldChange,
    handleSubmit,
  };
}

// ============================================
// HOOKS ESPECIALIZADOS PARA ENTIDADES
// ============================================

// Validação para Leads
export interface LeadFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  estimated_value?: number;
  temperature?: 'cold' | 'warm' | 'hot';
  notes?: string;
}

export function useLeadValidation() {
  return useFormValidation<LeadFormData>({
    first_name: { 
      required: 'Nome é obrigatório',
      minLength: 2
    },
    last_name: { 
      required: 'Sobrenome é obrigatório',
      minLength: 2
    },
    email: { 
      required: 'Email é obrigatório',
      email: 'Email inválido'
    },
    phone: { 
      phone: 'Telefone inválido'
    },
    estimated_value: {
      positive: 'Valor deve ser positivo'
    }
  });
}

// Validação para Contatos
export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  city?: string;
  notes?: string;
}

export function useContactValidation() {
  return useFormValidation<ContactFormData>({
    first_name: { 
      required: 'Nome é obrigatório',
      minLength: 2
    },
    last_name: { 
      required: 'Sobrenome é obrigatório',
      minLength: 2
    },
    email: { 
      required: 'Email é obrigatório',
      email: 'Email inválido'
    },
    phone: { 
      phone: 'Telefone inválido'
    }
  });
}

// Validação para Empresas
export interface CompanyFormData {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  cnpj?: string;
  notes?: string;
}

export function useCompanyValidation() {
  return useFormValidation<CompanyFormData>({
    name: { 
      required: 'Nome da empresa é obrigatório',
      minLength: 2
    },
    email: { 
      email: 'Email inválido'
    },
    phone: { 
      phone: 'Telefone inválido'
    },
    website: {
      url: 'Website inválido'
    },
    cnpj: {
      cnpj: 'CNPJ inválido'
    }
  });
}

// Validação para Deals
export interface DealFormData {
  title: string;
  description?: string;
  value: number;
  currency?: string;
  expected_close_date?: string;
  probability?: number;
  notes?: string;
}

export function useDealValidation() {
  return useFormValidation<DealFormData>({
    title: { 
      required: 'Título é obrigatório',
      minLength: 3
    },
    value: {
      required: 'Valor é obrigatório',
      positive: 'Valor deve ser positivo'
    },
    probability: {
      min: 0,
      max: 100
    }
  });
} 
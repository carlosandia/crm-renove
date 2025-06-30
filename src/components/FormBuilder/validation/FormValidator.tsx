import React, { useCallback, useMemo } from 'react';
import { FormField } from '../../../types/Forms';
import { applyMask, validateFieldValue, getDefaultPlaceholder } from '../utils/FormValidation';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FormValidatorProps {
  fields: FormField[];
  values: Record<string, any>;
  onValidationChange?: (result: ValidationResult) => void;
}

export interface FormValidatorReturn {
  validateForm: () => ValidationResult;
  validateField: (field: FormField, value: any) => ValidationResult;
  isFormValid: boolean;
  fieldErrors: Record<string, string[]>;
  applyFieldMask: (value: string, fieldType: string) => string;
  getFieldPlaceholder: (fieldType: string) => string;
}

export const useFormValidator = (
  fields: FormField[],
  values: Record<string, any>,
  onValidationChange?: (result: ValidationResult) => void
): FormValidatorReturn => {

  const applyFieldMask = useCallback((value: string, fieldType: string): string => {
    return applyMask(value, fieldType);
  }, []);

  const getFieldPlaceholder = useCallback((fieldType: string): string => {
    return getDefaultPlaceholder(fieldType);
  }, []);

  const validateField = useCallback((field: FormField, value: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validação de campo obrigatório
    if (field.is_required && (!value || value.toString().trim() === '')) {
      errors.push(field.validation_rules.required_message || `${field.field_label} é obrigatório`);
    }

    // Se não há valor, não validar outras regras
    if (!value) {
      return { isValid: errors.length === 0, errors, warnings };
    }

    const stringValue = value.toString();

    // Validação de comprimento mínimo
    if (field.validation_rules.min_length && stringValue.length < field.validation_rules.min_length) {
      errors.push(`${field.field_label} deve ter pelo menos ${field.validation_rules.min_length} caracteres`);
    }

    // Validação de comprimento máximo
    if (field.validation_rules.max_length && stringValue.length > field.validation_rules.max_length) {
      errors.push(`${field.field_label} deve ter no máximo ${field.validation_rules.max_length} caracteres`);
    }

    // Validação de padrão (regex)
    if (field.validation_rules.pattern) {
      try {
        const regex = new RegExp(field.validation_rules.pattern);
        if (!regex.test(stringValue)) {
          errors.push(field.validation_rules.custom_message || `${field.field_label} não está em um formato válido`);
        }
      } catch (e) {
        warnings.push(`Padrão de validação inválido para ${field.field_label}`);
      }
    }

    // Validações específicas por tipo de campo
    switch (field.field_type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(stringValue)) {
          errors.push(`${field.field_label} deve ser um email válido`);
        }
        break;

      case 'phone':
        // Validação básica de telefone (aceita vários formatos)
        const phoneRegex = /^[\+]?[\d\s\(\)\-]{8,}$/;
        if (!phoneRegex.test(stringValue.replace(/\s/g, ''))) {
          errors.push(`${field.field_label} deve ser um telefone válido`);
        }
        break;

      case 'url':
        try {
          new URL(stringValue);
        } catch {
          errors.push(`${field.field_label} deve ser uma URL válida`);
        }
        break;

      case 'number':
        if (isNaN(Number(stringValue))) {
          errors.push(`${field.field_label} deve ser um número válido`);
        }
        break;

      case 'cpf':
        if (!validateCPF(stringValue)) {
          errors.push(`${field.field_label} deve ser um CPF válido`);
        }
        break;

      case 'cnpj':
        if (!validateCNPJ(stringValue)) {
          errors.push(`${field.field_label} deve ser um CNPJ válido`);
        }
        break;
    }

    // Usar função externa de validação se disponível
    try {
      const externalValidation = validateFieldValue(field, value);
      if (!externalValidation.isValid && externalValidation.error) {
        errors.push(externalValidation.error);
      }
      if (externalValidation.warnings) {
        warnings.push(...externalValidation.warnings);
      }
    } catch (e) {
      // Fallback silencioso se função externa falhar
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateForm = useCallback((): ValidationResult => {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const fieldErrors: Record<string, string[]> = {};

    fields.forEach(field => {
      const fieldValue = values[field.field_name] || '';
      const fieldValidation = validateField(field, fieldValue);
      
      if (fieldValidation.errors.length > 0) {
        fieldErrors[field.field_name] = fieldValidation.errors;
        allErrors.push(...fieldValidation.errors);
      }
      
      if (fieldValidation.warnings.length > 0) {
        allWarnings.push(...fieldValidation.warnings);
      }
    });

    const result: ValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };

    // Notificar mudança de validação
    onValidationChange?.(result);

    return result;
  }, [fields, values, validateField, onValidationChange]);

  // Computar erros por campo
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string[]> = {};
    fields.forEach(field => {
      const fieldValue = values[field.field_name] || '';
      const validation = validateField(field, fieldValue);
      if (validation.errors.length > 0) {
        errors[field.field_name] = validation.errors;
      }
    });
    return errors;
  }, [fields, values, validateField]);

  // Verificar se form é válido
  const isFormValid = useMemo(() => {
    return Object.keys(fieldErrors).length === 0;
  }, [fieldErrors]);

  return {
    validateForm,
    validateField,
    isFormValid,
    fieldErrors,
    applyFieldMask,
    getFieldPlaceholder
  };
};

// Função auxiliar para validar CPF
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // CPFs com todos dígitos iguais
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  return remainder === parseInt(cleanCPF.charAt(10));
};

// Função auxiliar para validar CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // CNPJs com todos dígitos iguais
  
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  
  return result === parseInt(digits.charAt(1));
};

export const FormValidator: React.FC<FormValidatorProps> = ({
  fields,
  values,
  onValidationChange
}) => {
  const validator = useFormValidator(fields, values, onValidationChange);

  return (
    <div className="form-validator">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Validação do Formulário
        </h3>
        <div className={`px-2 py-1 text-xs rounded-full ${
          validator.isFormValid 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {validator.isFormValid ? 'Válido' : 'Inválido'}
        </div>
      </div>

      {/* Resumo de validação */}
      <div className="space-y-3">
        {Object.entries(validator.fieldErrors).map(([fieldName, errors]) => {
          const field = fields.find(f => f.field_name === fieldName);
          if (!field) return null;

          return (
            <div key={fieldName} className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 text-sm">
                {field.field_label}
              </div>
              <div className="text-xs text-red-600 mt-1">
                {errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </div>
          );
        })}

        {validator.isFormValid && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 text-sm">
              ✅ Todos os campos estão válidos
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormValidator; 
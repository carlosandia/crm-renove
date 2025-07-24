import React from 'react';
import { FormField } from '../../../types/Forms';

interface FormValidatorProps {
  fields: FormField[];
  values: Record<string, any>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const FormValidator: React.FC<FormValidatorProps> = ({ fields, values }) => {
  return (
    <div className="text-sm text-gray-600">
      Validação de formulário ativa
    </div>
  );
};

export const useFormValidator = (
  fields: FormField[],
  values: Record<string, any>,
  onValidationChange?: (validation: ValidationResult) => void
) => {
  const validateForm = (): ValidationResult => {
    const errors: string[] = [];
    
    fields.forEach(field => {
      if (field.is_required && !values[field.field_name]) {
        errors.push(`Campo ${field.field_label} é obrigatório`);
      }
    });

    const result = {
      isValid: errors.length === 0,
      errors
    };

    if (onValidationChange) {
      onValidationChange(result);
    }

    return result;
  };

  return {
    validateForm,
    isFormValid: fields.length > 0
  };
};

export default FormValidator;
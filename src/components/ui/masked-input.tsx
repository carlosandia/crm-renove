// =====================================================================================
// COMPONENT: MaskedInput
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Componentes de input com máscaras brasileiras para React Hook Form
// Dependências: react-number-format, @radix-ui, react-hook-form
// =====================================================================================

import React, { forwardRef } from 'react';
import { PatternFormat, NumericFormat } from 'react-number-format';
import { Input } from './input';
import { cn } from '../../lib/utils';
import { 
  BRAZILIAN_MASKS, 
  CRM_FIELD_CONFIGS, 
  MASK_FORMATTERS,
  PhoneMaskProps,
  CurrencyMaskProps,
  TextLimitMaskProps
} from '../../utils/inputMasks';

// ✅ PHONE INPUT: Componente para telefone brasileiro
interface PhoneInputProps extends Omit<PhoneMaskProps, 'format' | 'mask' | 'allowEmptyFormatting'> {
  autoDetectType?: boolean; // Detectar automaticamente móvel vs fixo
  variant?: 'mobile' | 'landline' | 'auto';
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ autoDetectType = true, variant = 'auto', className, ...props }, ref) => {
    // Detectar tipo de telefone automaticamente
    const getMaskConfig = (value: string = '') => {
      if (variant === 'mobile') return BRAZILIAN_MASKS.PHONE_MOBILE;
      if (variant === 'landline') return BRAZILIAN_MASKS.PHONE_LANDLINE;
      
      // Auto-detecção baseada no valor atual
      return MASK_FORMATTERS.getPhoneFormat(value);
    };
    
    const maskConfig = getMaskConfig(props.value as string);
    
    return (
      <PatternFormat
        {...maskConfig}
        {...props}
        customInput={Input}
        className={cn("", className)}
        getInputRef={ref}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

// ✅ CURRENCY INPUT: Componente para valores monetários brasileiros
interface CurrencyInputProps extends Omit<CurrencyMaskProps, 'prefix' | 'thousandSeparator' | 'decimalSeparator'> {
  allowNegative?: boolean;
  className?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ allowNegative = false, className, ...props }, ref) => {
    return (
      <NumericFormat
        {...BRAZILIAN_MASKS.CURRENCY_BRL}
        allowNegative={allowNegative}
        {...props}
        customInput={Input}
        className={cn("", className)}
        getInputRef={ref}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

// ✅ TEXT INPUT WITH LIMIT: Componente para texto com limite de caracteres
interface TextLimitInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maxLength: number;
  showCounter?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const TextLimitInput = forwardRef<HTMLInputElement, TextLimitInputProps>(
  ({ maxLength, showCounter = true, value = '', onValueChange, className, ...props }, ref) => {
    const currentLength = value.length;
    const isOverLimit = currentLength > maxLength;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      // Permitir digitação mas avisar quando exceder limite
      if (onValueChange) {
        onValueChange(newValue);
      }
      
      // Chamar onChange original se existir
      if (props.onChange) {
        props.onChange(e);
      }
    };
    
    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            "",
            isOverLimit && "border-red-500 focus:border-red-500",
            className
          )}
        />
        
        {showCounter && (
          <div className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 text-xs",
            isOverLimit ? "text-red-500" : "text-gray-400"
          )}>
            {MASK_FORMATTERS.getCharacterCounter(currentLength, maxLength)}
          </div>
        )}
        
        {isOverLimit && (
          <p className="text-xs text-red-500 mt-1">
            Limite de {maxLength} caracteres excedido
          </p>
        )}
      </div>
    );
  }
);

TextLimitInput.displayName = "TextLimitInput";

// ✅ OPPORTUNITY NAME INPUT: Componente específico para nome da oportunidade
interface OpportunityNameInputProps extends Omit<TextLimitInputProps, 'maxLength' | 'showCounter'> {
  className?: string;
}

export const OpportunityNameInput = forwardRef<HTMLInputElement, OpportunityNameInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextLimitInput
        {...CRM_FIELD_CONFIGS.OPPORTUNITY_NAME}
        {...props}
        ref={ref}
        className={className}
      />
    );
  }
);

OpportunityNameInput.displayName = "OpportunityNameInput";

// ✅ EXPORT TYPES: Para usar em outros componentes
export type {
  PhoneInputProps,
  CurrencyInputProps, 
  TextLimitInputProps,
  OpportunityNameInputProps
};
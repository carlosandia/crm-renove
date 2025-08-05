// =====================================================================================
// UTILITÁRIO: Máscaras de Input Brasileiras
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Configurações de máscaras para campos de formulário brasileiros
// Biblioteca: react-number-format v5.4.0
// =====================================================================================

import { PatternFormat, NumericFormat } from 'react-number-format';
import { ComponentProps } from 'react';

// ✅ TIPOS: Definições TypeScript para as máscaras
export type PhoneMaskProps = ComponentProps<typeof PatternFormat>;
export type CurrencyMaskProps = ComponentProps<typeof NumericFormat>;
export type TextLimitMaskProps = {
  maxLength: number;
  showCounter?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
};

// ✅ CONFIGURAÇÕES: Máscaras padrão brasileiras
export const BRAZILIAN_MASKS = {
  // Telefone celular brasileiro: (11) 99999-9999
  PHONE_MOBILE: {
    format: "(##) #####-####",
    mask: "_",
    allowEmptyFormatting: true,
    placeholder: "(11) 99999-9999"
  },
  
  // Telefone fixo brasileiro: (11) 9999-9999
  PHONE_LANDLINE: {
    format: "(##) ####-####", 
    mask: "_",
    allowEmptyFormatting: true,
    placeholder: "(11) 9999-9999"
  },
  
  // Moeda brasileira: R$ 9.999,99
  CURRENCY_BRL: {
    prefix: "R$ ",
    thousandSeparator: ".",
    decimalSeparator: ",",
    decimalScale: 2,
    allowNegative: false,
    placeholder: "R$ 0,00"
  },
  
  // Número simples: 999.999
  NUMBER_WITH_SEPARATOR: {
    thousandSeparator: ".",
    allowNegative: false,
    decimalScale: 0
  }
} as const;

// ✅ VALIDAÇÕES: Funções de validação customizadas
export const MASK_VALIDATORS = {
  // Validar telefone brasileiro (8 ou 9 dígitos após DDD)
  isValidPhone: (value: string): boolean => {
    const cleanPhone = value.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  },
  
  // Validar valor monetário mínimo
  isValidCurrency: (value: number, minValue: number = 0): boolean => {
    return value >= minValue;
  },
  
  // Validar limite de caracteres
  isValidTextLength: (value: string, maxLength: number): boolean => {
    return value.length <= maxLength;
  }
};

// ✅ FORMATADORES: Funções auxiliares para formatação
export const MASK_FORMATTERS = {
  // Detectar tipo de telefone (móvel vs fixo) automaticamente
  getPhoneFormat: (value: string): typeof BRAZILIAN_MASKS.PHONE_MOBILE | typeof BRAZILIAN_MASKS.PHONE_LANDLINE => {
    const cleanPhone = value.replace(/\D/g, '');
    // Se tem 11 dígitos, é celular (9 no início)
    if (cleanPhone.length === 11) {
      return BRAZILIAN_MASKS.PHONE_MOBILE;
    }
    // Se tem 10 dígitos, é fixo
    return BRAZILIAN_MASKS.PHONE_LANDLINE;
  },
  
  // Formatar valor para exibição sem máscara
  getUnmaskedValue: (maskedValue: string, type: 'phone' | 'currency'): string => {
    switch (type) {
      case 'phone':
        return maskedValue.replace(/\D/g, '');
      case 'currency':
        return maskedValue.replace(/[R$\s.]/g, '').replace(',', '.');
      default:
        return maskedValue;
    }
  },
  
  // Gerar contador de caracteres
  getCharacterCounter: (currentLength: number, maxLength: number): string => {
    return `${currentLength}/${maxLength}`;
  }
};

// ✅ CONFIGURAÇÕES ESPECIAIS: Para casos específicos do CRM
export const CRM_FIELD_CONFIGS = {
  // Nome da oportunidade: 22 caracteres máximo
  OPPORTUNITY_NAME: {
    maxLength: 22,
    showCounter: true,
    placeholder: "Digite o nome da oportunidade..."
  },
  
  // Telefone principal
  PRIMARY_PHONE: {
    ...BRAZILIAN_MASKS.PHONE_MOBILE,
    placeholder: "Telefone principal"
  },
  
  // Valor da oportunidade
  OPPORTUNITY_VALUE: {
    ...BRAZILIAN_MASKS.CURRENCY_BRL,
    placeholder: "Valor da oportunidade"
  }
};

// ✅ TIPOS EXPORTADOS: Para usar em outros componentes
export type MaskType = 'phone' | 'currency' | 'text-limit';
export type BrazilianMaskConfig = typeof BRAZILIAN_MASKS;
export type CRMFieldConfig = typeof CRM_FIELD_CONFIGS;
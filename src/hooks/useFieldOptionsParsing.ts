import { useMemo } from 'react';
import type { CustomField } from '../types/Pipeline';

/**
 * ✅ HOOK REUTILIZÁVEL: Parsing consistente de field_options
 * 
 * Este hook garante que field_options sempre sejam arrays válidos,
 * independente de como vêm do banco de dados (string JSON ou array).
 * 
 * Baseado na documentação oficial Zod e padrões do CLAUDE.md
 */

export interface ProcessedCustomField extends Omit<CustomField, 'field_options'> {
  field_options?: string[];
}

export function useFieldOptionsParsing(customFields: CustomField[]): ProcessedCustomField[] {
  return useMemo(() => {
    return customFields.map(field => {
      // ✅ CAMPOS NÃO-SELECT: Retornar sem processar field_options
      if (field.field_type !== 'select') {
        return field as ProcessedCustomField;
      }

      // ✅ PROCESSAMENTO FIELD_OPTIONS: Garantir array válido
      let processedOptions: string[] = [];
      
      if (field.field_options) {
        if (typeof field.field_options === 'string') {
          try {
            // ✅ PARSING JSON: Converter string do banco para array
            const parsed = JSON.parse(field.field_options);
            if (Array.isArray(parsed)) {
              // ✅ VALIDAÇÃO: Garantir que todos elementos são strings
              processedOptions = parsed.filter(option => 
                typeof option === 'string' && option.trim() !== ''
              );
            }
          } catch (error) {
            console.error('❌ [useFieldOptionsParsing] Erro ao parsear field_options:', {
              fieldName: field.field_name,
              originalValue: field.field_options,
              error
            });
            processedOptions = [];
          }
        } else if (Array.isArray(field.field_options)) {
          // ✅ JÁ É ARRAY: Filtrar strings válidas apenas
          processedOptions = field.field_options.filter(option => 
            typeof option === 'string' && option.trim() !== ''
          );
        }
      }
      
      return {
        ...field,
        field_options: processedOptions
      } as ProcessedCustomField;
    });
  }, [customFields]);
}

/**
 * ✅ HELPER FUNCTION: Parser individual para um campo
 * Útil quando você precisa processar apenas um campo específico
 */
export function parseFieldOptions(field: CustomField): ProcessedCustomField {
  if (field.field_type !== 'select') {
    return field as ProcessedCustomField;
  }

  let processedOptions: string[] = [];
  
  if (field.field_options) {
    if (typeof field.field_options === 'string') {
      try {
        const parsed = JSON.parse(field.field_options);
        if (Array.isArray(parsed)) {
          processedOptions = parsed.filter(option => 
            typeof option === 'string' && option.trim() !== ''
          );
        }
      } catch (error) {
        console.error('❌ [parseFieldOptions] Erro ao parsear:', {
          fieldName: field.field_name,
          error
        });
        processedOptions = [];
      }
    } else if (Array.isArray(field.field_options)) {
      processedOptions = field.field_options.filter(option => 
        typeof option === 'string' && option.trim() !== ''
      );
    }
  }
  
  return {
    ...field,
    field_options: processedOptions
  } as ProcessedCustomField;
}

/**
 * ✅ VALIDATION HELPER: Verificar se field_options é válido
 * Útil para debugging e validação antes do salvamento
 */
export function validateFieldOptions(field_options: unknown): field_options is string[] {
  return Array.isArray(field_options) && 
         field_options.every(option => typeof option === 'string' && option.trim() !== '');
}